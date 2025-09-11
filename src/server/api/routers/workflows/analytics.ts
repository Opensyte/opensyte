import { z } from "zod";
import {
  createTRPCRouter,
  createPermissionProcedure,
  createAnyPermissionProcedure,
} from "../../trpc";
import { PERMISSIONS } from "~/lib/rbac";
import { db } from "~/server/db";
import { TRPCError } from "@trpc/server";
import { InputJsonValueSchema } from "../../../../../prisma/generated/zod";
import type { Prisma } from "@prisma/client";

// Comprehensive workflow analytics router
export const workflowAnalyticsRouter = createTRPCRouter({
  // Get workflow performance analytics
  getWorkflowAnalytics: createAnyPermissionProcedure([
    PERMISSIONS.WORKFLOWS_READ,
    PERMISSIONS.WORKFLOWS_WRITE,
    PERMISSIONS.WORKFLOWS_ADMIN,
  ])
    .input(
      z.object({
        workflowId: z.string().cuid(),
        organizationId: z.string().cuid(),
        dateFrom: z.coerce.date().optional(),
        dateTo: z.coerce.date().optional(),
        granularity: z.enum(["hour", "day", "week", "month"]).default("day"),
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

        const dateFrom =
          input.dateFrom ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const dateTo = input.dateTo ?? new Date();

        const whereClause: Prisma.WorkflowExecutionWhereInput = {
          workflowId: input.workflowId,
          createdAt: {
            gte: dateFrom,
            lte: dateTo,
          },
        };

        // Get execution statistics
        const [
          totalExecutions,
          completedExecutions,
          failedExecutions,
          cancelledExecutions,
          averageDuration,
          recentExecutions,
        ] = await Promise.all([
          db.workflowExecution.count({ where: whereClause }),
          db.workflowExecution.count({
            where: { ...whereClause, status: "COMPLETED" },
          }),
          db.workflowExecution.count({
            where: { ...whereClause, status: "FAILED" },
          }),
          db.workflowExecution.count({
            where: { ...whereClause, status: "CANCELLED" },
          }),
          db.workflowExecution.aggregate({
            where: {
              ...whereClause,
              status: "COMPLETED",
              duration: { not: null },
            },
            _avg: { duration: true },
            _min: { duration: true },
            _max: { duration: true },
          }),
          db.workflowExecution.findMany({
            where: whereClause,
            select: {
              id: true,
              status: true,
              startedAt: true,
              completedAt: true,
              duration: true,
              error: true,
            },
            orderBy: { createdAt: "desc" },
            take: 10,
          }),
        ]);

        // Calculate success rate
        const successRate =
          totalExecutions > 0
            ? (completedExecutions / totalExecutions) * 100
            : 0;

        // Get most common error types
        const errorAnalysis = await db.workflowExecution.groupBy({
          by: ["error"],
          where: {
            ...whereClause,
            status: "FAILED",
            error: { not: null },
          },
          _count: {
            id: true,
          },
          orderBy: {
            _count: {
              id: "desc",
            },
          },
          take: 5,
        });

        // Get execution trends over time (simplified for demo)
        const executionTrends = await db.workflowExecution.groupBy({
          by: ["status"],
          where: whereClause,
          _count: {
            id: true,
          },
        });

        return {
          workflowId: input.workflowId,
          workflowName: workflow.name,
          dateRange: { from: dateFrom, to: dateTo },
          overview: {
            totalExecutions,
            completedExecutions,
            failedExecutions,
            cancelledExecutions,
            successRate: Math.round(successRate * 100) / 100,
            averageDuration: averageDuration._avg.duration,
            minDuration: averageDuration._min.duration,
            maxDuration: averageDuration._max.duration,
          },
          trends: executionTrends.map(trend => ({
            status: trend.status,
            count: trend._count.id,
          })),
          errorAnalysis: errorAnalysis.map(error => ({
            error: error.error,
            count: error._count.id,
          })),
          recentExecutions,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to fetch workflow analytics:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch workflow analytics",
        });
      }
    }),

  // Get organization-wide workflow analytics
  getOrganizationAnalytics: createAnyPermissionProcedure([
    PERMISSIONS.WORKFLOWS_READ,
    PERMISSIONS.WORKFLOWS_WRITE,
    PERMISSIONS.WORKFLOWS_ADMIN,
  ])
    .input(
      z.object({
        organizationId: z.string().cuid(),
        dateFrom: z.coerce.date().optional(),
        dateTo: z.coerce.date().optional(),
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ input, ctx }) => {
      await ctx.requireAnyPermission(input.organizationId);

      try {
        const dateFrom =
          input.dateFrom ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const dateTo = input.dateTo ?? new Date();

        // Get workflow overview
        const [
          activeWorkflows,
          totalWorkflows,
          workflowsByStatus,
          topPerformingWorkflows,
          organizationExecutions,
        ] = await Promise.all([
          db.workflow.count({
            where: { organizationId: input.organizationId, status: "ACTIVE" },
          }),
          db.workflow.count({
            where: { organizationId: input.organizationId },
          }),
          db.workflow.groupBy({
            by: ["status"],
            where: { organizationId: input.organizationId },
            _count: { id: true },
          }),
          db.workflow.findMany({
            where: { organizationId: input.organizationId },
            select: {
              id: true,
              name: true,
              status: true,
              totalExecutions: true,
              successfulExecutions: true,
              failedExecutions: true,
              lastExecutedAt: true,
            },
            orderBy: { totalExecutions: "desc" },
            take: input.limit,
          }),
          db.workflowExecution.count({
            where: {
              workflow: { organizationId: input.organizationId },
              createdAt: { gte: dateFrom, lte: dateTo },
            },
          }),
        ]);

        // Calculate success rates for workflows
        const workflowsWithSuccessRate = topPerformingWorkflows.map(
          workflow => ({
            ...workflow,
            successRate:
              workflow.totalExecutions > 0
                ? (workflow.successfulExecutions / workflow.totalExecutions) *
                  100
                : 0,
          })
        );

        return {
          organizationId: input.organizationId,
          dateRange: { from: dateFrom, to: dateTo },
          overview: {
            totalWorkflows,
            activeWorkflows,
            inactiveWorkflows: totalWorkflows - activeWorkflows,
            totalExecutions: organizationExecutions,
          },
          workflowsByStatus: workflowsByStatus.map(item => ({
            status: item.status,
            count: item._count.id,
          })),
          topWorkflows: workflowsWithSuccessRate,
        };
      } catch (error) {
        console.error("Failed to fetch organization analytics:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch organization analytics",
        });
      }
    }),

  // Get workflow node performance analytics
  getNodePerformanceAnalytics: createAnyPermissionProcedure([
    PERMISSIONS.WORKFLOWS_READ,
    PERMISSIONS.WORKFLOWS_WRITE,
    PERMISSIONS.WORKFLOWS_ADMIN,
  ])
    .input(
      z.object({
        workflowId: z.string().cuid(),
        organizationId: z.string().cuid(),
        dateFrom: z.coerce.date().optional(),
        dateTo: z.coerce.date().optional(),
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
          include: {
            nodes: {
              select: {
                id: true,
                nodeId: true,
                name: true,
                type: true,
              },
            },
          },
        });

        if (!workflow) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Workflow not found",
          });
        }

        const dateFrom =
          input.dateFrom ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const dateTo = input.dateTo ?? new Date();

        // Get node execution statistics
        const nodeStats = await Promise.all(
          workflow.nodes.map(async node => {
            const [
              totalExecutions,
              completedExecutions,
              failedExecutions,
              avgDuration,
            ] = await Promise.all([
              db.nodeExecution.count({
                where: {
                  nodeId: node.id,
                  workflowExecution: {
                    createdAt: { gte: dateFrom, lte: dateTo },
                  },
                },
              }),
              db.nodeExecution.count({
                where: {
                  nodeId: node.id,
                  status: "COMPLETED",
                  workflowExecution: {
                    createdAt: { gte: dateFrom, lte: dateTo },
                  },
                },
              }),
              db.nodeExecution.count({
                where: {
                  nodeId: node.id,
                  status: "FAILED",
                  workflowExecution: {
                    createdAt: { gte: dateFrom, lte: dateTo },
                  },
                },
              }),
              db.nodeExecution.aggregate({
                where: {
                  nodeId: node.id,
                  status: "COMPLETED",
                  duration: { not: null },
                  workflowExecution: {
                    createdAt: { gte: dateFrom, lte: dateTo },
                  },
                },
                _avg: { duration: true },
              }),
            ]);

            const successRate =
              totalExecutions > 0
                ? (completedExecutions / totalExecutions) * 100
                : 0;

            return {
              nodeId: node.id,
              nodeName: node.name,
              nodeType: node.type,
              reactFlowNodeId: node.nodeId,
              totalExecutions,
              completedExecutions,
              failedExecutions,
              successRate: Math.round(successRate * 100) / 100,
              averageDuration: avgDuration._avg.duration,
            };
          })
        );

        return {
          workflowId: input.workflowId,
          workflowName: workflow.name,
          dateRange: { from: dateFrom, to: dateTo },
          nodePerformance: nodeStats.sort(
            (a, b) => b.totalExecutions - a.totalExecutions
          ),
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to fetch node performance analytics:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch node performance analytics",
        });
      }
    }),

  // Get workflow error analytics
  getErrorAnalytics: createAnyPermissionProcedure([
    PERMISSIONS.WORKFLOWS_READ,
    PERMISSIONS.WORKFLOWS_WRITE,
    PERMISSIONS.WORKFLOWS_ADMIN,
  ])
    .input(
      z.object({
        organizationId: z.string().cuid(),
        workflowId: z.string().cuid().optional(),
        dateFrom: z.coerce.date().optional(),
        dateTo: z.coerce.date().optional(),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ input, ctx }) => {
      await ctx.requireAnyPermission(input.organizationId);

      try {
        const dateFrom =
          input.dateFrom ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const dateTo = input.dateTo ?? new Date();

        const whereClause: Prisma.WorkflowExecutionWhereInput = {
          workflow: { organizationId: input.organizationId },
          status: "FAILED",
          createdAt: { gte: dateFrom, lte: dateTo },
          ...(input.workflowId && { workflowId: input.workflowId }),
        };

        // Get error summary
        const [totalErrors, errorsByWorkflow, commonErrors, recentErrors] =
          await Promise.all([
            db.workflowExecution.count({ where: whereClause }),
            db.workflowExecution.groupBy({
              by: ["workflowId"],
              where: whereClause,
              _count: { id: true },
              orderBy: { _count: { id: "desc" } },
              take: 10,
            }),
            db.workflowExecution.groupBy({
              by: ["error"],
              where: { ...whereClause, error: { not: null } },
              _count: { id: true },
              orderBy: { _count: { id: "desc" } },
              take: 10,
            }),
            db.workflowExecution.findMany({
              where: whereClause,
              select: {
                id: true,
                executionId: true,
                error: true,
                errorDetails: true,
                failedAt: true,
                retryCount: true,
                workflow: {
                  select: { name: true },
                },
              },
              orderBy: { failedAt: "desc" },
              take: input.limit,
            }),
          ]);

        // Get workflow names for error grouping
        const workflowIds = errorsByWorkflow.map(item => item.workflowId);
        const workflowNames = await db.workflow.findMany({
          where: { id: { in: workflowIds } },
          select: { id: true, name: true },
        });

        const workflowNameMap = Object.fromEntries(
          workflowNames.map(w => [w.id, w.name])
        );

        return {
          dateRange: { from: dateFrom, to: dateTo },
          summary: {
            totalErrors,
            averageErrorsPerDay: Math.round(
              totalErrors /
                Math.max(
                  1,
                  Math.ceil(
                    (dateTo.getTime() - dateFrom.getTime()) /
                      (24 * 60 * 60 * 1000)
                  )
                )
            ),
          },
          errorsByWorkflow: errorsByWorkflow.map(item => ({
            workflowId: item.workflowId,
            workflowName:
              workflowNameMap[item.workflowId] ?? "Unknown Workflow",
            errorCount: item._count.id,
          })),
          commonErrors: commonErrors.map(item => ({
            error: item.error,
            count: item._count.id,
          })),
          recentErrors,
        };
      } catch (error) {
        console.error("Failed to fetch error analytics:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch error analytics",
        });
      }
    }),

  // Create or update workflow analytics record
  createAnalyticsRecord: createPermissionProcedure(PERMISSIONS.WORKFLOWS_ADMIN)
    .input(
      z.object({
        workflowId: z.string().cuid(),
        organizationId: z.string().cuid(),
        periodStart: z.coerce.date(),
        periodEnd: z.coerce.date(),
        granularity: z.enum(["daily", "weekly", "monthly"]).default("daily"),
        metrics: z.object({
          totalExecutions: z.number().min(0),
          successfulExecutions: z.number().min(0),
          failedExecutions: z.number().min(0),
          averageDuration: z.number().optional(),
          minDuration: z.number().optional(),
          maxDuration: z.number().optional(),
          p95Duration: z.number().optional(),
          errorRate: z.number().min(0).max(100).optional(),
          commonErrors: InputJsonValueSchema.optional(),
        }),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);

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

        // Upsert analytics record
        const analyticsRecord = await db.workflowAnalytics.upsert({
          where: {
            workflowId_periodStart_granularity: {
              workflowId: input.workflowId,
              periodStart: input.periodStart,
              granularity: input.granularity,
            },
          },
          update: {
            periodEnd: input.periodEnd,
            totalExecutions: input.metrics.totalExecutions,
            successfulExecutions: input.metrics.successfulExecutions,
            failedExecutions: input.metrics.failedExecutions,
            averageDuration: input.metrics.averageDuration,
            minDuration: input.metrics.minDuration,
            maxDuration: input.metrics.maxDuration,
            p95Duration: input.metrics.p95Duration,
            errorRate: input.metrics.errorRate,
            commonErrors: input.metrics.commonErrors!,
          },
          create: {
            workflowId: input.workflowId,
            periodStart: input.periodStart,
            periodEnd: input.periodEnd,
            granularity: input.granularity,
            totalExecutions: input.metrics.totalExecutions,
            successfulExecutions: input.metrics.successfulExecutions,
            failedExecutions: input.metrics.failedExecutions,
            averageDuration: input.metrics.averageDuration,
            minDuration: input.metrics.minDuration,
            maxDuration: input.metrics.maxDuration,
            p95Duration: input.metrics.p95Duration,
            errorRate: input.metrics.errorRate,
            commonErrors: input.metrics.commonErrors!,
          },
        });

        return analyticsRecord;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to create analytics record:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create analytics record",
        });
      }
    }),

  // Get stored analytics records
  getStoredAnalytics: createAnyPermissionProcedure([
    PERMISSIONS.WORKFLOWS_READ,
    PERMISSIONS.WORKFLOWS_WRITE,
    PERMISSIONS.WORKFLOWS_ADMIN,
  ])
    .input(
      z.object({
        workflowId: z.string().cuid(),
        organizationId: z.string().cuid(),
        granularity: z.enum(["daily", "weekly", "monthly"]).optional(),
        dateFrom: z.coerce.date().optional(),
        dateTo: z.coerce.date().optional(),
        limit: z.number().min(1).max(100).default(30),
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

        const whereClause: Prisma.WorkflowAnalyticsWhereInput = {
          workflowId: input.workflowId,
          ...(input.granularity && { granularity: input.granularity }),
          ...(input.dateFrom &&
            input.dateTo && {
              periodStart: { gte: input.dateFrom },
              periodEnd: { lte: input.dateTo },
            }),
        };

        const analytics = await db.workflowAnalytics.findMany({
          where: whereClause,
          orderBy: { periodStart: "desc" },
          take: input.limit,
        });

        return {
          workflowId: input.workflowId,
          workflowName: workflow.name,
          analytics,
          totalRecords: analytics.length,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to fetch stored analytics:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch stored analytics",
        });
      }
    }),
});
