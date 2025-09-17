/**
 * Workflow Execution Engine
 *
 * Orchestrates the execution of workflows by processing triggers,
 * executing actions in proper sequence, and managing state.
 */

import { db } from "~/server/db";
import {
  type Prisma,
  type WorkflowExecutionStatus,
  type NodeExecutionStatus,
} from "@prisma/client";
import { EmailService } from "./services/email-service";
import { SmsService } from "./services/sms-service";
import { VariableResolver } from "./services/variable-resolver";
import { executionLogger } from "./services/execution-logger";
import {
  type WorkflowNode,
  type EmailActionConfig,
  type SmsActionConfig,
  type WorkflowNodeConfig,
  type WorkflowConnection,
  type PayloadWithOptionalFields,
} from "~/types/workflow-types";

export interface WorkflowTriggerEvent {
  module: string;
  entityType: string;
  eventType: string;
  organizationId: string;
  payload: Record<string, unknown>;
  userId?: string;
  triggeredAt?: Date;
}

export interface ExecutionResult {
  success: boolean;
  executionId: string;
  status: WorkflowExecutionStatus;
  nodeResults: NodeExecutionResult[];
  error?: string;
}

export interface NodeExecutionResult {
  nodeId: string;
  status: NodeExecutionStatus;
  output?: Record<string, unknown>;
  error?: string;
  duration?: number;
}

type LoadedWorkflow = NonNullable<
  Awaited<ReturnType<WorkflowExecutionEngine["loadWorkflow"]>>
>;

export class WorkflowExecutionEngine {
  private emailService = new EmailService();
  private smsService = new SmsService();
  private variableResolver = new VariableResolver();

