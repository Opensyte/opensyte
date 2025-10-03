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
  type ConditionNodeConfig,
  type ConditionConfig,
  type LoopNodeConfig,
  type ParallelNodeConfig,
  type DataTransformNodeConfig,
  type ApprovalNodeConfig,
  type CreateRecordNodeConfig,
  type UpdateRecordNodeConfig,
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
    const executionContext: Record<string, unknown> = {};

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
        executedNodes,
        executionContext
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
    executedNodes: Set<string>,
    executionContext: Record<string, unknown>
  ): Promise<void> {
    if (executedNodes.has(currentNode.id)) {
      return; // Already executed
    }

    // Execute current node
    const nodeResult = await this.executeNode(
      workflowExecutionId,
      currentNode,
      triggerData,
      workflow
    );

    results.push(nodeResult);
    executedNodes.add(currentNode.id);

    // Store node output in execution context for variable resolution
    if (nodeResult.output) {
      executionContext[currentNode.id] = nodeResult.output;

      // Store by node name if available
      if (currentNode.name) {
        executionContext[currentNode.name] = nodeResult.output;
      }

      // Store specific outputs with their variable names
      if (
        nodeResult.output.outputVariable &&
        typeof nodeResult.output.outputVariable === "string"
      ) {
        const varName = nodeResult.output.outputVariable;
        if (nodeResult.output.recordId) {
          executionContext[varName] = nodeResult.output.recordId;
        } else if (nodeResult.output.result) {
          executionContext[varName] = nodeResult.output.result;
        }
      }
    }

    // If node failed and not optional, stop execution
    if (nodeResult.status === "FAILED" && !currentNode.isOptional) {
      return;
    }

    // Handle conditional branching for CONDITION nodes
    if (currentNode.type === "CONDITION" && nodeResult.output) {
      const conditionResult = nodeResult.output.result as boolean;
      const branchNodeId = conditionResult
        ? (nodeResult.output.trueBranch as string | undefined)
        : (nodeResult.output.falseBranch as string | undefined);

      if (branchNodeId) {
        const branchNode = workflow.nodes.find(
          n => n.id === branchNodeId || n.nodeId === branchNodeId
        );
        if (branchNode && !executedNodes.has(branchNode.id)) {
          await this.executeNodeSequence(
            workflowExecutionId,
            branchNode,
            workflow,
            triggerData,
            results,
            executedNodes,
            executionContext
          );
        }
      }
      return; // Don't follow normal connections for CONDITION nodes
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
          executedNodes,
          executionContext
        );
      }
    }
  }

  /**
   * Execute a single node with timeout support
   */
  private async executeNode(
    workflowExecutionId: string,
    node: WorkflowNode,
    triggerData: WorkflowTriggerEvent,
    workflow?: LoadedWorkflow
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    const nodeConfig = node.config as { timeout?: number } | null;
    const timeout = nodeConfig?.timeout ? nodeConfig.timeout * 1000 : 300000; // Default 5 minutes

    // Wrap execution in timeout promise
    const executionPromise = this.executeNodeInternal(
      workflowExecutionId,
      node,
      triggerData,
      workflow
    );

    const timeoutPromise = new Promise<NodeExecutionResult>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Node execution timeout after ${timeout}ms`));
      }, timeout);
    });

    try {
      return await Promise.race([executionPromise, timeoutPromise]);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      await executionLogger.logNodeFailed(
        workflowExecutionId,
        node.id,
        node.type,
        node.name ?? `Node ${node.type as string}`,
        error instanceof Error ? error : new Error(errorMessage),
        duration
      );

      return {
        nodeId: node.id,
        status: "FAILED",
        error: errorMessage,
        duration,
      };
    }
  }

  /**
   * Internal node execution logic
   */
  private async executeNodeInternal(
    workflowExecutionId: string,
    node: WorkflowNode,
    triggerData: WorkflowTriggerEvent,
    workflow?: LoadedWorkflow
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

        case "CONDITION":
          output = await this.executeConditionNode(node, triggerData);
          await executionLogger.logActionExecution(
            workflowExecutionId,
            node.id,
            "CONDITION",
            { conditionCount: (output.conditions as unknown[])?.length ?? 0 },
            output
          );
          break;

        case "LOOP":
          if (!workflow) {
            output = {
              looped: false,
              reason: "Workflow context not available",
            };
          } else {
            output = await this.executeLoopNode(
              workflowExecutionId,
              node,
              triggerData,
              workflow
            );
          }
          await executionLogger.logActionExecution(
            workflowExecutionId,
            node.id,
            "LOOP",
            {
              iterations: output.iterations,
              itemsProcessed: output.itemsProcessed,
            },
            output
          );
          break;

        case "PARALLEL":
          output = await this.executeParallelNode(
            workflowExecutionId,
            node,
            triggerData,
            workflow
          );
          await executionLogger.logActionExecution(
            workflowExecutionId,
            node.id,
            "PARALLEL",
            {
              parallelNodes: output.parallelNodes,
              successCount: output.successCount,
              failureCount: output.failureCount,
            },
            output
          );
          break;

        case "DATA_TRANSFORM":
          output = await this.executeDataTransformNode(node, triggerData);
          await executionLogger.logActionExecution(
            workflowExecutionId,
            node.id,
            "DATA_TRANSFORM",
            {
              operation: output.operation,
              inputSize: output.inputSize,
              outputSize: output.outputSize,
            },
            output
          );
          break;

        case "APPROVAL":
          output = await this.executeApprovalNode(
            workflowExecutionId,
            node,
            triggerData
          );
          await executionLogger.logActionExecution(
            workflowExecutionId,
            node.id,
            "APPROVAL",
            {
              approvalId: output.approvalId,
              status: output.status,
              approverCount: output.approverCount,
            },
            output
          );
          break;

        case "CREATE_RECORD":
          output = await this.executeCreateRecordNode(node, triggerData);
          await executionLogger.logActionExecution(
            workflowExecutionId,
            node.id,
            "CREATE_RECORD",
            {
              model: output.model,
              recordId: output.recordId,
              success: output.created,
            },
            output
          );
          break;

        case "UPDATE_RECORD":
          output = await this.executeUpdateRecordNode(node, triggerData);
          await executionLogger.logActionExecution(
            workflowExecutionId,
            node.id,
            "UPDATE_RECORD",
            {
              model: output.model,
              recordId: output.recordId,
              success: output.updated,
            },
            output
          );
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
   * Execute condition node
   */
  private async executeConditionNode(
    node: WorkflowNode,
    triggerData: WorkflowTriggerEvent
  ): Promise<Record<string, unknown>> {
    const config = node.config as ConditionNodeConfig | null;

    if (!config?.conditions || config.conditions.length === 0) {
      return {
        evaluated: false,
        result: false,
        reason: "No conditions configured",
      };
    }

    const results: boolean[] = [];
    const evaluatedConditions: Array<{
      field: string;
      operator: string;
      value: unknown;
      actualValue: unknown;
      result: boolean;
    }> = [];

    // Evaluate each condition
    for (const condition of config.conditions) {
      const result = await this.evaluateCondition(condition, triggerData);
      results.push(result.result);
      evaluatedConditions.push({
        field: condition.field,
        operator: condition.operator,
        value: condition.value,
        actualValue: result.actualValue,
        result: result.result,
      });
    }

    // Apply logical operator (default to AND)
    const logicalOperator = config.logicalOperator ?? "AND";
    let finalResult: boolean;

    if (logicalOperator === "OR") {
      finalResult = results.some(r => r === true);
    } else {
      // AND
      finalResult = results.every(r => r === true);
    }

    return {
      evaluated: true,
      result: finalResult,
      logicalOperator,
      conditions: evaluatedConditions,
      trueBranch: config.trueBranch,
      falseBranch: config.falseBranch,
    };
  }

  /**
   * Evaluate a single condition
   */
  private async evaluateCondition(
    condition: ConditionConfig,
    triggerData: WorkflowTriggerEvent
  ): Promise<{ result: boolean; actualValue: unknown }> {
    // Resolve the field value from trigger data
    const actualValue = await this.resolveFieldValue(
      condition.field,
      triggerData
    );

    // Resolve the comparison value (may contain variables)
    const comparisonValue =
      typeof condition.value === "string"
        ? await this.variableResolver.resolveVariables(
            condition.value,
            triggerData
          )
        : condition.value;

    // Evaluate based on operator
    let result = false;

    switch (condition.operator) {
      case "equals":
        result = actualValue === comparisonValue;
        break;

      case "not_equals":
        result = actualValue !== comparisonValue;
        break;

      case "greater_than":
        if (
          typeof actualValue === "number" &&
          typeof comparisonValue === "number"
        ) {
          result = actualValue > comparisonValue;
        } else if (
          typeof actualValue === "string" &&
          typeof comparisonValue === "string"
        ) {
          result = actualValue > comparisonValue;
        }
        break;

      case "less_than":
        if (
          typeof actualValue === "number" &&
          typeof comparisonValue === "number"
        ) {
          result = actualValue < comparisonValue;
        } else if (
          typeof actualValue === "string" &&
          typeof comparisonValue === "string"
        ) {
          result = actualValue < comparisonValue;
        }
        break;

      case "greater_than_or_equal":
        if (
          typeof actualValue === "number" &&
          typeof comparisonValue === "number"
        ) {
          result = actualValue >= comparisonValue;
        } else if (
          typeof actualValue === "string" &&
          typeof comparisonValue === "string"
        ) {
          result = actualValue >= comparisonValue;
        }
        break;

      case "less_than_or_equal":
        if (
          typeof actualValue === "number" &&
          typeof comparisonValue === "number"
        ) {
          result = actualValue <= comparisonValue;
        } else if (
          typeof actualValue === "string" &&
          typeof comparisonValue === "string"
        ) {
          result = actualValue <= comparisonValue;
        }
        break;

      case "contains":
        if (
          typeof actualValue === "string" &&
          typeof comparisonValue === "string"
        ) {
          result = actualValue.includes(comparisonValue);
        } else if (Array.isArray(actualValue)) {
          result = actualValue.includes(comparisonValue);
        }
        break;

      case "not_contains":
        if (
          typeof actualValue === "string" &&
          typeof comparisonValue === "string"
        ) {
          result = !actualValue.includes(comparisonValue);
        } else if (Array.isArray(actualValue)) {
          result = !actualValue.includes(comparisonValue);
        }
        break;

      case "starts_with":
        if (
          typeof actualValue === "string" &&
          typeof comparisonValue === "string"
        ) {
          result = actualValue.startsWith(comparisonValue);
        }
        break;

      case "ends_with":
        if (
          typeof actualValue === "string" &&
          typeof comparisonValue === "string"
        ) {
          result = actualValue.endsWith(comparisonValue);
        }
        break;

      case "is_empty":
        result =
          actualValue === null ||
          actualValue === undefined ||
          actualValue === "" ||
          (Array.isArray(actualValue) && actualValue.length === 0);
        break;

      case "is_not_empty":
        result = !(
          actualValue === null ||
          actualValue === undefined ||
          actualValue === "" ||
          (Array.isArray(actualValue) && actualValue.length === 0)
        );
        break;

      default:
        throw new Error(`Unsupported operator: ${condition.operator}`);
    }

    return { result, actualValue };
  }

  /**
   * Resolve field value from trigger data or execution context
   */
  private async resolveFieldValue(
    field: string,
    triggerData: WorkflowTriggerEvent,
    executionContext?: Record<string, unknown>
  ): Promise<unknown> {
    // Check execution context first for node outputs
    if (executionContext && field in executionContext) {
      return executionContext[field];
    }

    // Support dot notation for nested fields (e.g., "payload.status", "context.previousNode.result")
    const parts = field.split(".");

    // Check if first part is "context" to access execution context
    if (parts[0] === "context" && executionContext) {
      let value: unknown = executionContext;
      for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        if (part && value && typeof value === "object" && part in value) {
          value = (value as Record<string, unknown>)[part];
        } else {
          return undefined;
        }
      }
      return value;
    }

    // Otherwise resolve from trigger data
    let value: unknown = triggerData;
    for (const part of parts) {
      if (value && typeof value === "object" && part in value) {
        value = (value as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Execute loop node
   */
  private async executeLoopNode(
    workflowExecutionId: string,
    node: WorkflowNode,
    triggerData: WorkflowTriggerEvent,
    workflow: LoadedWorkflow
  ): Promise<Record<string, unknown>> {
    const config = node.config as LoopNodeConfig | null;

    if (!config?.dataSource) {
      return {
        looped: false,
        reason: "No data source configured",
        iterations: 0,
      };
    }

    // Resolve the data source
    const dataSource = await this.resolveFieldValue(
      config.dataSource,
      triggerData
    );

    // Ensure data source is an array
    if (!Array.isArray(dataSource)) {
      return {
        looped: false,
        reason: "Data source is not an array",
        dataSource,
        iterations: 0,
      };
    }

    const maxIterations = config.maxIterations ?? dataSource.length;
    const itemsToProcess = dataSource.slice(0, maxIterations);
    const results: Array<Record<string, unknown>> = [];
    let iterationCount = 0;
    let breakEarly = false;

    // Execute loop body for each item
    for (const item of itemsToProcess) {
      iterationCount++;

      // Create loop context with current item
      const loopContext: WorkflowTriggerEvent = {
        ...triggerData,
        payload: {
          ...triggerData.payload,
          [config.itemVariable ?? "item"]: item,
          loopIndex: iterationCount - 1,
          loopCount: itemsToProcess.length,
        },
      };

      // Check break condition if configured
      if (config.breakCondition) {
        const breakResult = await this.evaluateCondition(
          config.breakCondition,
          loopContext
        );
        if (breakResult.result) {
          breakEarly = true;
          break;
        }
      }

      // Execute loop body nodes
      const loopBodyResult = await this.executeLoopBody(
        workflowExecutionId,
        node,
        workflow,
        loopContext
      );

      results.push({
        iteration: iterationCount,
        item,
        result: loopBodyResult,
      });
    }

    return {
      looped: true,
      iterations: iterationCount,
      itemsProcessed: itemsToProcess.length,
      breakEarly,
      results,
      dataSource: config.dataSource,
    };
  }

  /**
   * Execute loop body nodes
   */
  private async executeLoopBody(
    workflowExecutionId: string,
    loopNode: WorkflowNode,
    workflow: LoadedWorkflow,
    loopContext: WorkflowTriggerEvent
  ): Promise<Record<string, unknown>> {
    const config = loopNode.config as LoopNodeConfig | null;

    if (!config?.loopBodyNodeId) {
      return { executed: false, reason: "No loop body node configured" };
    }

    // Find the loop body node
    const bodyNode = workflow.nodes.find(
      n => n.id === config.loopBodyNodeId || n.nodeId === config.loopBodyNodeId
    );

    if (!bodyNode) {
      return { executed: false, reason: "Loop body node not found" };
    }

    // Execute the body node with loop context
    const bodyResult = await this.executeNode(
      workflowExecutionId,
      bodyNode,
      loopContext
    );

    return {
      executed: true,
      status: bodyResult.status,
      output: bodyResult.output,
    };
  }

  /**
   * Execute update record node
   */
  private async executeUpdateRecordNode(
    node: WorkflowNode,
    triggerData: WorkflowTriggerEvent
  ): Promise<Record<string, unknown>> {
    const config = node.config as UpdateRecordNodeConfig | null;

    if (!config?.model) {
      return {
        updated: false,
        reason: "No model specified",
      };
    }

    if (!config.recordId) {
      return {
        updated: false,
        reason: "No record ID specified",
        model: config.model,
      };
    }

    try {
      // Resolve record ID
      let recordId: string;
      if (
        typeof config.recordId === "string" &&
        config.recordId.startsWith("{{") &&
        config.recordId.endsWith("}}")
      ) {
        const fieldPath = config.recordId.slice(2, -2).trim();
        const resolved = await this.resolveFieldValue(fieldPath, triggerData);
        recordId = String(resolved);
      } else {
        recordId = String(config.recordId);
      }

      // Resolve field mappings
      const data: Record<string, unknown> = {};

      for (const [field, value] of Object.entries(config.fieldMappings ?? {})) {
        // Resolve variables in the value
        if (
          typeof value === "string" &&
          value.startsWith("{{") &&
          value.endsWith("}}")
        ) {
          const fieldPath = value.slice(2, -2).trim();
          data[field] = await this.resolveFieldValue(fieldPath, triggerData);
        } else if (typeof value === "string") {
          // Resolve template variables
          data[field] = await this.variableResolver.resolveVariables(
            value,
            triggerData
          );
        } else {
          data[field] = value;
        }
      }

      // Apply conditional updates if specified
      let shouldUpdate = true;
      if (config.conditions) {
        for (const condition of config.conditions) {
          const conditionResult = await this.evaluateCondition(
            condition,
            triggerData
          );
          if (!conditionResult.result) {
            shouldUpdate = false;
            break;
          }
        }
      }

      if (!shouldUpdate) {
        return {
          updated: false,
          reason: "Conditions not met",
          model: config.model,
          recordId,
        };
      }

      // Update the record based on model type
      let updatedRecord: { id: string } | null = null;

      switch (config.model.toLowerCase()) {
        case "customer":
          updatedRecord = await db.customer.update({
            where: { id: recordId },
            data: data as any,
          });
          break;

        case "project":
          updatedRecord = await db.project.update({
            where: { id: recordId },
            data: data as any,
          });
          break;

        case "task":
          updatedRecord = await db.task.update({
            where: { id: recordId },
            data: data as any,
          });
          break;

        case "invoice":
          updatedRecord = await db.invoice.update({
            where: { id: recordId },
            data: data as any,
          });
          break;

        case "employee":
          updatedRecord = await db.employee.update({
            where: { id: recordId },
            data: data as any,
          });
          break;

        case "deal":
          updatedRecord = await db.deal.update({
            where: { id: recordId },
            data: data as any,
          });
          break;

        default:
          return {
            updated: false,
            reason: `Unsupported model: ${config.model}`,
            model: config.model,
            recordId,
          };
      }

      if (!updatedRecord) {
        return {
          updated: false,
          reason: "Failed to update record",
          model: config.model,
          recordId,
        };
      }

      return {
        updated: true,
        model: config.model,
        recordId: updatedRecord.id,
        data,
      };
    } catch (error) {
      return {
        updated: false,
        model: config.model,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Execute create record node
   */
  private async executeCreateRecordNode(
    node: WorkflowNode,
    triggerData: WorkflowTriggerEvent
  ): Promise<Record<string, unknown>> {
    const config = node.config as CreateRecordNodeConfig | null;

    if (!config?.model) {
      return {
        created: false,
        reason: "No model specified",
      };
    }

    try {
      // Resolve field mappings
      const data: Record<string, unknown> = {};

      for (const [field, value] of Object.entries(config.fieldMappings ?? {})) {
        // Resolve variables in the value
        if (
          typeof value === "string" &&
          value.startsWith("{{") &&
          value.endsWith("}}")
        ) {
          const fieldPath = value.slice(2, -2).trim();
          data[field] = await this.resolveFieldValue(fieldPath, triggerData);
        } else if (typeof value === "string") {
          // Resolve template variables
          data[field] = await this.variableResolver.resolveVariables(
            value,
            triggerData
          );
        } else {
          data[field] = value;
        }
      }

      // Add organization ID if not specified
      if (!data.organizationId) {
        data.organizationId = triggerData.organizationId;
      }

      // Create the record based on model type
      let createdRecord: { id: string } | null = null;

      switch (config.model.toLowerCase()) {
        case "customer":
          createdRecord = await db.customer.create({
            data: data as any,
          });
          break;

        case "project":
          createdRecord = await db.project.create({
            data: data as any,
          });
          break;

        case "task":
          createdRecord = await db.task.create({
            data: data as any,
          });
          break;

        case "invoice":
          createdRecord = await db.invoice.create({
            data: data as any,
          });
          break;

        case "employee":
          createdRecord = await db.employee.create({
            data: data as any,
          });
          break;

        case "deal":
          createdRecord = await db.deal.create({
            data: data as unknown,
          });
          break;

        default:
          return {
            created: false,
            reason: `Unsupported model: ${config.model}`,
            model: config.model,
          };
      }

      if (!createdRecord) {
        return {
          created: false,
          reason: "Failed to create record",
          model: config.model,
        };
      }

      return {
        created: true,
        model: config.model,
        recordId: createdRecord.id,
        outputVariable: config.outputVariable,
        data,
      };
    } catch (error) {
      return {
        created: false,
        model: config.model,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Execute approval node
   */
  private async executeApprovalNode(
    workflowExecutionId: string,
    node: WorkflowNode,
    triggerData: WorkflowTriggerEvent
  ): Promise<Record<string, unknown>> {
    const config = node.config as ApprovalNodeConfig | null;

    if (!config?.approverIds || config.approverIds.length === 0) {
      return {
        approved: false,
        reason: "No approvers configured",
        status: "PENDING",
      };
    }

    // Create approval record
    const expiresAt = config.expirationHours
      ? new Date(Date.now() + config.expirationHours * 60 * 60 * 1000)
      : undefined;

    const approval = await db.workflowApproval.create({
      data: {
        workflowExecutionId,
        nodeId: node.id,
        status: "PENDING",
        approverIds: config.approverIds,
        expiresAt,
      },
    });

    // Send approval notifications
    if (config.notifyApprovers) {
      await this.sendApprovalNotifications(
        approval.id,
        config.approverIds,
        node,
        triggerData
      );
    }

    return {
      approved: false,
      status: "PENDING",
      approvalId: approval.id,
      approverCount: config.approverIds.length,
      expiresAt,
      message: "Workflow paused pending approval",
    };
  }

  /**
   * Send approval notifications to approvers
   */
  private async sendApprovalNotifications(
    approvalId: string,
    approverIds: string[],
    node: WorkflowNode,
    triggerData: WorkflowTriggerEvent
  ): Promise<void> {
    // Get approver emails
    const approvers = await db.user.findMany({
      where: {
        id: { in: approverIds },
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    // Send email to each approver
    for (const approver of approvers) {
      if (!approver.email) continue;

      const subject = `Approval Required: ${node.name ?? "Workflow Approval"}`;
      const htmlBody = `
        <h2>Approval Required</h2>
        <p>A workflow requires your approval to continue.</p>
        <p><strong>Workflow:</strong> ${node.name ?? "Unnamed Workflow"}</p>
        <p><strong>Approval ID:</strong> ${approvalId}</p>
        <p>Please review and approve or reject this workflow execution.</p>
      `;

      try {
        await this.emailService.sendEmail({
          to: approver.email,
          subject,
          htmlBody,
        });
      } catch (error) {
        console.error(
          `Failed to send approval notification to ${approver.email}:`,
          error
        );
      }
    }
  }

  /**
   * Resume workflow execution after approval
   */
  async resumeAfterApproval(
    approvalId: string,
    approved: boolean,
    approvedById: string,
    comments?: string
  ): Promise<void> {
    // Update approval record
    await db.workflowApproval.update({
      where: { id: approvalId },
      data: {
        status: approved ? "APPROVED" : "REJECTED",
        approvedById: approved ? approvedById : undefined,
        approvedAt: approved ? new Date() : undefined,
        rejectedById: !approved ? approvedById : undefined,
        rejectedAt: !approved ? new Date() : undefined,
        comments,
      },
    });

    // Get the workflow execution
    const approval = await db.workflowApproval.findUnique({
      where: { id: approvalId },
      include: {
        workflowExecution: {
          include: {
            workflow: {
              include: {
                nodes: {
                  include: {
                    sourceConnections: true,
                    targetConnections: true,
                    emailAction: true,
                    smsAction: true,
                  },
                },
                connections: true,
                triggers: true,
              },
            },
          },
        },
      },
    });

    if (!approval?.workflowExecution) {
      throw new Error("Approval or workflow execution not found");
    }

    // If rejected, mark execution as failed
    if (!approved) {
      await db.workflowExecution.update({
        where: { id: approval.workflowExecution.id },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          error: "Workflow rejected during approval",
        },
      });
      return;
    }

    // If approved, continue execution from the approval node
    const approvalNode = approval.workflowExecution.workflow.nodes.find(
      n => n.id === approval.nodeId
    );

    if (!approvalNode) {
      throw new Error("Approval node not found");
    }

    // Find next nodes to execute
    const nextConnections = approvalNode.sourceConnections ?? [];

    for (const connection of nextConnections) {
      const nextNode = approval.workflowExecution.workflow.nodes.find(
        n => n.id === connection.targetNodeId
      );

      if (nextNode) {
        // Execute the next node
        const triggerData = approval.workflowExecution
          .triggerData as unknown as WorkflowTriggerEvent;
        await this.executeNode(
          approval.workflowExecution.id,
          nextNode,
          triggerData,
          approval.workflowExecution.workflow
        );
      }
    }
  }

  /**
   * Execute data transform node
   */
  private async executeDataTransformNode(
    node: WorkflowNode,
    triggerData: WorkflowTriggerEvent
  ): Promise<Record<string, unknown>> {
    const config = node.config as DataTransformNodeConfig | null;

    if (!config?.operation) {
      return {
        transformed: false,
        reason: "No operation configured",
      };
    }

    // Resolve the source data
    const sourceData = config.source
      ? await this.resolveFieldValue(config.source, triggerData)
      : triggerData.payload;

    let result: unknown;
    let inputSize = 0;
    let outputSize = 0;

    try {
      switch (config.operation) {
        case "map":
          if (!Array.isArray(sourceData)) {
            throw new Error("Map operation requires an array");
          }
          inputSize = sourceData.length;
          result = sourceData.map((item, index) =>
            this.applyTransformation(item, config.transformation, index)
          );
          outputSize = (result as unknown[]).length;
          break;

        case "filter":
          if (!Array.isArray(sourceData)) {
            throw new Error("Filter operation requires an array");
          }
          inputSize = sourceData.length;
          result = sourceData.filter((item, index) =>
            this.evaluateTransformationCondition(
              item,
              config.transformation,
              index
            )
          );
          outputSize = (result as unknown[]).length;
          break;

        case "reduce":
          if (!Array.isArray(sourceData)) {
            throw new Error("Reduce operation requires an array");
          }
          inputSize = sourceData.length;
          result = this.applyReduceTransformation(
            sourceData,
            config.transformation,
            config.initialValue
          );
          outputSize = 1;
          break;

        case "query":
          if (!Array.isArray(sourceData)) {
            throw new Error("Query operation requires an array");
          }
          inputSize = sourceData.length;
          result = this.applyQueryTransformation(sourceData, config);
          outputSize = Array.isArray(result) ? result.length : 1;
          break;

        case "aggregate":
          if (!Array.isArray(sourceData)) {
            throw new Error("Aggregate operation requires an array");
          }
          inputSize = sourceData.length;
          result = this.applyAggregateTransformation(sourceData, config);
          outputSize = 1;
          break;

        case "extract":
          result = this.applyExtractTransformation(sourceData, config);
          inputSize = 1;
          outputSize = 1;
          break;

        default:
          throw new Error(`Unsupported operation: ${config.operation}`);
      }

      return {
        transformed: true,
        operation: config.operation,
        inputSize,
        outputSize,
        result,
        outputVariable: config.outputVariable,
      };
    } catch (error) {
      return {
        transformed: false,
        operation: config.operation,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Apply transformation to a single item
   */
  private applyTransformation(
    item: unknown,
    transformation: string | undefined,
    index: number
  ): unknown {
    if (!transformation) return item;

    // Simple template variable replacement
    // Supports {{field}}, {{index}}, etc.
    if (typeof transformation === "string") {
      let result = transformation;

      // Replace {{index}}
      result = result.replace(/\{\{index\}\}/g, String(index));

      // Replace {{field}} with item.field
      if (typeof item === "object" && item !== null) {
        result = result.replace(/\{\{(\w+)\}\}/g, (_, field) => {
          const value = (item as Record<string, unknown>)[field];
          return value !== undefined ? String(value) : "";
        });
      }

      return result;
    }

    return item;
  }

  /**
   * Evaluate transformation condition for filter
   */
  private evaluateTransformationCondition(
    item: unknown,
    transformation: string | undefined,
    _index: number
  ): boolean {
    if (!transformation) return true;

    // Simple condition evaluation
    // For now, just check if item matches the transformation pattern
    if (
      typeof item === "object" &&
      item !== null &&
      typeof transformation === "string"
    ) {
      // Parse simple conditions like "status === 'active'"
      const match = /(\w+)\s*(===|!==|>|<|>=|<=)\s*['"]?(\w+)['"]?/.exec(
        transformation
      );
      if (match) {
        const [, field, operator, value] = match;
        if (!field) return true;
        const itemValue = (item as Record<string, unknown>)[field];

        switch (operator) {
          case "===":
            return itemValue === value;
          case "!==":
            return itemValue !== value;
          case ">":
            return Number(itemValue) > Number(value);
          case "<":
            return Number(itemValue) < Number(value);
          case ">=":
            return Number(itemValue) >= Number(value);
          case "<=":
            return Number(itemValue) <= Number(value);
          default:
            return true;
        }
      }
    }

    return true;
  }

  /**
   * Apply reduce transformation
   */
  private applyReduceTransformation(
    data: unknown[],
    transformation: string | undefined,
    initialValue: unknown
  ): unknown {
    if (!transformation) return data;

    // Simple reduce operations
    if (transformation === "sum") {
      return data.reduce(
        (acc: number, item) => {
          const value = typeof item === "number" ? item : 0;
          return acc + value;
        },
        Number(initialValue ?? 0)
      );
    }

    if (transformation === "count") {
      return data.length;
    }

    if (transformation === "concat") {
      return data.reduce(
        (acc: string, item) => {
          return acc + String(item);
        },
        String(initialValue ?? "")
      );
    }

    return data;
  }

  /**
   * Apply query transformation
   */
  private applyQueryTransformation(
    data: unknown[],
    config: DataTransformNodeConfig
  ): unknown {
    let result = data;

    // Apply filters if specified
    if (config.queryFilters && typeof config.queryFilters === "object") {
      const filters = config.queryFilters;
      result = result.filter(item => {
        if (typeof item !== "object" || item === null) return false;

        return Object.entries(filters).every(([field, value]) => {
          return (item as Record<string, unknown>)[field] === value;
        });
      });
    }

    // Apply sorting if specified
    if (config.sortBy) {
      const sortBy = config.sortBy;
      result = [...result].sort((a, b) => {
        if (typeof a !== "object" || typeof b !== "object") return 0;

        const aValue = (a as Record<string, unknown>)[sortBy];
        const bValue = (b as Record<string, unknown>)[sortBy];

        // Type-safe comparison
        if (typeof aValue === "number" && typeof bValue === "number") {
          if (aValue < bValue) return config.sortOrder === "desc" ? 1 : -1;
          if (aValue > bValue) return config.sortOrder === "desc" ? -1 : 1;
        } else if (typeof aValue === "string" && typeof bValue === "string") {
          if (aValue < bValue) return config.sortOrder === "desc" ? 1 : -1;
          if (aValue > bValue) return config.sortOrder === "desc" ? -1 : 1;
        }
        return 0;
      });
    }

    // Apply limit if specified
    if (config.limit) {
      result = result.slice(0, config.limit);
    }

    return result;
  }

  /**
   * Apply aggregate transformation
   */
  private applyAggregateTransformation(
    data: unknown[],
    config: DataTransformNodeConfig
  ): Record<string, unknown> {
    const aggregation = config.aggregation ?? "count";
    const field = config.aggregateField;

    switch (aggregation) {
      case "count":
        return { count: data.length };

      case "sum":
        if (!field) return { sum: 0 };
        return {
          sum: data.reduce((acc: number, item) => {
            if (typeof item === "object" && item !== null) {
              const value = (item as Record<string, unknown>)[field];
              return acc + (typeof value === "number" ? value : 0);
            }
            return acc;
          }, 0),
        };

      case "avg":
        if (!field || data.length === 0) return { avg: 0 };
        const sum = data.reduce((acc: number, item) => {
          if (typeof item === "object" && item !== null) {
            const value = (item as Record<string, unknown>)[field];
            return acc + (typeof value === "number" ? value : 0);
          }
          return acc;
        }, 0);
        return { avg: sum / data.length };

      case "min":
        if (!field) return { min: null };
        const minValue = data.reduce(
          (min: number | null, item) => {
            if (typeof item === "object" && item !== null) {
              const value = (item as Record<string, unknown>)[field];
              if (typeof value === "number") {
                return min === null || value < min ? value : min;
              }
            }
            return min;
          },
          null as number | null
        );
        return { min: minValue };

      case "max":
        if (!field) return { max: null };
        const maxValue = data.reduce(
          (max: number | null, item) => {
            if (typeof item === "object" && item !== null) {
              const value = (item as Record<string, unknown>)[field];
              if (typeof value === "number") {
                return max === null || value > max ? value : max;
              }
            }
            return max;
          },
          null as number | null
        );
        return { max: maxValue };

      default:
        return { count: data.length };
    }
  }

  /**
   * Apply extract transformation
   */
  private applyExtractTransformation(
    data: unknown,
    config: DataTransformNodeConfig
  ): unknown {
    if (!config.extractFields) return data;

    if (typeof data !== "object" || data === null) {
      return data;
    }

    const result: Record<string, unknown> = {};

    for (const field of config.extractFields) {
      if (field in (data as Record<string, unknown>)) {
        result[field] = (data as Record<string, unknown>)[field];
      }
    }

    return result;
  }

  /**
   * Execute parallel node
   */
  private async executeParallelNode(
    workflowExecutionId: string,
    node: WorkflowNode,
    triggerData: WorkflowTriggerEvent,
    workflow?: LoadedWorkflow
  ): Promise<Record<string, unknown>> {
    const config = node.config as ParallelNodeConfig | null;

    if (!config?.parallelNodeIds || config.parallelNodeIds.length === 0) {
      return {
        parallel: false,
        reason: "No parallel nodes configured",
        parallelNodes: 0,
      };
    }

    if (!workflow) {
      return {
        parallel: false,
        reason: "Workflow context not available",
        parallelNodes: 0,
      };
    }

    // Find all parallel nodes
    const parallelNodes = config.parallelNodeIds
      .map(nodeId =>
        workflow.nodes.find(n => n.id === nodeId || n.nodeId === nodeId)
      )
      .filter(n => n !== undefined) as WorkflowNode[];

    if (parallelNodes.length === 0) {
      return {
        parallel: false,
        reason: "No parallel nodes found",
        parallelNodes: 0,
      };
    }

    // Execute all nodes in parallel
    const startTime = Date.now();
    const results = await Promise.allSettled(
      parallelNodes.map(parallelNode =>
        this.executeNode(
          workflowExecutionId,
          parallelNode,
          triggerData,
          workflow
        )
      )
    );

    const duration = Date.now() - startTime;

    // Process results
    const successfulResults: NodeExecutionResult[] = [];
    const failedResults: Array<{
      nodeId: string;
      error: string;
    }> = [];

    results.forEach((result, index) => {
      const parallelNode = parallelNodes[index];
      if (!parallelNode) return;

      if (result.status === "fulfilled") {
        successfulResults.push(result.value);
      } else {
        failedResults.push({
          nodeId: parallelNode.id,
          error:
            result.reason instanceof Error
              ? result.reason.message
              : String(result.reason),
        });
      }
    });

    // Determine if we should fail based on failure handling strategy
    const failureHandling = config.failureHandling ?? "fail_on_any";
    let shouldFail = false;

    if (failureHandling === "fail_on_any" && failedResults.length > 0) {
      shouldFail = true;
    } else if (
      failureHandling === "fail_on_all" &&
      failedResults.length === parallelNodes.length
    ) {
      shouldFail = true;
    }
    // "continue_on_failure" never fails

    return {
      parallel: true,
      parallelNodes: parallelNodes.length,
      successCount: successfulResults.length,
      failureCount: failedResults.length,
      duration,
      results: successfulResults,
      failures: failedResults,
      failed: shouldFail,
      failureHandling,
    };
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

  /**
   * Get workflow execution statistics
   */
  async getWorkflowStats(workflowId: string): Promise<{
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    successRate: number;
    averageDuration: number | null;
    lastExecutedAt: Date | null;
  }> {
    const workflow = await db.workflow.findUnique({
      where: { id: workflowId },
      select: {
        totalExecutions: true,
        successfulExecutions: true,
        failedExecutions: true,
        lastExecutedAt: true,
      },
    });

    if (!workflow) {
      throw new Error("Workflow not found");
    }

    // Calculate average duration from recent executions
    const recentExecutions = await db.workflowExecution.findMany({
      where: {
        workflowId,
        status: "COMPLETED",
        startedAt: { not: null },
        completedAt: { not: null },
      },
      select: {
        startedAt: true,
        completedAt: true,
      },
      orderBy: { startedAt: "desc" },
      take: 100,
    });

    let averageDuration: number | null = null;
    if (recentExecutions.length > 0) {
      const durations = recentExecutions
        .filter(e => e.startedAt && e.completedAt)
        .map(
          e =>
            new Date(e.completedAt!).getTime() -
            new Date(e.startedAt!).getTime()
        );

      if (durations.length > 0) {
        averageDuration =
          durations.reduce((sum, d) => sum + d, 0) / durations.length;
      }
    }

    const successRate =
      workflow.totalExecutions > 0
        ? (workflow.successfulExecutions / workflow.totalExecutions) * 100
        : 0;

    return {
      totalExecutions: workflow.totalExecutions,
      successfulExecutions: workflow.successfulExecutions,
      failedExecutions: workflow.failedExecutions,
      successRate: Math.round(successRate * 100) / 100,
      averageDuration,
      lastExecutedAt: workflow.lastExecutedAt,
    };
  }

  /**
   * Cancel a running workflow execution
   */
  async cancelExecution(executionId: string, reason?: string): Promise<void> {
    await db.workflowExecution.updateMany({
      where: {
        executionId,
        status: "RUNNING",
      },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        error: reason ?? "Execution cancelled by user",
      },
    });

    await executionLogger.warn(
      {
        workflowExecutionId: executionId,
        source: "workflow-engine",
        category: "execution-cancelled",
      },
      "Workflow execution cancelled",
      { reason }
    );
  }

  /**
   * Retry a failed workflow execution
   */
  async retryExecution(executionId: string): Promise<ExecutionResult> {
    const execution = await db.workflowExecution.findFirst({
      where: { executionId },
      include: {
        workflow: true,
      },
    });

    if (!execution) {
      throw new Error("Execution not found");
    }

    if (execution.status !== "FAILED") {
      throw new Error("Can only retry failed executions");
    }

    // Extract trigger data
    const triggerData =
      execution.triggerData as unknown as WorkflowTriggerEvent;

    // Execute workflow again
    return await this.executeWorkflow(
      execution.workflowId,
      triggerData,
      execution.triggerId ?? undefined
    );
  }
}
