/**
 * Scheduler Router
 *
 * tRPC router for managing workflow schedules
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { SchedulerEngine } from "~/lib/scheduler-engine";
import { TRPCError } from "@trpc/server";

const schedulerEngine = new SchedulerEngine();

export const schedulerRouter = createTRPCRouter({
  /**
   * Create a new schedule for a workflow
   */
  createSchedule: protectedProcedure
    .input(
      z.object({
        workflowId: z.string(),
        cronExpression: z.string(),
        timezone: z.string().default("UTC"),
        enabled: z.boolean().default(true),
        payload: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Verify workflow exists and user has access
        const workflow = await ctx.db.workflow.findFirst({
          where: {
            id: input.workflowId,
            organizationId: ctx.session.user.organizationId,
          },
        });

        if (!workflow) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Workflow not found",
          });
        }

        // Validate cron expression
        const parseResult = schedulerEngine.parseCronExpression(
          input.cronExpression
        );
        if (!parseResult.isValid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Invalid cron expression: ${parseResult.error}`,
          });
        }

        // Create schedule
        const scheduleId = await schedulerEngine.registerSchedule({
          workflowId: input.workflowId,
          organizationId: ctx.session.user.organizationId!,
          cronExpression: input.cronExpression,
          timezone: input.timezone,
          enabled: input.enabled,
          payload: input.payload,
        });

        return {
          success: true,
          scheduleId,
          message: "Schedule created successfully",
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to create schedule",
        });
      }
    }),

  /**
   * Update an existing schedule
   */
  updateSchedule: protectedProcedure
    .input(
      z.object({
        scheduleId: z.string(),
        cronExpression: z.string().optional(),
        timezone: z.string().optional(),
        enabled: z.boolean().optional(),
        payload: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Verify schedule exists and user has access
        const schedule = await ctx.db.workflowSchedule.findFirst({
          where: {
            id: input.scheduleId,
            organizationId: ctx.session.user.organizationId,
          },
        });

        if (!schedule) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Schedule not found",
          });
        }

        // Validate cron expression if provided
        if (input.cronExpression) {
          const parseResult = schedulerEngine.parseCronExpression(
            input.cronExpression
          );
          if (!parseResult.isValid) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Invalid cron expression: ${parseResult.error}`,
            });
          }
        }

        // Update schedule
        await schedulerEngine.updateSchedule(input.scheduleId, {
          cronExpression: input.cronExpression,
          timezone: input.timezone,
          enabled: input.enabled,
          payload: input.payload,
          workflowId: schedule.workflowId,
          organizationId: schedule.organizationId,
        });

        return {
          success: true,
          message: "Schedule updated successfully",
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to update schedule",
        });
      }
    }),

  /**
   * Delete a schedule
   */
  deleteSchedule: protectedProcedure
    .input(
      z.object({
        scheduleId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Verify schedule exists and user has access
        const schedule = await ctx.db.workflowSchedule.findFirst({
          where: {
            id: input.scheduleId,
            organizationId: ctx.session.user.organizationId,
          },
        });

        if (!schedule) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Schedule not found",
          });
        }

        // Delete schedule
        await schedulerEngine.deleteSchedule(input.scheduleId);

        return {
          success: true,
          message: "Schedule deleted successfully",
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to delete schedule",
        });
      }
    }),

  /**
   * Get all schedules for the current organization
   */
  getSchedules: protectedProcedure
    .input(
      z
        .object({
          workflowId: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      try {
        const schedules = await schedulerEngine.getSchedules(
          ctx.session.user.organizationId!
        );

        // Filter by workflowId if provided
        const filteredSchedules = input?.workflowId
          ? schedules.filter(s => s.workflowId === input.workflowId)
          : schedules;

        return {
          success: true,
          schedules: filteredSchedules.map(schedule => ({
            id: schedule.id,
            workflowId: schedule.workflowId,
            workflowName: schedule.workflow.name,
            cronExpression: schedule.cronExpression,
            timezone: schedule.timezone,
            enabled: schedule.enabled,
            lastRunAt: schedule.lastRunAt,
            nextRunAt: schedule.nextRunAt,
            payload: schedule.payload,
            createdAt: schedule.createdAt,
            updatedAt: schedule.updatedAt,
          })),
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to fetch schedules",
        });
      }
    }),

  /**
   * Get schedule by ID
   */
  getScheduleById: protectedProcedure
    .input(
      z.object({
        scheduleId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const schedule = await schedulerEngine.getScheduleById(
          input.scheduleId
        );

        if (!schedule) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Schedule not found",
          });
        }

        // Verify user has access
        if (schedule.organizationId !== ctx.session.user.organizationId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Access denied",
          });
        }

        return {
          success: true,
          schedule: {
            id: schedule.id,
            workflowId: schedule.workflowId,
            workflowName: schedule.workflow.name,
            cronExpression: schedule.cronExpression,
            timezone: schedule.timezone,
            enabled: schedule.enabled,
            lastRunAt: schedule.lastRunAt,
            nextRunAt: schedule.nextRunAt,
            payload: schedule.payload,
            createdAt: schedule.createdAt,
            updatedAt: schedule.updatedAt,
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to fetch schedule",
        });
      }
    }),

  /**
   * Get schedule execution history
   */
  getScheduleHistory: protectedProcedure
    .input(
      z.object({
        scheduleId: z.string().optional(),
        workflowId: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // Build where clause
        const where: {
          organizationId: string;
          workflowId?: string;
          triggerId?: string;
        } = {
          organizationId: ctx.session.user.organizationId!,
        };

        if (input.workflowId) {
          where.workflowId = input.workflowId;
        }

        // Get workflow executions triggered by scheduler
        const executions = await ctx.db.workflowExecution.findMany({
          where: {
            ...where,
            trigger: {
              triggerType: "SCHEDULED_DAILY", // Or other scheduled types
            },
          },
          include: {
            workflow: {
              select: {
                id: true,
                name: true,
              },
            },
            trigger: true,
          },
          orderBy: {
            startedAt: "desc",
          },
          take: input.limit,
          skip: input.offset,
        });

        const total = await ctx.db.workflowExecution.count({
          where: {
            ...where,
            trigger: {
              triggerType: "SCHEDULED_DAILY",
            },
          },
        });

        return {
          success: true,
          executions: executions.map(exec => ({
            id: exec.id,
            workflowId: exec.workflowId,
            workflowName: exec.workflow.name,
            status: exec.status,
            startedAt: exec.startedAt,
            completedAt: exec.completedAt,
            error: exec.error,
          })),
          pagination: {
            total,
            limit: input.limit,
            offset: input.offset,
            hasMore: input.offset + input.limit < total,
          },
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to fetch schedule history",
        });
      }
    }),

  /**
   * Validate cron expression
   */
  validateCronExpression: protectedProcedure
    .input(
      z.object({
        cronExpression: z.string(),
      })
    )
    .query(({ input }) => {
      const result = schedulerEngine.parseCronExpression(input.cronExpression);
      return {
        isValid: result.isValid,
        description: result.description,
        nextRun: result.nextRun,
        error: result.error,
      };
    }),

  /**
   * Manually trigger a scheduled workflow
   */
  triggerSchedule: protectedProcedure
    .input(
      z.object({
        scheduleId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Verify schedule exists and user has access
        const schedule = await ctx.db.workflowSchedule.findFirst({
          where: {
            id: input.scheduleId,
            organizationId: ctx.session.user.organizationId,
          },
          include: {
            workflow: true,
          },
        });

        if (!schedule) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Schedule not found",
          });
        }

        // Import WorkflowExecutionEngine
        const { WorkflowExecutionEngine } = await import(
          "~/lib/workflow-engine"
        );
        const engine = new WorkflowExecutionEngine();

        // Create trigger event
        const triggerEvent = {
          module: "scheduler",
          entityType: "schedule",
          eventType: "manual_trigger",
          organizationId: schedule.organizationId,
          payload: (schedule.payload as Record<string, unknown>) ?? {},
          triggeredAt: new Date(),
          userId: ctx.session.user.id,
        };

        // Execute the workflow
        const executionResult = await engine.executeWorkflow(
          schedule.workflowId,
          triggerEvent
        );

        return {
          success: true,
          executionId: executionResult.executionId,
          message: "Schedule triggered successfully",
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to trigger schedule",
        });
      }
    }),
});
