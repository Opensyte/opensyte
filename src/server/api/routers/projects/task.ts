import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import {
  TaskStatusSchema,
  PrioritySchema,
} from "../../../../../prisma/generated/zod/index";
import { WorkflowEvents } from "~/lib/workflow-dispatcher";

export const taskRouter = createTRPCRouter({
  // Get all tasks for an organization
  getAll: publicProcedure
    .input(
      z.object({
        organizationId: z.string().cuid(),
        projectId: z.string().cuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.task.findMany({
        where: {
          organizationId: input.organizationId,
          ...(input.projectId && { projectId: input.projectId }),
        },
        orderBy: [{ order: "asc" }, { createdAt: "desc" }],
        include: {
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    }),

  // Get task by ID
  getById: publicProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        organizationId: z.string().cuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.task.findFirst({
        where: {
          id: input.id,
          organizationId: input.organizationId,
        },
        include: {
          project: {
            select: {
              id: true,
              name: true,
            },
          },
          parentTask: {
            select: {
              id: true,
              title: true,
            },
          },
          subtasks: {
            select: {
              id: true,
              title: true,
              status: true,
              priority: true,
            },
          },
        },
      });
    }),

  // Create new task
  create: publicProcedure
    .input(
      z.object({
        organizationId: z.string().cuid(),
        projectId: z.string().cuid().optional(),
        parentTaskId: z.string().cuid().optional(),
        title: z.string().min(1, "Task title is required"),
        description: z.string().optional(),
        status: TaskStatusSchema.default("BACKLOG"),
        priority: PrioritySchema.default("MEDIUM"),
        startDate: z.date().optional(),
        dueDate: z.date().optional(),
        assignedToId: z
          .string()
          .optional()
          .transform(val => (val === "unassigned" ? null : val)),
        createdById: z.string().optional(),
        estimatedHours: z.number().min(0).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.db.task.create({
        data: {
          organizationId: input.organizationId,
          projectId: input.projectId,
          parentTaskId: input.parentTaskId,
          title: input.title,
          description: input.description,
          status: input.status,
          priority: input.priority,
          startDate: input.startDate,
          dueDate: input.dueDate,
          assignedToId: input.assignedToId,
          createdById: input.createdById,
          estimatedHours: input.estimatedHours,
        },
        include: {
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Trigger workflow events
      try {
        await WorkflowEvents.dispatchProjectEvent(
          "created",
          "task",
          input.organizationId,
          {
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            startDate: task.startDate,
            dueDate: task.dueDate,
            assignedToId: task.assignedToId,
            createdById: task.createdById,
            estimatedHours: task.estimatedHours,
            actualHours: task.actualHours,
            projectId: task.projectId,
            projectName: task.project?.name,
            parentTaskId: task.parentTaskId,
            organizationId: task.organizationId,
            completedAt: task.completedAt,
            order: task.order,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
          }
        );
      } catch (workflowError) {
        console.error("Workflow dispatch failed:", workflowError);
        // Don't fail the main operation if workflow fails
      }

      return task;
    }),

  // Update task
  update: publicProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        organizationId: z.string().cuid(),
        projectId: z.string().cuid().optional(),
        parentTaskId: z.string().cuid().optional(),
        title: z.string().min(1, "Task title is required").optional(),
        description: z.string().optional(),
        status: TaskStatusSchema.optional(),
        priority: PrioritySchema.optional(),
        startDate: z.date().optional(),
        dueDate: z.date().optional(),
        assignedToId: z
          .string()
          .optional()
          .transform(val => (val === "unassigned" ? null : val)),
        estimatedHours: z.number().min(0).optional(),
        actualHours: z.number().min(0).optional(),
        completedAt: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, organizationId, ...updateData } = input;

      // Load existing for status change detection
      const existing = await ctx.db.task.findFirst({
        where: { id, organizationId },
        select: { status: true },
      });

      const updated = await ctx.db.task.update({
        where: {
          id,
          organizationId,
        },
        data: updateData,
        include: {
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Trigger workflow events
      try {
        const statusChanged =
          existing &&
          updateData.status &&
          existing.status !== updateData.status;
        await WorkflowEvents.dispatchProjectEvent(
          statusChanged ? "status_changed" : "updated",
          "task",
          organizationId,
          {
            id: updated.id,
            title: updated.title,
            description: updated.description,
            status: updated.status,
            priority: updated.priority,
            startDate: updated.startDate,
            dueDate: updated.dueDate,
            assignedToId: updated.assignedToId,
            estimatedHours: updated.estimatedHours,
            actualHours: updated.actualHours,
            projectId: updated.projectId,
            projectName: updated.project?.name,
            parentTaskId: updated.parentTaskId,
            organizationId: updated.organizationId,
            completedAt: updated.completedAt,
            order: updated.order,
            updatedAt: updated.updatedAt,
            ...(statusChanged ? { previousStatus: existing?.status } : {}),
          }
        );
      } catch (workflowError) {
        console.error("Workflow dispatch failed:", workflowError);
      }

      return updated;
    }),

  // Delete task
  delete: publicProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        organizationId: z.string().cuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.task.delete({
        where: {
          id: input.id,
          organizationId: input.organizationId,
        },
      });
    }),

  // Get task statistics
  getStats: publicProcedure
    .input(
      z.object({
        organizationId: z.string().cuid(),
        projectId: z.string().cuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const tasks = await ctx.db.task.findMany({
        where: {
          organizationId: input.organizationId,
          ...(input.projectId && { projectId: input.projectId }),
        },
        select: {
          status: true,
          priority: true,
          estimatedHours: true,
          actualHours: true,
        },
      });

      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t.status === "DONE").length;
      const inProgressTasks = tasks.filter(
        t => t.status === "IN_PROGRESS"
      ).length;
      const backlogTasks = tasks.filter(t => t.status === "BACKLOG").length;
      const todoTasks = tasks.filter(t => t.status === "TODO").length;
      const reviewTasks = tasks.filter(t => t.status === "REVIEW").length;

      const priorityBreakdown = {
        LOW: tasks.filter(t => t.priority === "LOW").length,
        MEDIUM: tasks.filter(t => t.priority === "MEDIUM").length,
        HIGH: tasks.filter(t => t.priority === "HIGH").length,
        URGENT: tasks.filter(t => t.priority === "URGENT").length,
      };

      const totalEstimatedHours = tasks.reduce(
        (acc, t) => acc + (t.estimatedHours ?? 0),
        0
      );
      const totalActualHours = tasks.reduce(
        (acc, t) => acc + (t.actualHours ?? 0),
        0
      );

      return {
        totalTasks,
        completedTasks,
        inProgressTasks,
        backlogTasks,
        todoTasks,
        reviewTasks,
        priorityBreakdown,
        totalEstimatedHours,
        totalActualHours,
        completionRate:
          totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      };
    }),

  // Get tasks by assignee
  getByAssignee: publicProcedure
    .input(
      z.object({
        organizationId: z.string().cuid(),
        assignedToId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.task.findMany({
        where: {
          organizationId: input.organizationId,
          assignedToId: input.assignedToId,
        },
        orderBy: {
          dueDate: "asc",
        },
        include: {
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    }),

  // Update task order for drag and drop
  updateOrder: publicProcedure
    .input(
      z.object({
        organizationId: z.string().cuid(),
        tasks: z.array(
          z.object({
            id: z.string().cuid(),
            order: z.number(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId, tasks } = input;

      // Update each task's order in a transaction
      const updatePromises = tasks.map(task =>
        ctx.db.task.update({
          where: {
            id: task.id,
            organizationId,
          },
          data: {
            order: task.order,
          },
        })
      );

      await Promise.all(updatePromises);

      return { success: true };
    }),
});
