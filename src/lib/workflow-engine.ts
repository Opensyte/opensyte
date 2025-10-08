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
  type WorkflowNodeType,
} from "@prisma/client";
import { EmailService } from "./services/email-service";
import { SmsService } from "./services/sms-service";
import { VariableResolver } from "./services/variable-resolver";
import { executionLogger } from "./services/execution-logger";
import { WorkflowScheduler } from "./services/workflow-scheduler";
import {
  type WorkflowNode,
  type EmailActionConfig,
  type SmsActionConfig,
  type WorkflowNodeConfig,
  type WorkflowConnection,
  type PayloadWithOptionalFields,
<<<<<<< Updated upstream
  type ConditionNodeConfig,
  type ConditionConfig,
  type LoopNodeConfig,
  type ParallelNodeConfig,
  type DataTransformNodeConfig,
  type ApprovalNodeConfig,
  type CreateRecordNodeConfig,
  type UpdateRecordNodeConfig,
=======
  type LoopNodeConfig,
  type QueryNodeConfig,
  type FilterNodeConfig,
  type QueryFilterConfig,
  type QueryOrderConfig,
  type ConditionNodeConfig,
  type ScheduleNodeConfig,
  type DelayNodeConfig,
  type LogicalOperator,
>>>>>>> Stashed changes
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

type WorkflowRuntimeState = {
  shared: Record<string, unknown>;
  nodeOutputs: Record<string, unknown>;
};

interface ExecuteNodeOutcome {
  result: NodeExecutionResult;
  nextSteps: NextExecutionStep[];
}

interface NextExecutionStep {
  connection: WorkflowConnection;
  triggerData: WorkflowTriggerEvent;
  runtimeContext: WorkflowRuntimeState;
}

interface ConditionEvaluationResult {
  matched: boolean;
  evaluations: Array<{
    condition: QueryFilterConfig;
    result: boolean;
    actual: unknown;
  }>;
}

interface LoopExecutionOutcome {
  output: Record<string, unknown>;
  nextSteps: NextExecutionStep[];
}

interface QueryExecutionOutcome {
  output: Record<string, unknown>;
}

interface FilterExecutionOutcome {
  output: Record<string, unknown>;
}

interface ScheduleExecutionOutcome {
  output: Record<string, unknown>;
}

type PrismaDelegateKey = keyof typeof db;

const LOOP_BODY_HANDLES = new Set(["loop", "body", "item"]);
const LOOP_EMPTY_HANDLES = new Set(["empty", "else", "fallback"]);
const CONDITION_TRUE_HANDLES = new Set(["true", "yes"]);
const CONDITION_FALSE_HANDLES = new Set(["false", "no"]);
const FALLBACK_HANDLES = new Set(["fallback", "default", "otherwise"]);

const QUERY_MODEL_MAP: Record<
  string,
  { delegate: PrismaDelegateKey; defaultWhere?: Record<string, unknown> }
> = {
  Lead: { delegate: "customer", defaultWhere: { type: "LEAD" } },
  Leads: { delegate: "customer", defaultWhere: { type: "LEAD" } },
  Customer: { delegate: "customer" },
  Customers: { delegate: "customer" },
  Project: { delegate: "project" },
  Projects: { delegate: "project" },
  Task: { delegate: "task" },
  Tasks: { delegate: "task" },
  Invoice: { delegate: "invoice" },
  Invoices: { delegate: "invoice" },
  Employee: { delegate: "employee" },
  Employees: { delegate: "employee" },
  Payroll: { delegate: "payroll" },
  Payrolls: { delegate: "payroll" },
  PTO: { delegate: "timeOff" },
  TimeOff: { delegate: "timeOff" },
};

export class WorkflowExecutionEngine {
  private emailService = new EmailService();
  private smsService = new SmsService();
  private variableResolver = new VariableResolver();
  private scheduler = new WorkflowScheduler();
  private static readonly MAX_NODE_EXECUTIONS = 50;

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
<<<<<<< Updated upstream
    const executedNodes = new Set<string>();
    const executionContext: Record<string, unknown> = {};
=======
    const executionCounts = new Map<string, number>();
    const runtimeContext: WorkflowRuntimeState = {
      shared: Object.create(null) as Record<string, unknown>,
      nodeOutputs: Object.create(null) as Record<string, unknown>,
    };
>>>>>>> Stashed changes

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
<<<<<<< Updated upstream
        executedNodes,
        executionContext
=======
        executionCounts,
        runtimeContext
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
    executedNodes: Set<string>,
    executionContext: Record<string, unknown>
=======
    executionCounts: Map<string, number>,
    runtimeContext: WorkflowRuntimeState
>>>>>>> Stashed changes
  ): Promise<void> {
    const executionCount = executionCounts.get(currentNode.id) ?? 0;
    if (executionCount >= WorkflowExecutionEngine.MAX_NODE_EXECUTIONS) {
      await executionLogger.warn(
        {
          workflowExecutionId,
          nodeId: currentNode.id,
          source: "node-executor",
          category: "execution-limit",
        },
        `Node ${currentNode.id} reached execution limit`,
        {
          nodeId: currentNode.id,
          type: currentNode.type,
          executionCount,
        }
      );
      return;
    }
    executionCounts.set(currentNode.id, executionCount + 1);

<<<<<<< Updated upstream
    // Execute current node
    const nodeResult = await this.executeNode(
      workflowExecutionId,
      currentNode,
      triggerData,
      workflow
=======
    const outgoingConnections = [...(currentNode.sourceConnections ?? [])].sort(
      (a, b) => (a.executionOrder ?? 0) - (b.executionOrder ?? 0)
>>>>>>> Stashed changes
    );

    const outcome = await this.executeNode(
      workflowExecutionId,
      workflow.id,
      currentNode,
      triggerData,
      runtimeContext,
      outgoingConnections
    );

<<<<<<< Updated upstream
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
=======
    results.push(outcome.result);

    if (outcome.result.status === "FAILED" && !currentNode.isOptional) {
      return;
    }

    for (const step of outcome.nextSteps) {
>>>>>>> Stashed changes
      const nextNode = workflow.nodes.find(
        n => n.id === step.connection.targetNodeId
      );
<<<<<<< Updated upstream
      if (nextNode && !executedNodes.has(nextNode.id)) {
        await this.executeNodeSequence(
          workflowExecutionId,
          nextNode,
          workflow,
          triggerData,
          results,
          executedNodes,
          executionContext
=======
      if (!nextNode) {
        await executionLogger.warn(
          {
            workflowExecutionId,
            nodeId: currentNode.id,
            source: "node-executor",
            category: "missing-node",
          },
          `Target node ${step.connection.targetNodeId} not found for connection`,
          {
            connectionId: step.connection.id,
            sourceNodeId: currentNode.id,
          }
>>>>>>> Stashed changes
        );
        continue;
      }

      await this.executeNodeSequence(
        workflowExecutionId,
        nextNode,
        workflow,
        step.triggerData,
        results,
        executionCounts,
        step.runtimeContext
      );
    }
  }

  /**
   * Execute a single node with timeout support
   */
  private async executeNode(
    workflowExecutionId: string,
    workflowId: string,
    node: WorkflowNode,
    triggerData: WorkflowTriggerEvent,
<<<<<<< Updated upstream
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
=======
    runtimeContext: WorkflowRuntimeState,
    connections: WorkflowConnection[]
  ): Promise<ExecuteNodeOutcome> {
>>>>>>> Stashed changes
    const startTime = Date.now();
    const normalizedType = this.normalizeNodeType(node);

    await executionLogger.logNodeStarted(
      workflowExecutionId,
      node.id,
      normalizedType,
      node.name ?? `${normalizedType} Node`
    );

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
    let nextSteps: NextExecutionStep[] = [];

    try {
      switch (normalizedType) {
        case "EMAIL":
          if (!node.emailAction) {
            status = "SKIPPED";
            output = {
              skipped: true,
              reason: "Email node missing configuration",
            };
            break;
          }
          output = await this.executeEmailAction(node.emailAction, triggerData);
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
          nextSteps = this.buildDefaultNextSteps(
            connections,
            triggerData,
            runtimeContext,
            { nodeId: node.id, status, output }
          );
          break;

        case "SMS":
          if (!node.smsAction) {
            status = "SKIPPED";
            output = {
              skipped: true,
              reason: "SMS node missing configuration",
            };
            break;
          }
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
          nextSteps = this.buildDefaultNextSteps(
            connections,
            triggerData,
            runtimeContext,
            { nodeId: node.id, status, output }
          );
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
              reason: "Generic action node has no implementation",
            };
          }
          nextSteps = this.buildDefaultNextSteps(
            connections,
            triggerData,
            runtimeContext,
            { nodeId: node.id, status, output }
          );
          break;

        case "TRIGGER":
          output = { triggered: true };
          nextSteps = this.buildDefaultNextSteps(
            connections,
            triggerData,
            runtimeContext,
            { nodeId: node.id, status, output }
          );
          break;

        case "DELAY": {
          const delayConfig = this.parseDelayConfig(node.config);
          await this.executeDelay(delayConfig);
          output = { delayed: true, delayMs: delayConfig.delayMs };
          nextSteps = this.buildDefaultNextSteps(
            connections,
            triggerData,
            runtimeContext,
            { nodeId: node.id, status, output }
          );
          break;
        }

<<<<<<< Updated upstream
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
=======
        case "CONDITION": {
          const conditionConfig = this.parseConditionConfig(node.config);
          const conditionResult = this.evaluateConditions(
            conditionConfig,
            triggerData,
            runtimeContext
          );
          output = {
            matched: conditionResult.matched,
            evaluations: conditionResult.evaluations,
          };
          const conditionNodeSnapshot: NodeExecutionResult = {
            nodeId: node.id,
            status,
            output,
          };
          nextSteps = this.buildConditionalNextSteps(
            connections,
            triggerData,
            runtimeContext,
            conditionNodeSnapshot,
            conditionResult.matched
          );
          break;
        }

        case "LOOP": {
          const loopConfig = this.parseLoopConfig(node.config);
          const loopOutcome = await this.executeLoopNode(
            workflowExecutionId,
            workflowId,
            node,
            triggerData,
            runtimeContext,
            connections,
            loopConfig
          );
          output = loopOutcome.output;
          nextSteps = loopOutcome.nextSteps;
          break;
        }

        case "QUERY": {
          const queryConfig = this.parseQueryConfig(node.config);
          const queryOutcome = await this.executeQueryNode(
            queryConfig,
            triggerData,
            runtimeContext
          );
          output = queryOutcome.output;
          nextSteps = this.buildDefaultNextSteps(
            connections,
            triggerData,
            runtimeContext,
            { nodeId: node.id, status, output }
          );
          break;
        }

        case "FILTER": {
          const filterConfig = this.parseFilterConfig(node.config);
          const filterOutcome = this.executeFilterNode(
            filterConfig,
            triggerData,
            runtimeContext
          );
          output = filterOutcome.output;
          nextSteps = this.buildDefaultNextSteps(
            connections,
            triggerData,
            runtimeContext,
            { nodeId: node.id, status, output }
          );
          break;
        }

        case "SCHEDULE": {
          const scheduleConfig = this.parseScheduleConfig(node.config);
          const scheduleOutcome = await this.executeScheduleNode(
            workflowId,
            node,
            scheduleConfig,
            runtimeContext,
            triggerData
          );
          output = scheduleOutcome.output;
          nextSteps = this.buildDefaultNextSteps(
            connections,
            triggerData,
            runtimeContext,
            { nodeId: node.id, status, output }
          );
          break;
        }

        default: {
>>>>>>> Stashed changes
          status = "SKIPPED";
          output = {
            skipped: true,
            reason: `Node type ${normalizedType} not implemented`,
          };
          await executionLogger.warn(
            {
              workflowExecutionId,
              nodeId: node.id,
              source: "node-executor",
              category: "unsupported-node",
            },
            `Node type ${normalizedType} not implemented`,
            { nodeType: normalizedType, nodeName: node.name }
          );
          nextSteps = [];
        }
      }

      const duration = Date.now() - startTime;

      runtimeContext.nodeOutputs[node.id] = output;
      const resultKey = this.extractResultKey(node.config);
      if (resultKey) {
        runtimeContext.shared[resultKey] = output;
      }

      await db.nodeExecution.update({
        where: { id: nodeExecution.id },
        data: {
          status,
          completedAt: new Date(),
          duration,
          output: output as Prisma.InputJsonValue,
        },
      });

      await executionLogger.logNodeCompleted(
        workflowExecutionId,
        node.id,
        normalizedType,
        node.name ?? `Node ${normalizedType}`,
        duration,
        output
      );

      const nodeResult: NodeExecutionResult = {
        nodeId: node.id,
        status,
        output,
        duration,
      };

      return {
        result: nodeResult,
        nextSteps,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      await executionLogger.logNodeFailed(
        workflowExecutionId,
        node.id,
        normalizedType,
        node.name ?? `Node ${normalizedType}`,
        error instanceof Error ? error : new Error(errorMessage),
        duration
      );

      await db.nodeExecution.update({
        where: { id: nodeExecution.id },
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

      const failedResult: NodeExecutionResult = {
        nodeId: node.id,
        status: "FAILED",
        error: errorMessage,
        duration,
      };

      return {
        result: failedResult,
        nextSteps: [],
      };
    }
  }

  private buildDefaultNextSteps(
    connections: WorkflowConnection[],
    triggerData: WorkflowTriggerEvent,
    runtimeContext: WorkflowRuntimeState,
    nodeResult: NodeExecutionResult
  ): NextExecutionStep[] {
    return connections
      .filter(connection =>
        this.evaluateConnectionConditions(connection, nodeResult, triggerData)
      )
      .map(connection => ({
        connection,
        triggerData,
        runtimeContext,
      }));
  }

  private buildConditionalNextSteps(
    connections: WorkflowConnection[],
    triggerData: WorkflowTriggerEvent,
    runtimeContext: WorkflowRuntimeState,
    nodeResult: NodeExecutionResult,
    conditionMatched: boolean
  ): NextExecutionStep[] {
    const trueConnections = connections.filter(connection =>
      CONDITION_TRUE_HANDLES.has(
        this.normalizeHandle(connection.sourceHandle ?? null)
      )
    );
    const falseConnections = connections.filter(connection =>
      CONDITION_FALSE_HANDLES.has(
        this.normalizeHandle(connection.sourceHandle ?? null)
      )
    );
    const fallbackConnections = connections.filter(connection => {
      const handle = this.normalizeHandle(connection.sourceHandle ?? null);
      return (
        !CONDITION_TRUE_HANDLES.has(handle) &&
        !CONDITION_FALSE_HANDLES.has(handle) &&
        FALLBACK_HANDLES.has(handle)
      );
    });

    const defaultConnections = connections.filter(connection => {
      const handle = this.normalizeHandle(connection.sourceHandle ?? null);
      return (
        !CONDITION_TRUE_HANDLES.has(handle) &&
        !CONDITION_FALSE_HANDLES.has(handle) &&
        !FALLBACK_HANDLES.has(handle)
      );
    });

    const chosenConnections = conditionMatched
      ? trueConnections.length > 0
        ? trueConnections
        : fallbackConnections.length > 0
          ? fallbackConnections
          : defaultConnections
      : falseConnections.length > 0
        ? falseConnections
        : fallbackConnections.length > 0
          ? fallbackConnections
          : defaultConnections;

    return this.buildDefaultNextSteps(
      chosenConnections,
      triggerData,
      runtimeContext,
      nodeResult
    );
  }

  private parseDelayConfig(config: unknown): DelayNodeConfig {
    const record = this.toRecord(config);
    const delayValue = record.delayMs;
    const parsedDelay =
      typeof delayValue === "number" &&
      Number.isFinite(delayValue) &&
      delayValue >= 0
        ? delayValue
        : undefined;
    const delayMs = parsedDelay ?? 1000;

    return {
      delayMs,
      resultKey:
        typeof record.resultKey === "string" &&
        record.resultKey.trim().length > 0
          ? record.resultKey
          : undefined,
    };
  }

  private parseConditionConfig(config: unknown): ConditionNodeConfig {
    const record = this.toRecord(config);
    const rawConditions = Array.isArray(record.conditions)
      ? record.conditions
      : [];
    const conditions: QueryFilterConfig[] = rawConditions
      .map(condition => this.toRecord(condition))
      .map(condition => {
        const field =
          typeof condition.field === "string" &&
          condition.field.trim().length > 0
            ? condition.field
            : "";
        const operatorValue =
          typeof condition.operator === "string"
            ? (condition.operator.toLowerCase() as QueryFilterConfig["operator"])
            : "equals";
        const operator: QueryFilterConfig["operator"] = (
          [
            "equals",
            "not_equals",
            "gt",
            "gte",
            "lt",
            "lte",
            "contains",
            "not_contains",
            "starts_with",
            "ends_with",
            "in",
            "not_in",
            "between",
            "is_empty",
            "is_not_empty",
          ] as QueryFilterConfig["operator"][]
        ).includes(operatorValue)
          ? operatorValue
          : "equals";

        const values = Array.isArray(condition.values)
          ? condition.values
          : undefined;

        return {
          field,
          operator,
          value: condition.value,
          valueTo: condition.valueTo,
          values,
          path:
            typeof condition.path === "string" &&
            condition.path.trim().length > 0
              ? condition.path
              : undefined,
          negate:
            typeof condition.negate === "boolean"
              ? condition.negate
              : undefined,
        } satisfies QueryFilterConfig;
      })
      .filter(condition => condition.field.length > 0);

    const logicalOperatorRaw =
      typeof record.logicalOperator === "string"
        ? record.logicalOperator.toUpperCase()
        : "AND";
    const logicalOperator: LogicalOperator =
      logicalOperatorRaw === "OR" ? "OR" : "AND";

    const resultKey =
      typeof record.resultKey === "string" && record.resultKey.trim().length > 0
        ? record.resultKey
        : undefined;

    return {
      conditions,
      logicalOperator,
      resultKey,
    };
  }

  private parseLoopConfig(config: unknown): LoopNodeConfig {
    const record = this.toRecord(config);
    const itemVariable =
      typeof record.itemVariable === "string" &&
      record.itemVariable.trim().length > 0
        ? record.itemVariable
        : "item";
    const indexVariable =
      typeof record.indexVariable === "string" &&
      record.indexVariable.trim().length > 0
        ? record.indexVariable
        : "index";
    const maxIterations =
      typeof record.maxIterations === "number" &&
      Number.isFinite(record.maxIterations)
        ? record.maxIterations
        : undefined;

    return {
      dataSource:
        typeof record.dataSource === "string" &&
        record.dataSource.trim().length > 0
          ? record.dataSource
          : undefined,
      sourceKey:
        typeof record.sourceKey === "string" &&
        record.sourceKey.trim().length > 0
          ? record.sourceKey
          : undefined,
      itemVariable,
      indexVariable,
      maxIterations,
      resultKey:
        typeof record.resultKey === "string" &&
        record.resultKey.trim().length > 0
          ? record.resultKey
          : undefined,
      emptyPathHandle:
        typeof record.emptyPathHandle === "string" &&
        record.emptyPathHandle.trim().length > 0
          ? record.emptyPathHandle
          : undefined,
    };
  }

  private parseQueryConfig(config: unknown): QueryNodeConfig {
    const record = this.toRecord(config);
    const rawOrder = Array.isArray(record.orderBy) ? record.orderBy : [];

    const orderBy = rawOrder
      .map(order => this.toRecord(order))
      .map(order => {
        const direction: "asc" | "desc" =
          typeof order.direction === "string" &&
          order.direction.toLowerCase() === "desc"
            ? "desc"
            : "asc";

        return {
          field:
            typeof order.field === "string" && order.field.trim().length > 0
              ? order.field
              : "",
          direction,
        };
      })
      .filter(order => order.field.length > 0);

    const filtersRaw = Array.isArray(record.filters) ? record.filters : [];
    const filters: QueryFilterConfig[] = filtersRaw
      .map(filter => this.toRecord(filter))
      .map(filter => ({
        field:
          typeof filter.field === "string" && filter.field.trim().length > 0
            ? filter.field
            : "",
        operator:
          typeof filter.operator === "string"
            ? (filter.operator.toLowerCase() as QueryFilterConfig["operator"])
            : "equals",
        value:
          typeof filter.value === "string" ? filter.value.trim() : filter.value,
        valueTo:
          typeof filter.valueTo === "string"
            ? filter.valueTo.trim()
            : filter.valueTo,
        values: Array.isArray(filter.values)
          ? (filter.values as unknown[]).map((item: unknown) =>
              typeof item === "string" ? item.trim() : item
            )
          : undefined,
        path:
          typeof filter.path === "string" && filter.path.trim().length > 0
            ? filter.path
            : undefined,
        negate: typeof filter.negate === "boolean" ? filter.negate : undefined,
      }))
      .filter(filter => filter.field.length > 0);

    return {
      model: typeof record.model === "string" ? record.model : "",
      filters,
      orderBy,
      limit:
        typeof record.limit === "number" && Number.isFinite(record.limit)
          ? record.limit
          : undefined,
      offset:
        typeof record.offset === "number" && Number.isFinite(record.offset)
          ? record.offset
          : undefined,
      select: Array.isArray(record.select)
        ? (record.select.filter(
            (field): field is string => typeof field === "string"
          ) ?? [])
        : undefined,
      include: Array.isArray(record.include)
        ? (record.include.filter(
            (field): field is string => typeof field === "string"
          ) ?? [])
        : undefined,
      resultKey:
        typeof record.resultKey === "string" &&
        record.resultKey.trim().length > 0
          ? record.resultKey
          : undefined,
      fallbackKey:
        typeof record.fallbackKey === "string" &&
        record.fallbackKey.trim().length > 0
          ? record.fallbackKey
          : undefined,
    };
  }

  private parseFilterConfig(config: unknown): FilterNodeConfig {
    const record = this.toRecord(config);
    const conditionsRaw = Array.isArray(record.conditions)
      ? record.conditions
      : [];
    const conditions: QueryFilterConfig[] = conditionsRaw
      .map(condition => this.toRecord(condition))
      .map(condition => ({
        field:
          typeof condition.field === "string" &&
          condition.field.trim().length > 0
            ? condition.field
            : "",
        operator:
          typeof condition.operator === "string"
            ? (condition.operator.toLowerCase() as QueryFilterConfig["operator"])
            : "equals",
        value:
          typeof condition.value === "string"
            ? condition.value.trim()
            : condition.value,
        valueTo:
          typeof condition.valueTo === "string"
            ? condition.valueTo.trim()
            : condition.valueTo,
        values: Array.isArray(condition.values)
          ? (condition.values as unknown[]).map((item: unknown) =>
              typeof item === "string" ? item.trim() : item
            )
          : undefined,
        path:
          typeof condition.path === "string" && condition.path.trim().length > 0
            ? condition.path
            : undefined,
        negate:
          typeof condition.negate === "boolean" ? condition.negate : undefined,
      }))
      .filter(condition => condition.field.length > 0);

    const logicalOperatorRaw =
      typeof record.logicalOperator === "string"
        ? record.logicalOperator.toUpperCase()
        : "AND";
    const logicalOperator: LogicalOperator =
      logicalOperatorRaw === "OR" ? "OR" : "AND";

    return {
      sourceKey:
        typeof record.sourceKey === "string" &&
        record.sourceKey.trim().length > 0
          ? record.sourceKey
          : "",
      conditions,
      logicalOperator,
      resultKey:
        typeof record.resultKey === "string" &&
        record.resultKey.trim().length > 0
          ? record.resultKey
          : undefined,
      fallbackKey:
        typeof record.fallbackKey === "string" &&
        record.fallbackKey.trim().length > 0
          ? record.fallbackKey
          : undefined,
    };
  }

  private parseScheduleConfig(config: unknown): ScheduleNodeConfig {
    const record = this.toRecord(config);
    return {
      cron:
        typeof record.cron === "string" && record.cron.trim().length > 0
          ? record.cron
          : undefined,
      frequency:
        typeof record.frequency === "string" &&
        record.frequency.trim().length > 0
          ? record.frequency
          : undefined,
      timezone:
        typeof record.timezone === "string" && record.timezone.trim().length > 0
          ? record.timezone
          : undefined,
      startAt:
        typeof record.startAt === "string" && record.startAt.trim().length > 0
          ? record.startAt
          : undefined,
      endAt:
        typeof record.endAt === "string" && record.endAt.trim().length > 0
          ? record.endAt
          : undefined,
      isActive:
        typeof record.isActive === "boolean" ? record.isActive : undefined,
      metadata: this.toRecord(record.metadata),
      resultKey:
        typeof record.resultKey === "string" &&
        record.resultKey.trim().length > 0
          ? record.resultKey
          : undefined,
    };
  }

  private evaluateConditions(
    conditionConfig: ConditionNodeConfig,
    triggerData: WorkflowTriggerEvent,
    runtimeContext: WorkflowRuntimeState,
    additionalSource?: Record<string, unknown>
  ): ConditionEvaluationResult {
    const conditions = conditionConfig.conditions ?? [];
    const evaluations = conditions.map(condition => {
      const path = condition.path ?? condition.field;
      const actual = this.resolveDataPath(
        path,
        triggerData,
        runtimeContext,
        additionalSource
      );
      const evaluation = this.evaluateSingleCondition(condition, actual);
      const result = condition.negate ? !evaluation : evaluation;
      return {
        condition,
        result,
        actual,
      };
    });

    const matched =
      conditionConfig.logicalOperator === "OR"
        ? evaluations.some(evaluation => evaluation.result)
        : evaluations.every(evaluation => evaluation.result);

    return {
      matched,
      evaluations,
    };
  }

  private async executeLoopNode(
    workflowExecutionId: string,
    workflowId: string,
    node: WorkflowNode,
    triggerData: WorkflowTriggerEvent,
    runtimeContext: WorkflowRuntimeState,
    connections: WorkflowConnection[],
    loopConfig: LoopNodeConfig
  ): Promise<LoopExecutionOutcome> {
    const collection = this.resolveCollection(
      loopConfig,
      triggerData,
      runtimeContext
    );
    const items = Array.isArray(collection) ? (collection as unknown[]) : [];

    if (loopConfig.resultKey) {
      runtimeContext.shared[loopConfig.resultKey] = items;
    }

    const totalItems = items.length;
    const maxIterations =
      loopConfig.maxIterations && loopConfig.maxIterations > 0
        ? Math.min(loopConfig.maxIterations, totalItems)
        : totalItems;

    const normalizedHandles = connections.map(connection => ({
      connection,
      handle: this.normalizeHandle(connection.sourceHandle ?? null),
    }));

    const bodyConnections = normalizedHandles
      .filter(({ handle }) => LOOP_BODY_HANDLES.has(handle))
      .map(({ connection }) => connection);
    const emptyConnections = normalizedHandles
      .filter(({ handle }) => LOOP_EMPTY_HANDLES.has(handle))
      .map(({ connection }) => connection);

    let afterConnections = normalizedHandles
      .filter(
        ({ handle }) =>
          !LOOP_BODY_HANDLES.has(handle) && !LOOP_EMPTY_HANDLES.has(handle)
      )
      .map(({ connection }) => connection);

    if (bodyConnections.length === 0 && connections.length > 0) {
      const [firstConnection, ...rest] = connections;
      if (firstConnection) {
        bodyConnections.push(firstConnection);
        afterConnections = rest;
      }
    }

    const iterationSteps: NextExecutionStep[] = [];

    for (let index = 0; index < maxIterations; index += 1) {
      const item = items[index];
      const iterationTrigger = this.createLoopIterationTrigger(
        triggerData,
        loopConfig,
        item,
        index,
        totalItems
      );

      for (const connection of bodyConnections) {
        iterationSteps.push({
          connection,
          triggerData: iterationTrigger,
          runtimeContext,
        });
      }
    }

    if (items.length === 0 && emptyConnections.length > 0) {
      const emptyResult: NodeExecutionResult = {
        nodeId: node.id,
        status: "COMPLETED",
        output: {
          itemsProcessed: 0,
          empty: true,
        },
      };

      const steps = this.buildDefaultNextSteps(
        emptyConnections,
        triggerData,
        runtimeContext,
        emptyResult
      );

      return {
        output: {
          itemsProcessed: 0,
          empty: true,
        },
        nextSteps: steps,
      };
    }

    const afterSteps = this.buildDefaultNextSteps(
      afterConnections,
      triggerData,
      runtimeContext,
      {
        nodeId: node.id,
        status: "COMPLETED",
        output: {
          itemsProcessed: maxIterations,
        },
      }
    );

    return {
      output: {
        itemsProcessed: maxIterations,
        totalItems,
        itemVariable: loopConfig.itemVariable ?? "item",
      },
      nextSteps: [...iterationSteps, ...afterSteps],
    };
  }

  private createLoopIterationTrigger(
    triggerData: WorkflowTriggerEvent,
    loopConfig: LoopNodeConfig,
    item: unknown,
    index: number,
    total: number
  ): WorkflowTriggerEvent {
    const itemVariable = loopConfig.itemVariable ?? "item";
    const indexVariable = loopConfig.indexVariable ?? "index";

    const payload = {
      ...(triggerData.payload ?? {}),
      [itemVariable]: item,
      [indexVariable]: index,
      loop: {
        item,
        index,
        total,
      },
    } as Record<string, unknown>;

    return {
      ...triggerData,
      payload,
    };
  }

  private resolveCollection(
    loopConfig: LoopNodeConfig,
    triggerData: WorkflowTriggerEvent,
    runtimeContext: WorkflowRuntimeState
  ): unknown {
    const keys: (string | undefined)[] = [
      loopConfig.sourceKey,
      loopConfig.dataSource,
      loopConfig.resultKey,
    ];

    for (const key of keys) {
      if (!key) continue;
      const resolved = this.resolveDataPath(key, triggerData, runtimeContext);
      if (Array.isArray(resolved)) {
        return resolved;
      }
      if (resolved !== undefined) {
        return resolved;
      }
    }

    return [];
  }

  private resolveCollectionFromKey(
    key: string,
    triggerData: WorkflowTriggerEvent,
    runtimeContext: WorkflowRuntimeState
  ): unknown {
    return this.resolveDataPath(key, triggerData, runtimeContext);
  }

  private resolveDataPath(
    rawPath: string,
    triggerData: WorkflowTriggerEvent,
    runtimeContext: WorkflowRuntimeState,
    additionalSource?: Record<string, unknown>
  ): unknown {
    const path = rawPath.trim();
    if (path.length === 0) {
      return undefined;
    }

    const lowerPath = path.toLowerCase();

    if (path.startsWith("$")) {
      if (lowerPath.startsWith("$trigger.")) {
        const subPath = path.slice("$trigger.".length);
        return this.getValueFromObject(triggerData, subPath);
      }
      if (lowerPath.startsWith("$payload.")) {
        const subPath = path.slice("$payload.".length);
        return this.getValueFromObject(triggerData.payload ?? {}, subPath);
      }
      if (lowerPath.startsWith("$context.")) {
        const subPath = path.slice("$context.".length);
        return this.getValueFromObject(runtimeContext.shared, subPath);
      }
      if (lowerPath.startsWith("$node.")) {
        const subPath = path.slice("$node.".length);
        return this.getValueFromObject(runtimeContext.nodeOutputs, subPath);
      }
      if (lowerPath.startsWith("$loop.")) {
        const subPath = path.slice("$loop.".length);
        if (additionalSource) {
          return this.getValueFromObject(additionalSource, subPath);
        }
        return this.getValueFromObject(
          triggerData.payload ?? {},
          `loop.${subPath}`
        );
      }
      // Unknown prefix; strip the leading symbol and attempt fallback lookup
      const fallbackPath = path.slice(1);
      return (
        this.getValueFromObject(runtimeContext.shared, fallbackPath) ??
        this.getValueFromObject(runtimeContext.nodeOutputs, fallbackPath) ??
        this.getValueFromObject(additionalSource ?? {}, fallbackPath) ??
        this.getValueFromObject(triggerData.payload ?? {}, fallbackPath)
      );
    }

    return (
      this.getValueFromObject(runtimeContext.shared, path) ??
      this.getValueFromObject(runtimeContext.nodeOutputs, path) ??
      this.getValueFromObject(additionalSource ?? {}, path) ??
      this.getValueFromObject(triggerData.payload ?? {}, path)
    );
  }

  private getValueFromObject(source: unknown, path: string): unknown {
    if (source === null || typeof source !== "object") {
      return undefined;
    }

    const segments = path
      .split(".")
      .map(segment => segment.trim())
      .filter(segment => segment.length > 0);

    let current: unknown = source;
    for (const segment of segments) {
      if (current === null || typeof current !== "object") {
        return undefined;
      }

      if (Array.isArray(current)) {
        const index = Number.parseInt(segment, 10);
        if (Number.isNaN(index) || index < 0 || index >= current.length) {
          return undefined;
        }
        current = current[index];
        continue;
      }

      const record = current as Record<string, unknown>;
      current = record[segment];
    }

    return current;
  }

  private evaluateSingleCondition(
    condition: QueryFilterConfig,
    actual: unknown
  ): boolean {
    switch (condition.operator) {
      case "equals":
        return actual === condition.value;
      case "not_equals":
        return actual !== condition.value;
      case "gt":
        return this.evaluateComparison(
          actual,
          condition.value,
          (a, b) => a > b
        );
      case "gte":
        return this.evaluateComparison(
          actual,
          condition.value,
          (a, b) => a >= b
        );
      case "lt":
        return this.evaluateComparison(
          actual,
          condition.value,
          (a, b) => a < b
        );
      case "lte":
        return this.evaluateComparison(
          actual,
          condition.value,
          (a, b) => a <= b
        );
      case "contains":
        return this.evaluateContains(actual, condition.value);
      case "not_contains":
        return !this.evaluateContains(actual, condition.value);
      case "starts_with":
        return this.evaluateStringComparison(actual, condition.value, (a, b) =>
          a.startsWith(b)
        );
      case "ends_with":
        return this.evaluateStringComparison(actual, condition.value, (a, b) =>
          a.endsWith(b)
        );
      case "in": {
        const values = Array.isArray(condition.values)
          ? condition.values
          : Array.isArray(condition.value)
            ? (condition.value as unknown[])
            : [];
        return values.some(value => value === actual);
      }
      case "not_in": {
        const values = Array.isArray(condition.values)
          ? condition.values
          : Array.isArray(condition.value)
            ? (condition.value as unknown[])
            : [];
        return !values.some(value => value === actual);
      }
      case "between": {
        const lower = condition.value;
        const upper = condition.valueTo;
        if (lower === undefined || upper === undefined) {
          return false;
        }
        return (
          this.evaluateComparison(actual, lower, (a, b) => a >= b) &&
          this.evaluateComparison(actual, upper, (a, b) => a <= b)
        );
      }
      case "is_empty":
        return actual === null || actual === undefined || actual === "";
      case "is_not_empty":
        return !(actual === null || actual === undefined || actual === "");
      default:
        return false;
    }
  }

  private evaluateComparison(
    actual: unknown,
    expected: unknown,
    comparator: (a: number, b: number) => boolean
  ): boolean {
    const actualNumber = this.coerceToNumber(actual);
    const expectedNumber = this.coerceToNumber(expected);
    if (actualNumber === null || expectedNumber === null) {
      return false;
    }
    return comparator(actualNumber, expectedNumber);
  }

  private evaluateContains(actual: unknown, expected: unknown): boolean {
    if (typeof actual === "string" && typeof expected === "string") {
      return actual.includes(expected);
    }
    if (Array.isArray(actual)) {
      return actual.some(item => item === expected);
    }
    return false;
  }

  private evaluateStringComparison(
    actual: unknown,
    expected: unknown,
    comparator: (a: string, b: string) => boolean
  ): boolean {
    if (typeof actual !== "string" || typeof expected !== "string") {
      return false;
    }
    return comparator(actual, expected);
  }

  private coerceToNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    if (value instanceof Date) {
      return value.getTime();
    }
    return null;
  }

  private async executeQueryNode(
    queryConfig: QueryNodeConfig,
    triggerData: WorkflowTriggerEvent,
    runtimeContext: WorkflowRuntimeState
  ): Promise<QueryExecutionOutcome> {
    if (!queryConfig.model) {
      throw new Error("Query node requires a model");
    }

    const delegateInfo = this.getQueryDelegate(queryConfig.model);
    if (!delegateInfo) {
      throw new Error(`Unsupported query model: ${queryConfig.model}`);
    }

    const where = this.buildQueryWhere(
      queryConfig.filters,
      triggerData,
      runtimeContext
    );

    if (delegateInfo.defaultWhere) {
      Object.entries(delegateInfo.defaultWhere).forEach(([key, value]) => {
        this.assignWhere(where, key, value);
      });
    }

    this.assignWhere(where, "organizationId", triggerData.organizationId);

    const orderBy = this.buildOrderBy(queryConfig.orderBy);

    const queryArgs: Record<string, unknown> = {
      where,
    };

    if (orderBy.length > 0) {
      queryArgs.orderBy = orderBy;
    }

    if (typeof queryConfig.limit === "number") {
      queryArgs.take = queryConfig.limit;
    }

    if (typeof queryConfig.offset === "number") {
      queryArgs.skip = queryConfig.offset;
    }

    const select = this.buildSelect(queryConfig.select);
    if (select) {
      queryArgs.select = select;
    }

    const include = this.buildSelect(queryConfig.include);
    if (include) {
      queryArgs.include = include;
    }

    const delegate = this.getPrismaDelegate(delegateInfo.delegate);
    const prismaDelegate = delegate as unknown as {
      findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
    };

    const records = await prismaDelegate.findMany(queryArgs);

    if (queryConfig.resultKey) {
      runtimeContext.shared[queryConfig.resultKey] = records;
    }

    return {
      output: {
        records,
        count: records.length,
      },
    };
  }

  private getQueryDelegate(model: string) {
    const direct =
      QUERY_MODEL_MAP[model] ?? QUERY_MODEL_MAP[model.toLowerCase()];
    if (direct) {
      return direct;
    }
    return QUERY_MODEL_MAP[model.charAt(0).toUpperCase() + model.slice(1)];
  }

  private buildQueryWhere(
    filters: QueryFilterConfig[] | undefined,
    triggerData: WorkflowTriggerEvent,
    runtimeContext: WorkflowRuntimeState
  ): Record<string, unknown> {
    const where: Record<string, unknown> = {};

    if (!filters || filters.length === 0) {
      return where;
    }

    for (const filter of filters) {
      if (!filter.field) continue;

      const resolvedValue = this.resolveFilterValue(
        filter.value,
        triggerData,
        runtimeContext
      );

      const values = Array.isArray(filter.values)
        ? filter.values.map(value =>
            this.resolveFilterValue(value, triggerData, runtimeContext)
          )
        : undefined;

      const whereCondition = this.createWhereCondition(
        filter,
        resolvedValue,
        values
      );
      this.assignWhere(where, filter.field, whereCondition);
    }

    return where;
  }

  private resolveFilterValue(
    value: unknown,
    triggerData: WorkflowTriggerEvent,
    runtimeContext: WorkflowRuntimeState
  ): unknown {
    if (typeof value === "string" && value.startsWith("$")) {
      return this.resolveDataPath(value, triggerData, runtimeContext);
    }
    return value;
  }

  private createWhereCondition(
    filter: QueryFilterConfig,
    value: unknown,
    values: unknown[] | undefined
  ): Record<string, unknown> {
    switch (filter.operator) {
      case "equals":
        return { equals: value };
      case "not_equals":
        return { not: value };
      case "gt":
        return { gt: value };
      case "gte":
        return { gte: value };
      case "lt":
        return { lt: value };
      case "lte":
        return { lte: value };
      case "contains":
        return { contains: value };
      case "not_contains":
        return { not: { contains: value } };
      case "starts_with":
        return { startsWith: value };
      case "ends_with":
        return { endsWith: value };
      case "in":
        return { in: values ?? (Array.isArray(value) ? value : [value]) };
      case "not_in":
        return { notIn: values ?? (Array.isArray(value) ? value : [value]) };
      case "between":
        return {
          gte: value,
          lte: filter.valueTo ?? value,
        };
      case "is_empty":
        return { equals: null };
      case "is_not_empty":
        return { not: null };
      default:
        return { equals: value };
    }
  }

  private assignWhere(
    target: Record<string, unknown>,
    path: string,
    condition: unknown
  ): void {
    const segments = path.split(".").map(segment => segment.trim());
    let current: Record<string, unknown> = target;

    segments.forEach((segment, index) => {
      if (index === segments.length - 1) {
        const existing = current[segment];
        if (
          existing &&
          typeof existing === "object" &&
          !Array.isArray(existing) &&
          existing !== null
        ) {
          current[segment] = {
            ...(existing as Record<string, unknown>),
            ...(condition as Record<string, unknown>),
          };
        } else {
          current[segment] = condition;
        }
        return;
      }

      if (
        !current[segment] ||
        typeof current[segment] !== "object" ||
        current[segment] === null
      ) {
        current[segment] = {};
      }

      current = current[segment] as Record<string, unknown>;
    });
  }

  private buildOrderBy(
    orderConfigs: QueryOrderConfig[] | undefined
  ): Array<Record<string, Prisma.SortOrder>> {
    if (!orderConfigs || orderConfigs.length === 0) {
      return [];
    }

    return orderConfigs.map(order => ({
      [order.field]: order.direction === "desc" ? "desc" : "asc",
    }));
  }

  private buildSelect(
    fields: string[] | undefined
  ): Record<string, true> | undefined {
    if (!fields || fields.length === 0) {
      return undefined;
    }

    return fields.reduce<Record<string, true>>((accumulator, field) => {
      accumulator[field] = true;
      return accumulator;
    }, {});
  }

  private getPrismaDelegate(delegateKey: PrismaDelegateKey) {
    const delegate = db[delegateKey];
    if (!delegate) {
      throw new Error(`Missing Prisma delegate for ${String(delegateKey)}`);
    }
    return delegate;
  }

  private executeFilterNode(
    filterConfig: FilterNodeConfig,
    triggerData: WorkflowTriggerEvent,
    runtimeContext: WorkflowRuntimeState
  ): FilterExecutionOutcome {
    if (!filterConfig.sourceKey) {
      throw new Error("Filter node requires a source key");
    }

    const sourceCollection = this.resolveCollectionFromKey(
      filterConfig.sourceKey,
      triggerData,
      runtimeContext
    );

    if (!Array.isArray(sourceCollection)) {
      throw new Error(
        `Filter source ${filterConfig.sourceKey} did not resolve to an array`
      );
    }

    const conditionsConfig: ConditionNodeConfig = {
      conditions: filterConfig.conditions ?? [],
      logicalOperator: filterConfig.logicalOperator ?? "AND",
    };

    const filtered = sourceCollection.filter(item => {
      if (conditionsConfig.conditions?.length === 0) {
        return true;
      }
      const evaluation = this.evaluateConditions(
        conditionsConfig,
        triggerData,
        runtimeContext,
        this.toRecord(item)
      );
      return evaluation.matched;
    });

    if (filterConfig.resultKey) {
      runtimeContext.shared[filterConfig.resultKey] = filtered;
    }

    return {
      output: {
        filtered,
        count: filtered.length,
        originalCount: sourceCollection.length,
      },
    };
  }

  private async executeScheduleNode(
    workflowId: string,
    node: WorkflowNode,
    scheduleConfig: ScheduleNodeConfig,
    runtimeContext: WorkflowRuntimeState,
    triggerData: WorkflowTriggerEvent
  ): Promise<ScheduleExecutionOutcome> {
    const metadata = this.toRecord(scheduleConfig.metadata) ?? {};
    metadata.organizationId = triggerData.organizationId;

    if (!metadata.module && triggerData.module) {
      metadata.module = triggerData.module;
    }
    if (!metadata.entityType && triggerData.entityType) {
      metadata.entityType = triggerData.entityType;
    }
    if (!metadata.eventType && triggerData.eventType) {
      metadata.eventType = triggerData.eventType;
    }
    if (!metadata.userId && triggerData.userId) {
      metadata.userId = triggerData.userId;
    }

    const existingPayload = this.toRecord(metadata.payload);
    if (existingPayload) {
      metadata.payload = existingPayload;
    } else {
      metadata.payload = triggerData.payload;
    }

    scheduleConfig.metadata = metadata;

    const schedule = await this.scheduler.upsertSchedule(
      workflowId,
      node.id,
      scheduleConfig
    );

    if (scheduleConfig.resultKey) {
      runtimeContext.shared[scheduleConfig.resultKey] = schedule;
    }

    return {
      output: {
        scheduled: true,
        scheduleId: schedule.id,
        cron: schedule.cron,
        frequency: schedule.frequency,
        timezone: schedule.timezone,
        isActive: schedule.isActive,
        nextRunAt: schedule.nextRunAt,
      },
    };
  }

  private extractResultKey(config: unknown): string | null {
    const record = this.toRecord(config);
    const value = record.resultKey;
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
    return null;
  }

  private normalizeNodeType(node: WorkflowNode): WorkflowNodeType {
    if (node.type !== "ACTION") {
      return node.type;
    }

    const configRecord = this.toRecord(node.config);
    const legacyNodeTypeRaw = configRecord.nodeType;
    if (typeof legacyNodeTypeRaw !== "string") {
      return node.type;
    }

    const legacyNodeType = legacyNodeTypeRaw.toUpperCase();
    switch (legacyNodeType) {
      case "CONDITION":
        return "CONDITION";
      case "LOOP":
        return "LOOP";
      case "PARALLEL":
        return "PARALLEL";
      case "DELAY":
        return "DELAY";
      case "APPROVAL":
        return "APPROVAL";
      case "DATA_TRANSFORM":
        return "DATA_TRANSFORM";
      case "QUERY":
      case "DATA_QUERY":
        return "QUERY";
      case "FILTER":
      case "DATA_FILTER":
        return "FILTER";
      case "SCHEDULE":
      case "SCHEDULED":
        return "SCHEDULE";
      default:
        return node.type;
    }
  }

  private toRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {};
    }
    return value as Record<string, unknown>;
  }

  private normalizeHandle(handle: string | null | undefined): string {
    return (handle ?? "").toLowerCase();
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
    const delayCandidate =
      config && typeof (config as DelayNodeConfig).delayMs === "number"
        ? (config as DelayNodeConfig).delayMs
        : undefined;

    const delayMs =
      typeof delayCandidate === "number" &&
      Number.isFinite(delayCandidate) &&
      delayCandidate >= 0
        ? delayCandidate
        : 1000;

    await new Promise<void>(resolve => {
      setTimeout(() => resolve(), delayMs);
    });
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
