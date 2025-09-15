/**
 * Execution Logger Service
 *
 * Provides structured logging for workflow executions with correlation IDs,
 * context tracking, and queryable log storage.
 */

import { db } from "~/server/db";
import { type Prisma, type LogLevel } from "@prisma/client";

export interface LogContext {
  workflowExecutionId: string;
  nodeId?: string;
  source: string;
  category?: string;
  correlationId?: string;
  timestamp?: Date;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  details?: Record<string, unknown>;
  context?: Record<string, unknown>;
}

export class ExecutionLogger {
  private static instance: ExecutionLogger;

  public static getInstance(): ExecutionLogger {
    if (!ExecutionLogger.instance) {
      ExecutionLogger.instance = new ExecutionLogger();
    }
    return ExecutionLogger.instance;
  }

  /**
   * Log debug information
   */
  async debug(
    logContext: LogContext,
    message: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    await this.log(logContext, {
      level: "DEBUG",
      message,
      details,
    });
  }

  /**
   * Log informational messages
   */
  async info(
    logContext: LogContext,
    message: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    await this.log(logContext, {
      level: "INFO",
      message,
      details,
    });
  }

  /**
   * Log warnings
   */
  async warn(
    logContext: LogContext,
    message: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    await this.log(logContext, {
      level: "WARN",
      message,
      details,
    });
  }

  /**
   * Log errors
   */
  async error(
    logContext: LogContext,
    message: string,
    error?: unknown,
    details?: Record<string, unknown>
  ): Promise<void> {
    const errorDetails = {
      ...details,
      ...(error
        ? {
            error: {
              message:
                error instanceof Error ? error.message : JSON.stringify(error),
              stack: error instanceof Error ? error.stack : undefined,
              name: error instanceof Error ? error.name : "UnknownError",
            },
          }
        : {}),
    };

    await this.log(logContext, {
      level: "ERROR",
      message,
      details: errorDetails,
    });
  }

  /**
   * Log fatal errors
   */
  async fatal(
    logContext: LogContext,
    message: string,
    error?: unknown,
    details?: Record<string, unknown>
  ): Promise<void> {
    const errorDetails = {
      ...details,
      ...(error
        ? {
            error: {
              message:
                error instanceof Error ? error.message : JSON.stringify(error),
              stack: error instanceof Error ? error.stack : undefined,
              name: error instanceof Error ? error.name : "UnknownError",
            },
          }
        : {}),
    };

    await this.log(logContext, {
      level: "FATAL",
      message,
      details: errorDetails,
    });
  }

  /**
   * Log workflow execution started
   */
  async logExecutionStarted(
    workflowExecutionId: string,
    workflowName: string,
    triggerType: string,
    organizationId: string
  ): Promise<void> {
    await this.info(
      {
        workflowExecutionId,
        source: "execution-engine",
        category: "execution-lifecycle",
      },
      "Workflow execution started",
      {
        workflowName,
        triggerType,
        organizationId,
        phase: "started",
      }
    );
  }

  /**
   * Log workflow execution completed
   */
  async logExecutionCompleted(
    workflowExecutionId: string,
    workflowName: string,
    duration: number,
    nodeCount: number,
    successfulNodes: number,
    failedNodes: number
  ): Promise<void> {
    await this.info(
      {
        workflowExecutionId,
        source: "execution-engine",
        category: "execution-lifecycle",
      },
      "Workflow execution completed",
      {
        workflowName,
        duration,
        nodeCount,
        successfulNodes,
        failedNodes,
        phase: "completed",
      }
    );
  }

  /**
   * Log workflow execution failed
   */
  async logExecutionFailed(
    workflowExecutionId: string,
    workflowName: string,
    error: Error,
    duration: number
  ): Promise<void> {
    await this.error(
      {
        workflowExecutionId,
        source: "execution-engine",
        category: "execution-lifecycle",
      },
      "Workflow execution failed",
      error,
      {
        workflowName,
        duration,
        phase: "failed",
      }
    );
  }

