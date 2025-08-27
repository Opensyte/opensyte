import { z } from "zod";
import {
  createTRPCRouter,
  createPermissionProcedure,
  createAnyPermissionProcedure,
} from "~/server/api/trpc";
import { PERMISSIONS } from "~/lib/rbac";
import { type Prisma } from "@prisma/client";
import {
  TaskStatusSchema,
  PrioritySchema,
} from "../../../../prisma/generated/zod";

export const taskRouter = createTRPCRouter({
  // Get all tasks for an organization
  getAll: createAnyPermissionProcedure([
    PERMISSIONS.PROJECTS_READ,
    PERMISSIONS.PROJECTS_WRITE,
    PERMISSIONS.PROJECTS_ADMIN,
  ])
    .input(
      z.object({
        organizationId: z.string().cuid(),
        projectId: z.string().cuid().optional(),
        status: TaskStatusSchema.optional(),
        priority: PrioritySchema.optional(),
        assignedToId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      await ctx.requireAnyPermission(input.organizationId);
      const { organizationId, projectId, status, priority, assignedToId } =
        input;

      const whereClause: Prisma.TaskWhereInput = {
        organizationId,
        projectId: projectId ?? undefined,
        status: status ?? undefined,
        priority: priority ?? undefined,
        assignedToId: assignedToId ?? undefined,
      };

      return ctx.db.task.findMany({
        where: whereClause,
        include: {
          project: {
            select: {
              id: true,
              name: true,
            },
          },
          // Note: assignedTo and createdBy relationships need to be set up in Prisma schema
          _count: {
            select: {
              comments: true,
              attachments: true,
              subtasks: true,
            },
          },
        },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      });
    }),

  // Get task statistics
  getStats: createAnyPermissionProcedure([
    PERMISSIONS.PROJECTS_READ,
    PERMISSIONS.PROJECTS_WRITE,
    PERMISSIONS.PROJECTS_ADMIN,
  ])
    .input(
      z.object({
        organizationId: z.string().cuid(),
        projectId: z.string().cuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      await ctx.requireAnyPermission(input.organizationId);
      const { organizationId, projectId } = input;

      const whereClause: Prisma.TaskWhereInput = {
        organizationId,
        ...(projectId && { projectId }),
      };

      const [totalTasks, tasksByStatus, tasksByPriority, completedTasks] =
        await Promise.all([
          // Total tasks count
          ctx.db.task.count({
            where: whereClause,
          }),

          // Tasks by status
          ctx.db.task.groupBy({
            by: ["status"],
            where: whereClause,
            _count: {
              id: true,
            },
          }),

          // Tasks by priority
          ctx.db.task.groupBy({
            by: ["priority"],
            where: whereClause,
            _count: {
              id: true,
            },
          }),

          // Completed tasks count
          ctx.db.task.count({
            where: {
              ...whereClause,
              status: "DONE",
            },
          }),
        ]);

      const completionRate =
        totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      return {
        totalTasks,
        completedTasks,
        completionRate: Math.round(completionRate * 100) / 100,
        tasksByStatus: tasksByStatus.reduce(
          (acc, item) => {
            acc[item.status] = item._count.id;
            return acc;
          },
          {} as Record<string, number>
        ),
        tasksByPriority: tasksByPriority.reduce(
          (acc, item) => {
            acc[item.priority] = item._count.id;
            return acc;
          },
          {} as Record<string, number>
        ),
      };
    }),

  // Create a new task
  create: createPermissionProcedure(PERMISSIONS.PROJECTS_WRITE)
    .input(
      z.object({
        organizationId: z.string().cuid(),
        projectId: z.string().cuid().optional(),
        title: z.string().min(1, "Title is required"),
        description: z.string().optional(),
        status: TaskStatusSchema.default("TODO"),
        priority: PrioritySchema.default("MEDIUM"),
        assignedToId: z.string().optional(),
        startDate: z.date().optional(),
        dueDate: z.date().optional(),
        estimatedHours: z.number().min(0).optional(),
        createdById: z.string().cuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.requirePermission(input.organizationId);
      return ctx.db.task.create({
        data: input,
        include: {
          project: {
            select: {
              id: true,
              name: true,
            },
          },
          // Note: assignedTo and createdBy relationships need to be set up in Prisma schema
        },
      });
    }),

  // Update a task
  update: createPermissionProcedure(PERMISSIONS.PROJECTS_WRITE)
    .input(
      z.object({
        id: z.string().cuid(),
        organizationId: z.string().cuid(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        status: TaskStatusSchema.optional(),
        priority: PrioritySchema.optional(),
        assignedToId: z.string().optional(),
        startDate: z.date().optional(),
        dueDate: z.date().optional(),
        estimatedHours: z.number().min(0).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.requirePermission(input.organizationId);
      const { id, organizationId, ...updateData } = input;

      // Remove undefined values
      const cleanData = Object.fromEntries(
        Object.entries(updateData).filter(([_, value]) => value !== undefined)
      );

      return ctx.db.task.update({
        where: {
          id,
          organizationId,
        },
        data: cleanData,
        include: {
          project: {
            select: {
              id: true,
              name: true,
            },
          },
          // Note: assignedTo and createdBy relationships need to be set up in Prisma schema
        },
      });
    }),

  // Delete a task
  delete: createPermissionProcedure(PERMISSIONS.PROJECTS_WRITE)
    .input(
      z.object({
        id: z.string().cuid(),
        organizationId: z.string().cuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.requirePermission(input.organizationId);
      return ctx.db.task.delete({
        where: {
          id: input.id,
          organizationId: input.organizationId,
        },
      });
    }),

  // Get organization members for assignment
  getAssignableMembers: createAnyPermissionProcedure([
    PERMISSIONS.PROJECTS_READ,
    PERMISSIONS.PROJECTS_WRITE,
    PERMISSIONS.PROJECTS_ADMIN,
  ])
    .input(
      z.object({
        organizationId: z.string().cuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      await ctx.requireAnyPermission(input.organizationId);
      // Get users who are members of this organization
      const members = await ctx.db.userOrganization.findMany({
        where: {
          organizationId: input.organizationId,
        },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Since we don't have direct access to User model through UserOrganization,
      // we'll need to get user details separately
      // For now, let's return a mock structure that can be updated when user system is integrated
      return members.map(member => ({
        id: member.userId,
        name: `User ${member.userId.slice(-6)}`, // Temporary display name
        email: `user${member.userId.slice(-6)}@example.com`, // Temporary email
        image: null,
        role: member.role,
      }));
    }),
});