  /**
   * Main entry point for workflow execution
   */
  async executeWorkflow(
    workflowId: string,
    triggerData: WorkflowTriggerEvent,
    triggerId?: string
  ): Promise<ExecutionResult> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    try {
      // Create workflow execution record
      const execution = await this.createExecutionRecord(
        workflowId,
        executionId,
        triggerData,
        triggerId
      );

      // Load workflow structure
      const workflow = await this.loadWorkflow(
        workflowId,
        triggerData.organizationId
      );

      if (!workflow) {
        await executionLogger.error(
          {
            workflowExecutionId: execution.id,
            source: "workflow-engine",
            category: "workflow-loading",
          },
          "Workflow not found or inactive",
          new Error("Workflow not found or inactive"),
          { workflowId, organizationId: triggerData.organizationId }
        );
        throw new Error("Workflow not found or inactive");
      }

      // Log execution started
      await executionLogger.logExecutionStarted(
        execution.id,
        workflow.name,
        triggerData.eventType,
        triggerData.organizationId
      );

      // Execute workflow nodes in proper order
      const nodeResults = await this.executeWorkflowNodes(
        execution.id,
        workflow,
        triggerData,
        triggerId
      );

      // Determine final status
      const hasFailures = nodeResults.some(r => r.status === "FAILED");
      const finalStatus: WorkflowExecutionStatus = hasFailures
        ? "FAILED"
        : "COMPLETED";
      const duration = Date.now() - startTime;

      // Update execution status
      await this.updateExecutionStatus(execution.id, finalStatus, nodeResults);

      // Update workflow analytics
      await this.updateWorkflowAnalytics(workflowId, finalStatus);

      // Log execution completed
      if (hasFailures) {
        await executionLogger.logExecutionFailed(
          execution.id,
          workflow.name,
          new Error("Workflow execution had node failures"),
          duration
        );
      } else {
        await executionLogger.logExecutionCompleted(
          execution.id,
          workflow.name,
          duration,
          nodeResults.length,
          nodeResults.filter(r => r.status === "COMPLETED").length,
          nodeResults.filter(r => r.status === "FAILED").length
        );
      }

      return {
        success: !hasFailures,
        executionId,
        status: finalStatus,
        nodeResults,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`Workflow execution failed for ${executionId}:`, error);

      // Log execution failed
      await executionLogger.fatal(
        {
          workflowExecutionId: executionId,
          source: "workflow-engine",
          category: "execution-error",
        },
        "Workflow execution failed with fatal error",
        error,
        { workflowId, executionId, duration }
      );

      // Update execution as failed
      await this.updateExecutionStatus(
        executionId,
        "FAILED",
        [],
        error instanceof Error ? error.message : "Unknown error"
      );

      return {
        success: false,
        executionId,
        status: "FAILED",
        nodeResults: [],
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Create execution record in database
   */
  private async createExecutionRecord(
    workflowId: string,
    executionId: string,
    triggerData: WorkflowTriggerEvent,
    triggerId?: string
  ) {
    return await db.workflowExecution.create({
      data: {
        workflowId,
        executionId,
        triggerId,
        status: "RUNNING",
        priority: "NORMAL",
        triggerData: triggerData as unknown as Prisma.InputJsonValue,
        triggerContext: {
          module: triggerData.module,
          entityType: triggerData.entityType,
          eventType: triggerData.eventType,
          triggeredBy: triggerData.userId,
        } as Prisma.InputJsonValue,
        startedAt: new Date(),
        progress: 0,
      },
    });
  }

  /**
   * Load workflow with nodes and connections
   */
  private async loadWorkflow(workflowId: string, organizationId: string) {
    return await db.workflow.findFirst({
      where: {
        id: workflowId,
        organizationId,
        status: "ACTIVE",
      },
      include: {
        nodes: {
          include: {
            emailAction: true,
            smsAction: true,
            sourceConnections: {
              orderBy: { executionOrder: "asc" },
            },
            targetConnections: {
              orderBy: { executionOrder: "asc" },
            },
          },
        },
        connections: {
          orderBy: { executionOrder: "asc" },
        },
        triggers: true,
      },
    });
  }

  /**
   * Execute workflow nodes in proper sequence
   */
  private async executeWorkflowNodes(
    workflowExecutionId: string,
    workflow: LoadedWorkflow,
    triggerData: WorkflowTriggerEvent,
    triggerId?: string
  ): Promise<NodeExecutionResult[]> {
    const results: NodeExecutionResult[] = [];
    const executedNodes = new Set<string>();

    // Determine starting nodes strictly from the matched trigger
    const startNodes: WorkflowNode[] = [];

    // Prefer the exact trigger that dispatched this execution
    if (triggerId) {
      const matchingTrigger = workflow.triggers?.find(
        t => t.isActive && t.id === triggerId
      );
      if (matchingTrigger?.nodeId) {
        const mappedNode = workflow.nodes.find(
          n =>
            n.id === matchingTrigger.nodeId ||
            n.nodeId === matchingTrigger.nodeId
        );
        if (mappedNode) {
          startNodes.push(mappedNode);
        }
      }
    }

    // Fallback: if no triggerId mapping found, try to match by event context
    if (startNodes.length === 0 && workflow.triggers?.length) {
      const matchingByContext = workflow.triggers.filter(t => {
        if (!t.isActive) return false;
        const moduleMatches =
          !t.module ||
          t.module.toLowerCase() === triggerData.module.toLowerCase();
        const entityMatches =
          !t.entityType ||
          (!!triggerData.entityType &&
            t.entityType.toLowerCase() ===
              triggerData.entityType.toLowerCase());
        const eventMatches =
          !t.eventType ||
          t.eventType.toLowerCase() === triggerData.eventType.toLowerCase();
        return moduleMatches && entityMatches && eventMatches;
      });

      for (const trig of matchingByContext) {
        if (!trig.nodeId) continue;
        const mappedNode = workflow.nodes.find(
          n => n.id === trig.nodeId || n.nodeId === trig.nodeId
        );
        if (mappedNode) startNodes.push(mappedNode);
      }
    }

    // If still no start nodes, do nothing (prevents executing unrelated triggers/actions)
    if (startNodes.length === 0) {
      return results;
    }

    // De-duplicate while preserving order
    const uniqueStartNodes = startNodes.filter(
      (node, idx, arr) => arr.findIndex(n => n.id === node.id) === idx
    );

    for (const startNode of uniqueStartNodes) {
      await this.executeNodeSequence(
        workflowExecutionId,
        startNode,
        workflow,
        triggerData,
        results,
        executedNodes
      );
    }

    return results;
  }

  /**
   * Execute a sequence of nodes following connections
   */
  private async executeNodeSequence(
    workflowExecutionId: string,
    currentNode: WorkflowNode,
    workflow: LoadedWorkflow,
    triggerData: WorkflowTriggerEvent,
    results: NodeExecutionResult[],
    executedNodes: Set<string>
  ): Promise<void> {
    if (executedNodes.has(currentNode.id)) {
      return; // Already executed
    }

    // Execute current node
    const nodeResult = await this.executeNode(
      workflowExecutionId,
      currentNode,
      triggerData
    );

    results.push(nodeResult);
    executedNodes.add(currentNode.id);

    // If node failed and not optional, stop execution
    if (nodeResult.status === "FAILED" && !currentNode.isOptional) {
      return;
    }

    // Find and execute connected nodes
    const connections = (currentNode.sourceConnections ?? []).filter(conn =>
      this.evaluateConnectionConditions(conn, nodeResult, triggerData)
    );

    for (const connection of connections) {
      const nextNode = workflow.nodes.find(
        n => n.id === connection.targetNodeId
      );
      if (nextNode && !executedNodes.has(nextNode.id)) {
        await this.executeNodeSequence(
          workflowExecutionId,
          nextNode,
          workflow,
          triggerData,
          results,
          executedNodes
        );
      }
    }
  }

  /**
   * Execute a single node
   */
  private async executeNode(
    workflowExecutionId: string,
    node: WorkflowNode,
    triggerData: WorkflowTriggerEvent
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();

    // Log node execution started
    await executionLogger.logNodeStarted(
      workflowExecutionId,
      node.id,
      node.type,
      node.name ?? `${node.type} Node`
    );

    try {
      // Create node execution record
      const nodeExecution = await db.nodeExecution.create({
        data: {
          workflowExecutionId,
          nodeId: node.id,
          executionOrder: node.executionOrder ?? 0,
          status: "RUNNING",
          startedAt: new Date(),
          input: triggerData as unknown as Prisma.InputJsonValue,
          maxRetries: node.retryLimit ?? 3,
        },
      });

      let output: Record<string, unknown> = {};
      let status: NodeExecutionStatus = "COMPLETED";

      // Execute based on node type
      switch (node.type) {
        case "EMAIL":
          if (node.emailAction) {
            output = await this.executeEmailAction(
              node.emailAction,
              triggerData
            );
            if (output.emailSent !== true) {
              throw new Error(
                typeof output.error === "string"
                  ? output.error
                  : "Email sending failed"
              );
            }
            await executionLogger.logActionExecution(
              workflowExecutionId,
              node.id,
              "EMAIL",
              {
                subject: node.emailAction.subject,
                recipientType: "trigger-based",
              },
              output
            );
          }
          break;

        case "SMS":
          if (node.smsAction) {
            output = await this.executeSmsAction(node.smsAction, triggerData);
            if (output.smsSent !== true) {
              throw new Error(
                typeof output.error === "string" ? output.error : "SMS failed"
              );
            }
            await executionLogger.logActionExecution(
              workflowExecutionId,
              node.id,
              "SMS",
              {
                messageLength: node.smsAction.message?.length ?? 0,
                recipientType: "trigger-based",
              },
              output
            );
          }
          break;

        case "ACTION":
          if (node.emailAction) {
            output = await this.executeEmailAction(
              node.emailAction,
              triggerData
            );
            if (output.emailSent !== true) {
              throw new Error(
                typeof output.error === "string"
                  ? output.error
                  : "Email sending failed"
              );
            }
            await executionLogger.logActionExecution(
              workflowExecutionId,
              node.id,
              "EMAIL",
              {
                subject: node.emailAction.subject,
                recipientType: "trigger-based",
              },
              output
            );
          } else if (node.smsAction) {
            output = await this.executeSmsAction(node.smsAction, triggerData);
            if (output.smsSent !== true) {
              throw new Error(
                typeof output.error === "string" ? output.error : "SMS failed"
              );
            }
            await executionLogger.logActionExecution(
              workflowExecutionId,
              node.id,
              "SMS",
              {
                messageLength: node.smsAction.message?.length ?? 0,
                recipientType: "trigger-based",
              },
              output
            );
          } else {
            status = "SKIPPED";
            output = {
              skipped: true,
              reason: "Action node has no configured sub-action (email/sms)",
            };
          }
          break;

        case "TRIGGER":
          // Trigger nodes just pass through
          output = { triggered: true };
          break;

        case "DELAY":
          if (node.config) {
            const cfg = (node.config as { delayMs?: number }) ?? {};
            await this.executeDelay(cfg);
          }
          output = { delayed: true };
          break;

        default:
          status = "SKIPPED";
          output = {
            skipped: true,
            reason: `Node type ${node.type as string} not implemented`,
          };
          await executionLogger.warn(
            {
              workflowExecutionId,
              nodeId: node.id,
              source: "node-executor",
              category: "unsupported-node",
            },
            `Node type ${node.type as string} not implemented`,
            { nodeType: node.type, nodeName: node.name }
          );
      }

      const duration = Date.now() - startTime;

      // Update node execution
      await db.nodeExecution.update({
        where: { id: nodeExecution.id },
        data: {
          status,
          completedAt: new Date(),
          duration,
          output: output as Prisma.InputJsonValue,
        },
      });

      // Log node execution completed
      await executionLogger.logNodeCompleted(
        workflowExecutionId,
        node.id,
        node.type,
        node.name ?? `Node ${node.type as string}`,
        duration,
        output
      );

      return {
        nodeId: node.id,
        status,
        output,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // Log node execution failed
      await executionLogger.logNodeFailed(
        workflowExecutionId,
        node.id,
        node.type,
        node.name ?? `Node ${node.type as string}`,
        error instanceof Error ? error : new Error(errorMessage),
        duration
      );

      // Update node execution as failed
      await db.nodeExecution.updateMany({
        where: {
          workflowExecutionId,
          nodeId: node.id,
          status: "RUNNING",
        },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          duration,
          error: errorMessage,
          errorDetails: {
            message: errorMessage,
            stack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString(),
          } as Prisma.InputJsonValue,
        },
      });

      return {
        nodeId: node.id,
        status: "FAILED",
        error: errorMessage,
        duration,
      };
    }
  }

  /**
   * Execute email action
   */
  private async executeEmailAction(
    emailAction: EmailActionConfig,
    triggerData: WorkflowTriggerEvent
  ): Promise<Record<string, unknown>> {
    // Resolve variables in email content
    const resolvedSubject = await this.variableResolver.resolveVariables(
      emailAction.subject,
      triggerData
    );

    const resolvedHtmlBody = await this.variableResolver.resolveVariables(
      emailAction.htmlBody ?? "",
      triggerData
    );

    // Determine recipient email from trigger data
    const recipientEmail = await this.extractRecipientEmail(triggerData);

    if (!recipientEmail) {
      throw new Error("No recipient email found in trigger data");
    }

    // Send email
    const result = await this.emailService.sendEmail({
      to: recipientEmail,
      subject: resolvedSubject,
      htmlBody: resolvedHtmlBody,
      fromName: emailAction.fromName ?? undefined,
      fromEmail: emailAction.fromEmail ?? undefined,
      replyTo: emailAction.replyTo ?? undefined,
    });

    if (!result.success) {
      return {
        emailSent: false,
        error: result.error ?? "Unknown email error",
        recipient: recipientEmail,
        subject: resolvedSubject,
      };
    }

    return {
      emailSent: true,
      messageId: result.messageId,
      recipient: recipientEmail,
      subject: resolvedSubject,
    };
  }

  /**
   * Execute SMS action
   */
  private async executeSmsAction(
    smsAction: SmsActionConfig,
    triggerData: WorkflowTriggerEvent
  ): Promise<Record<string, unknown>> {
    // Resolve variables in SMS content
    const resolvedMessage = await this.variableResolver.resolveVariables(
      smsAction.message,
      triggerData
    );
    // Ensure no HTML goes out in SMS
    const sanitizedMessage = this.stripHtmlAndNormalize(resolvedMessage);

    // Determine recipient phone from trigger data
    const recipientPhone = this.extractRecipientPhone(triggerData);

    if (!recipientPhone) {
      throw new Error("No recipient phone found in trigger data");
    }

    // Send SMS
    const result = await this.smsService.sendSms({
      to: recipientPhone,
      message: sanitizedMessage,
      fromNumber: smsAction.fromNumber ?? undefined,
    });

    if (result.skipped === true) {
      return {
        smsSent: false,
        skipped: true,
        reason: "SMS skipped due to missing Twilio configuration",
        recipient: recipientPhone,
        message: sanitizedMessage,
      };
    }

    if (!result.success) {
      return {
        smsSent: false,
        error: result.error ?? "Unknown SMS error",
        recipient: recipientPhone,
        message: sanitizedMessage,
      };
    }

    return {
      smsSent: true,
      messageSid: result.messageSid,
      recipient: recipientPhone,
      message: sanitizedMessage,
    };
  }

  /**
   * Strip HTML tags and normalize whitespace/entities for SMS safety
   */
  private stripHtmlAndNormalize(input: string): string {
    try {
      const withoutTags = input.replace(/<[^>]*>/g, " ");
      const decoded = withoutTags
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
      return decoded.replace(/\s+/g, " ").trim();
    } catch {
      return input;
    }
  }

  /**
   * Execute delay
   */
  private async executeDelay(
    config: WorkflowNodeConfig | null | undefined
  ): Promise<void> {
    const delayMs = config?.delayMs ?? 1000;
    return new Promise(resolve => setTimeout(resolve, delayMs));
  }

  /**
   * Evaluate connection conditions
   */
  private evaluateConnectionConditions(
    connection: WorkflowConnection,
    nodeResult: NodeExecutionResult,
    _triggerData: WorkflowTriggerEvent
  ): boolean {
    if (!connection.conditions) {
      return nodeResult.status === "COMPLETED";
    }

    const conditions = connection.conditions as
      | { onStatus?: NodeExecutionStatus }
      | undefined;

    if (conditions?.onStatus) {
      return nodeResult.status === conditions.onStatus;
    }

    return true;
  }

  /**
   * Extract recipient email from trigger data
   */
  private async extractRecipientEmail(
    triggerData: WorkflowTriggerEvent
  ): Promise<string | null> {
    const payload = triggerData.payload as PayloadWithOptionalFields;

    // Try common email field names
    const emailFields = [
      payload.email,
      payload.customerEmail,
      payload.employeeEmail,
      payload.user?.email,
      payload.customer?.email,
      payload.employee?.email,
    ];

    for (const email of emailFields) {
      if (typeof email === "string" && email.length > 0) {
        return email;
      }
    }

    // Module-specific fallbacks
    const moduleLower = triggerData.module.toLowerCase();
    const entityLower = triggerData.entityType.toLowerCase();

    // Projects: use creator/updater for project; assignee for task
    if (moduleLower === "projects") {
      // Task: prefer assigned user email
      const assignedToId = (triggerData.payload as { assignedToId?: string })
        .assignedToId;
      if (entityLower === "task" && typeof assignedToId === "string") {
        try {
          const assigned = await db.user.findUnique({
            where: { id: assignedToId },
            select: { email: true },
          });
          if (assigned?.email) return assigned.email;
        } catch {}
        try {
          const employee = await db.employee.findFirst({
            where: { id: assignedToId },
            select: { email: true },
          });
          if (employee?.email) return employee.email;
        } catch {}
      }

      // Project: prefer triggering user
      if (triggerData.userId) {
        try {
          const user = await db.user.findUnique({
            where: { id: triggerData.userId },
            select: { email: true },
          });
          if (user?.email) return user.email;
        } catch {}
      }

      // Fallback to createdById in payload if present
      const createdById = (triggerData.payload as { createdById?: string })
        .createdById;
      if (typeof createdById === "string") {
        try {
          const creator = await db.user.findUnique({
            where: { id: createdById },
            select: { email: true },
          });
          if (creator?.email) return creator.email;
        } catch {}
      }

      const updatedById = (triggerData.payload as { updatedById?: string })
        .updatedById;
      if (typeof updatedById === "string") {
        try {
          const updater = await db.user.findUnique({
            where: { id: updatedById },
            select: { email: true },
          });
          if (updater?.email) return updater.email;
        } catch {}
      }
    }

    // Finance: prefer triggering user (creator/updater), then createdById/updatedById, finally customerEmail
    if (moduleLower === "finance") {
      if (triggerData.userId) {
        try {
          const user = await db.user.findUnique({
            where: { id: triggerData.userId },
            select: { email: true },
          });
          if (user?.email) return user.email;
        } catch {}
      }

      const createdById = (triggerData.payload as { createdById?: string })
        .createdById;
      if (typeof createdById === "string") {
        try {
          const creator = await db.user.findUnique({
            where: { id: createdById },
            select: { email: true },
          });
          if (creator?.email) return creator.email;
        } catch {}
      }

      const updatedById = (triggerData.payload as { updatedById?: string })
        .updatedById;
      if (typeof updatedById === "string") {
        try {
          const updater = await db.user.findUnique({
            where: { id: updatedById },
            select: { email: true },
          });
          if (updater?.email) return updater.email;
        } catch {}
      }

      const customerEmail = (triggerData.payload as { customerEmail?: string })
        .customerEmail;
      if (typeof customerEmail === "string" && customerEmail.length > 0) {
        return customerEmail;
      }
    }

    return null;
  }

  /**
   * Extract recipient phone from trigger data
   */
  private extractRecipientPhone(
    triggerData: WorkflowTriggerEvent
  ): string | null {
    const payload = triggerData.payload as PayloadWithOptionalFields;

    // Try common phone field names
    const phoneFields = [
      payload.phone,
      payload.phoneNumber,
      payload.mobile,
      payload.customerPhone,
      payload.employeePhone,
      payload.user?.phone,
      payload.customer?.phone,
      payload.employee?.phone,
    ];

    for (const phone of phoneFields) {
      if (typeof phone === "string" && phone.length > 0) {
        return phone;
      }
    }

    return null;
  }

  /**
   * Update execution status
   */
  private async updateExecutionStatus(
    executionId: string,
    status: WorkflowExecutionStatus,
    nodeResults: NodeExecutionResult[],
    error?: string
  ): Promise<void> {
    const completedAt = new Date();
    const progress = status === "COMPLETED" ? 100 : 0;

    await db.workflowExecution.updateMany({
      where: { executionId },
      data: {
        status,
        completedAt,
        progress,
        result: {
          nodeCount: nodeResults.length,
          successfulNodes: nodeResults.filter(r => r.status === "COMPLETED")
            .length,
          failedNodes: nodeResults.filter(r => r.status === "FAILED").length,
          totalDuration: nodeResults.reduce(
            (sum, r) => sum + (r.duration ?? 0),
            0
          ),
        } as Prisma.InputJsonValue,
        ...(error && { error }),
      },
    });
  }

  /**
   * Update workflow analytics
   */
  private async updateWorkflowAnalytics(
    workflowId: string,
    status: WorkflowExecutionStatus
  ): Promise<void> {
    const updateData = {
      totalExecutions: { increment: 1 },
      lastExecutedAt: new Date(),
      ...(status === "COMPLETED" && {
        successfulExecutions: { increment: 1 },
      }),
      ...(status === "FAILED" && {
        failedExecutions: { increment: 1 },
      }),
    };

    await db.workflow.update({
      where: { id: workflowId },
      data: updateData,
    });
  }
}