  /**
   * Log node execution started
   */
  async logNodeStarted(
    workflowExecutionId: string,
    nodeId: string,
    nodeType: string,
    nodeName: string
  ): Promise<void> {
    await this.debug(
      {
        workflowExecutionId,
        nodeId,
        source: "node-executor",
        category: "node-lifecycle",
      },
      "Node execution started",
      {
        nodeType,
        nodeName,
        phase: "started",
      }
    );
  }

  /**
   * Log node execution completed
   */
  async logNodeCompleted(
    workflowExecutionId: string,
    nodeId: string,
    nodeType: string,
    nodeName: string,
    duration: number,
    output?: Record<string, unknown>
  ): Promise<void> {
    await this.debug(
      {
        workflowExecutionId,
        nodeId,
        source: "node-executor",
        category: "node-lifecycle",
      },
      "Node execution completed",
      {
        nodeType,
        nodeName,
        duration,
        output,
        phase: "completed",
      }
    );
  }

  /**
   * Log node execution failed
   */
  async logNodeFailed(
    workflowExecutionId: string,
    nodeId: string,
    nodeType: string,
    nodeName: string,
    error: Error,
    duration: number
  ): Promise<void> {
    await this.error(
      {
        workflowExecutionId,
        nodeId,
        source: "node-executor",
        category: "node-lifecycle",
      },
      "Node execution failed",
      error,
      {
        nodeType,
        nodeName,
        duration,
        phase: "failed",
      }
    );
  }

  /**
   * Log action execution (email, SMS, etc.)
   */
  async logActionExecution(
    workflowExecutionId: string,
    nodeId: string,
    actionType: string,
    actionData: Record<string, unknown>,
    result: Record<string, unknown>
  ): Promise<void> {
    await this.info(
      {
        workflowExecutionId,
        nodeId,
        source: `${actionType.toLowerCase()}-service`,
        category: "action-execution",
      },
      `${actionType} action executed`,
      {
        actionType,
        actionData,
        result,
      }
    );
  }

  /**
   * Log variable resolution
   */
  async logVariableResolution(
    workflowExecutionId: string,
    nodeId: string,
    variables: Record<string, unknown>,
    resolvedVariables: Record<string, unknown>
  ): Promise<void> {
    await this.debug(
      {
        workflowExecutionId,
        nodeId,
        source: "variable-resolver",
        category: "variable-resolution",
      },
      "Variables resolved",
      {
        variableCount: Object.keys(variables).length,
        resolvedCount: Object.keys(resolvedVariables).length,
        variables,
        resolvedVariables,
      }
    );
  }

  /**
   * Log trigger matching
   */
  async logTriggerMatching(
    organizationId: string,
    triggerType: string,
    eventData: Record<string, unknown>,
    matchedWorkflows: Array<{ workflowId: string; workflowName: string }>
  ): Promise<void> {
    // Create a temporary context for trigger matching logs
    const tempContext = {
      workflowExecutionId: `trigger_${Date.now()}`,
      source: "workflow-dispatcher",
      category: "trigger-matching",
    };

    await this.info(tempContext, "Trigger matching completed", {
      organizationId,
      triggerType,
      eventData,
      matchedWorkflowCount: matchedWorkflows.length,
      matchedWorkflows,
    });
  }

