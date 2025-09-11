import { z } from "zod";
import {
  createTRPCRouter,
  createPermissionProcedure,
  createAnyPermissionProcedure,
} from "../../trpc";
import { PERMISSIONS } from "~/lib/rbac";
import { db } from "~/server/db";
import { TRPCError } from "@trpc/server";
import {
  WorkflowExecutionStatusSchema,
  ExecutionPrioritySchema,
  VariableDataTypeSchema,
  LogLevelSchema,
  NodeExecutionStatusSchema,
  InputJsonValueSchema,
} from "../../../../../prisma/generated/zod";
import type { Prisma } from "@prisma/client";

// Workflow executions router that matches actual Prisma schema
export const executionsRouter = createTRPCRouter({
  // Get workflow executions
  getExecutions: createAnyPermissionProcedure([
    PERMISSIONS.WORKFLOWS_READ,
    PERMISSIONS.WORKFLOWS_WRITE,
    PERMISSIONS.WORKFLOWS_ADMIN,
  ])
    .input(
      z.object({
        workflowId: z.string().cuid(),
        organizationId: z.string().cuid(),
        status: WorkflowExecutionStatusSchema.optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      await ctx.requireAnyPermission(input.organizationId);

      try {
        // Verify workflow belongs to organization
        const workflow = await db.workflow.findFirst({
          where: {
            id: input.workflowId,
            organizationId: input.organizationId,
          },
        });

        if (!workflow) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Workflow not found",
          });
        }

        const executions = await db.workflowExecution.findMany({
          where: {
            workflowId: input.workflowId,
            ...(input.status && { status: input.status }),
          },
          select: {
            id: true,
            status: true,
            startedAt: true,
            completedAt: true,
            error: true,
            triggerData: true,
            progress: true,
            duration: true,
          },
          orderBy: { startedAt: "desc" },
        });

        return executions;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to fetch executions:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch executions",
        });
      }
    }),

  // Get single execution with details
  getExecution: createAnyPermissionProcedure([
    PERMISSIONS.WORKFLOWS_READ,
    PERMISSIONS.WORKFLOWS_WRITE,
    PERMISSIONS.WORKFLOWS_ADMIN,
  ])
    .input(
      z.object({
        id: z.string().cuid(),
        organizationId: z.string().cuid(),
      })
    )
    .query(async ({ input, ctx }) => {
      await ctx.requireAnyPermission(input.organizationId);

      try {
        const execution = await db.workflowExecution.findFirst({
          where: {
            id: input.id,
            workflow: {
              organizationId: input.organizationId,
            },
          },
          include: {
            workflow: {
              select: {
                id: true,
                name: true,
              },
            },
            nodeExecutions: {
              orderBy: { executionOrder: "asc" },
            },
            variables: true,
          },
        });

        if (!execution) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Execution not found",
          });
        }

        return execution;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to fetch execution:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch execution",
        });
      }
    }),

  // Cancel execution
  cancelExecution: createPermissionProcedure(PERMISSIONS.WORKFLOWS_WRITE)
    .input(
      z.object({
        id: z.string().cuid(),
        organizationId: z.string().cuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);

      try {
        // Verify execution exists and belongs to organization
        const existingExecution = await db.workflowExecution.findFirst({
          where: {
            id: input.id,
            workflow: {
              organizationId: input.organizationId,
            },
          },
        });

        if (!existingExecution) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Execution not found",
          });
        }

        // Only allow canceling if execution is running or pending
        if (
          !["PENDING", "RUNNING", "PAUSED"].includes(existingExecution.status)
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot cancel execution in current status",
          });
        }

        const cancelledExecution = await db.workflowExecution.update({
          where: { id: input.id },
          data: {
            status: "CANCELLED",
            completedAt: new Date(),
          },
        });

        return cancelledExecution;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to cancel execution:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to cancel execution",
        });
      }
    }),

  // Retry failed execution
  retryExecution: createPermissionProcedure(PERMISSIONS.WORKFLOWS_WRITE)
    .input(
      z.object({
        id: z.string().cuid(),
        organizationId: z.string().cuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);

      try {
        // Verify execution exists and belongs to organization
        const existingExecution = await db.workflowExecution.findFirst({
          where: {
            id: input.id,
            workflow: {
              organizationId: input.organizationId,
            },
          },
        });

        if (!existingExecution) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Execution not found",
          });
        }

        // Only allow retrying failed executions
        if (existingExecution.status !== "FAILED") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Can only retry failed executions",
          });
        }

        // Check retry limit
        if (existingExecution.retryCount >= existingExecution.maxRetries) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Maximum retry attempts exceeded",
          });
        }

        const retriedExecution = await db.workflowExecution.update({
          where: { id: input.id },
          data: {
            status: "PENDING",
            retryCount: existingExecution.retryCount + 1,
            error: null,
            errorDetails: undefined,
            failedAt: null,
            progress: 0,
          },
        });

        return retriedExecution;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to retry execution:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to retry execution",
        });
      }
    }),

  // Enhanced: Trigger workflow execution
  triggerExecution: createPermissionProcedure(PERMISSIONS.WORKFLOWS_WRITE)
    .input(
      z.object({
        workflowId: z.string().cuid(),
        organizationId: z.string().cuid(),
        triggerId: z.string().cuid().optional(),
        triggerData: InputJsonValueSchema.optional(),
        triggerContext: InputJsonValueSchema.optional(),
        priority: ExecutionPrioritySchema.default("NORMAL"),
        variables: z
          .array(
            z.object({
              name: z.string().min(1).max(100),
              value: z.string(),
              dataType: VariableDataTypeSchema,
              source: z.string().optional(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);

      try {
        // Verify workflow exists and is active
        const workflow = await db.workflow.findFirst({
          where: {
            id: input.workflowId,
            organizationId: input.organizationId,
            status: "ACTIVE",
          },
          include: {
            triggers: {
              where: { isActive: true },
            },
            nodes: {
              orderBy: { executionOrder: "asc" },
            },
          },
        });

        if (!workflow) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Active workflow not found",
          });
        }

        // Generate unique execution ID
        const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Start database transaction
        const execution = await db.$transaction(async tx => {
          // Create execution record
          const newExecution = await tx.workflowExecution.create({
            data: {
              workflowId: input.workflowId,
              triggerId: input.triggerId,
              executionId,
              status: "PENDING",
              priority: input.priority,
              triggerData: input.triggerData!,
              triggerContext: input.triggerContext!,
              progress: 0,
            },
          });

          // Create execution variables if provided
          if (input.variables && input.variables.length > 0) {
            await tx.executionVariable.createMany({
              data: input.variables.map(variable => ({
                workflowExecutionId: newExecution.id,
                name: variable.name,
                value: variable.value,
                dataType: variable.dataType,
                source: variable.source,
              })),
            });
          }

          // Create node execution records for all nodes
          if (workflow.nodes.length > 0) {
            await tx.nodeExecution.createMany({
              data: workflow.nodes.map((node, index) => ({
                workflowExecutionId: newExecution.id,
                nodeId: node.id,
                executionOrder: node.executionOrder ?? index,
                status: "PENDING",
                maxRetries: node.retryLimit,
              })),
            });
          }

          // Log execution start
          await tx.executionLog.create({
            data: {
              workflowExecutionId: newExecution.id,
              level: "INFO",
              message: "Workflow execution triggered",
              details: {
                triggerId: input.triggerId,
                priority: input.priority,
                variableCount: input.variables?.length ?? 0,
              } as Prisma.InputJsonValue,
              source: "execution_engine",
              category: "execution",
            },
          });

          return newExecution;
        });

        // Update workflow statistics
        await db.workflow.update({
          where: { id: input.workflowId },
          data: {
            totalExecutions: { increment: 1 },
            lastExecutedAt: new Date(),
          },
        });

        // TODO: Queue execution for processing
        // This would integrate with a job queue system like Bull/Bullmq

        return {
          id: execution.id,
          executionId,
          status: execution.status,
          priority: execution.priority,
          triggeredAt: execution.createdAt,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to trigger execution:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to trigger workflow execution",
        });
      }
    }),

  // Enhanced: Get execution logs
  getExecutionLogs: createAnyPermissionProcedure([
    PERMISSIONS.WORKFLOWS_READ,
    PERMISSIONS.WORKFLOWS_WRITE,
    PERMISSIONS.WORKFLOWS_ADMIN,
  ])
    .input(
      z.object({
        executionId: z.string().cuid(),
        organizationId: z.string().cuid(),
        level: LogLevelSchema.optional(),
        category: z.string().optional(),
        limit: z.number().min(1).max(1000).default(100),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      await ctx.requireAnyPermission(input.organizationId);

      try {
        // Verify execution belongs to organization
        const execution = await db.workflowExecution.findFirst({
          where: {
            id: input.executionId,
            workflow: {
              organizationId: input.organizationId,
            },
          },
        });

        if (!execution) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Execution not found",
          });
        }

        const [logs, total] = await Promise.all([
          db.executionLog.findMany({
            where: {
              workflowExecutionId: input.executionId,
              ...(input.level && { level: input.level }),
              ...(input.category && { category: input.category }),
            },
            orderBy: { timestamp: "desc" },
            skip: input.offset,
            take: input.limit,
          }),
          db.executionLog.count({
            where: {
              workflowExecutionId: input.executionId,
              ...(input.level && { level: input.level }),
              ...(input.category && { category: input.category }),
            },
          }),
        ]);

        return {
          logs,
          total,
          hasMore: input.offset + logs.length < total,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to fetch execution logs:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch execution logs",
        });
      }
    }),

  // Enhanced: Get node execution details
  getNodeExecutions: createAnyPermissionProcedure([
    PERMISSIONS.WORKFLOWS_READ,
    PERMISSIONS.WORKFLOWS_WRITE,
    PERMISSIONS.WORKFLOWS_ADMIN,
  ])
    .input(
      z.object({
        executionId: z.string().cuid(),
        organizationId: z.string().cuid(),
        status: NodeExecutionStatusSchema.optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      await ctx.requireAnyPermission(input.organizationId);

      try {
        // Verify execution belongs to organization
        const execution = await db.workflowExecution.findFirst({
          where: {
            id: input.executionId,
            workflow: {
              organizationId: input.organizationId,
            },
          },
        });

        if (!execution) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Execution not found",
          });
        }

        const nodeExecutions = await db.nodeExecution.findMany({
          where: {
            workflowExecutionId: input.executionId,
            ...(input.status && { status: input.status }),
          },
          include: {
            node: {
              select: {
                id: true,
                nodeId: true,
                name: true,
                type: true,
                description: true,
                isOptional: true,
              },
            },
          },
          orderBy: { executionOrder: "asc" },
        });

        return nodeExecutions;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to fetch node executions:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch node executions",
        });
      }
    }),

  // Enhanced: Bulk execution management
  bulkUpdateExecutions: createPermissionProcedure(PERMISSIONS.WORKFLOWS_ADMIN)
    .input(
      z.object({
        executionIds: z.array(z.string().cuid()).min(1).max(50),
        organizationId: z.string().cuid(),
        action: z.enum(["CANCEL", "PAUSE", "RESUME"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);

      try {
        // Verify all executions belong to organization
        const executions = await db.workflowExecution.findMany({
          where: {
            id: { in: input.executionIds },
            workflow: {
              organizationId: input.organizationId,
            },
          },
        });

        if (executions.length !== input.executionIds.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Some executions not found",
          });
        }

        // Determine new status based on action
        let newStatus: string;
        let updateFields: Prisma.WorkflowExecutionUpdateInput = {};

        switch (input.action) {
          case "CANCEL":
            newStatus = "CANCELLED";
            updateFields = {
              status: "CANCELLED",
              completedAt: new Date(),
            };
            break;
          case "PAUSE":
            newStatus = "PAUSED";
            updateFields = { status: "PAUSED" };
            break;
          case "RESUME":
            newStatus = "RUNNING";
            updateFields = { status: "RUNNING" };
            break;
          default:
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Invalid action",
            });
        }

        // Update executions in bulk
        const updatedExecutions = await db.workflowExecution.updateMany({
          where: {
            id: { in: input.executionIds },
          },
          data: updateFields,
        });

        // Log bulk action
        await Promise.all(
          input.executionIds.map(executionId =>
            db.executionLog.create({
              data: {
                workflowExecutionId: executionId,
                level: "INFO",
                message: `Bulk action performed: ${input.action}`,
                details: {
                  action: input.action,
                  performedBy: ctx.user.id,
                } as Prisma.InputJsonValue,
                source: "bulk_operation",
                category: "management",
              },
            })
          )
        );

        return {
          success: true,
          updatedCount: updatedExecutions.count,
          action: input.action,
          newStatus,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to bulk update executions:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to bulk update executions",
        });
      }
    }),

  // Enhanced: Get execution analytics
  getExecutionAnalytics: createAnyPermissionProcedure([
    PERMISSIONS.WORKFLOWS_READ,
    PERMISSIONS.WORKFLOWS_WRITE,
    PERMISSIONS.WORKFLOWS_ADMIN,
  ])
    .input(
      z.object({
        workflowId: z.string().cuid().optional(),
        organizationId: z.string().cuid(),
        dateFrom: z.coerce.date().optional(),
        dateTo: z.coerce.date().optional(),
        groupBy: z.enum(["day", "week", "month"]).default("day"),
      })
    )
    .query(async ({ input, ctx }) => {
      await ctx.requireAnyPermission(input.organizationId);

      try {
        const dateFrom =
          input.dateFrom ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
        const dateTo = input.dateTo ?? new Date();

        const whereClause: Prisma.WorkflowExecutionWhereInput = {
          workflow: {
            organizationId: input.organizationId,
          },
          createdAt: {
            gte: dateFrom,
            lte: dateTo,
          },
          ...(input.workflowId && { workflowId: input.workflowId }),
        };

        // Get execution counts by status
        const statusCounts = await db.workflowExecution.groupBy({
          by: ["status"],
          where: whereClause,
          _count: {
            id: true,
          },
        });

        // Get average execution duration
        const durationStats = await db.workflowExecution.aggregate({
          where: {
            ...whereClause,
            status: "COMPLETED",
            duration: { not: null },
          },
          _avg: {
            duration: true,
          },
          _min: {
            duration: true,
          },
          _max: {
            duration: true,
          },
        });

        // Get success rate
        const totalExecutions = await db.workflowExecution.count({
          where: whereClause,
        });

        const successfulExecutions = await db.workflowExecution.count({
          where: {
            ...whereClause,
            status: "COMPLETED",
          },
        });

        const successRate =
          totalExecutions > 0
            ? (successfulExecutions / totalExecutions) * 100
            : 0;

        return {
          statusCounts: statusCounts.map(item => ({
            status: item.status,
            count: item._count.id,
          })),
          durationStats: {
            average: durationStats._avg.duration,
            minimum: durationStats._min.duration,
            maximum: durationStats._max.duration,
          },
          successRate: Math.round(successRate * 100) / 100,
          totalExecutions,
          dateRange: {
            from: dateFrom,
            to: dateTo,
          },
        };
      } catch (error) {
        console.error("Failed to fetch execution analytics:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch execution analytics",
        });
      }
    }),
});