  /**
   * Core logging method
   */
  private async log(logContext: LogContext, entry: LogEntry): Promise<void> {
    try {
      const timestamp = logContext.timestamp ?? new Date();

      // Enhanced details with context information
      const enhancedDetails = {
        ...entry.details,
        context: {
          ...entry.context,
          source: logContext.source,
          category: logContext.category,
          correlationId: logContext.correlationId,
          timestamp: timestamp.toISOString(),
        },
      };

      // Skip DB write for ephemeral contexts without a persisted execution
      if (
        !logContext.workflowExecutionId ||
        (typeof logContext.workflowExecutionId === "string" &&
          logContext.workflowExecutionId.startsWith("trigger_"))
      ) {
        // Dev console logging only
        if (process.env.NODE_ENV === "development") {
          const consoleMethod = this.getConsoleMethod(entry.level);
          consoleMethod(
            `[${entry.level}] ${logContext.source}: ${entry.message}`,
            enhancedDetails
          );
        }
        return;
      }

      // Store in database
      await db.executionLog.create({
        data: {
          workflowExecutionId: logContext.workflowExecutionId,
          nodeId: logContext.nodeId,
          level: entry.level,
          message: entry.message,
          details: enhancedDetails as Prisma.InputJsonValue,
          timestamp,
          source: logContext.source,
          category: logContext.category,
        },
      });

      // Also log to console for development
      if (process.env.NODE_ENV === "development") {
        const consoleMethod = this.getConsoleMethod(entry.level);
        consoleMethod(
          `[${entry.level}] ${logContext.source}: ${entry.message}`,
          enhancedDetails
        );
      }
    } catch (error) {
      // Fallback to console logging if database logging fails
      console.error("Failed to write execution log:", error);
      console.error("Original log entry:", { logContext, entry });
    }
  }

  /**
   * Get appropriate console method for log level
   */
  private getConsoleMethod(level: LogLevel): typeof console.log {
    switch (level) {
      case "DEBUG":
        return console.debug;
      case "INFO":
        return console.info;
      case "WARN":
        return console.warn;
      case "ERROR":
      case "FATAL":
        return console.error;
      default:
        return console.log;
    }
  }

  /**
   * Query execution logs
   */
  async queryLogs(filters: {
    workflowExecutionId?: string;
    nodeId?: string;
    level?: LogLevel[];
    source?: string;
    category?: string;
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
  }) {
    const whereClause: Prisma.ExecutionLogWhereInput = {
      ...(filters.workflowExecutionId && {
        workflowExecutionId: filters.workflowExecutionId,
      }),
      ...(filters.nodeId && { nodeId: filters.nodeId }),
      ...(filters.level && { level: { in: filters.level } }),
      ...(filters.source && { source: filters.source }),
      ...(filters.category && { category: filters.category }),
      ...(filters.fromDate && { timestamp: { gte: filters.fromDate } }),
      ...(filters.toDate && { timestamp: { lte: filters.toDate } }),
    };

    return await db.executionLog.findMany({
      where: whereClause,
      orderBy: { timestamp: "desc" },
      take: filters.limit ?? 100,
    });
  }

  /**
   * Get execution summary
   */
  async getExecutionSummary(workflowExecutionId: string) {
    const logs = await db.executionLog.findMany({
      where: { workflowExecutionId },
      orderBy: { timestamp: "asc" },
    });

    const summary = {
      totalLogs: logs.length,
      levels: logs.reduce(
        (acc, log) => {
          acc[log.level] = (acc[log.level] ?? 0) + 1;
          return acc;
        },
        {} as Record<LogLevel, number>
      ),
      sources: logs.reduce(
        (acc, log) => {
          if (log.source) {
            acc[log.source] = (acc[log.source] ?? 0) + 1;
          }
          return acc;
        },
        {} as Record<string, number>
      ),
      categories: logs.reduce(
        (acc, log) => {
          if (log.category) {
            acc[log.category] = (acc[log.category] ?? 0) + 1;
          }
          return acc;
        },
        {} as Record<string, number>
      ),
      timeline: {
        started: logs[0]?.timestamp,
        ended: logs[logs.length - 1]?.timestamp,
        duration:
          logs.length > 1
            ? logs[logs.length - 1]!.timestamp.getTime() -
              logs[0]!.timestamp.getTime()
            : 0,
      },
    };

    return summary;
  }
}

// Export singleton instance
export const executionLogger = ExecutionLogger.getInstance();
