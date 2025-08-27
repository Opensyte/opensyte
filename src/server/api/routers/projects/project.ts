import { z } from "zod";
import {
  createTRPCRouter,
  createPermissionProcedure,
  createAnyPermissionProcedure,
} from "~/server/api/trpc";
import { ProjectStatusSchema } from "../../../../../prisma/generated/zod/index";
import { PERMISSIONS } from "~/lib/rbac";

export const projectRouter = createTRPCRouter({
  // Get all projects for an organization
  getAll: createAnyPermissionProcedure([
    PERMISSIONS.PROJECTS_READ,
    PERMISSIONS.PROJECTS_WRITE,
    PERMISSIONS.PROJECTS_ADMIN,
  ])
    .input(z.object({ organizationId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      await ctx.requireAnyPermission(input.organizationId);
      return ctx.db.project.findMany({
        where: {
          organizationId: input.organizationId,
        },
        orderBy: {
          createdAt: "desc",
        },
        include: {
          _count: {
            select: {
              tasks: true,
            },
          },
        },
      });
    }),

  // Get project by ID
  getById: createAnyPermissionProcedure([
    PERMISSIONS.PROJECTS_READ,
    PERMISSIONS.PROJECTS_WRITE,
    PERMISSIONS.PROJECTS_ADMIN,
  ])
    .input(
      z.object({
        id: z.string().cuid(),
        organizationId: z.string().cuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      await ctx.requireAnyPermission(input.organizationId);
      return ctx.db.project.findFirst({
        where: {
          id: input.id,
          organizationId: input.organizationId,
        },
        include: {
          tasks: {
            orderBy: {
              createdAt: "desc",
            },
          },
          resources: true,
          _count: {
            select: {
              tasks: true,
            },
          },
        },
      });
    }),

  // Create new project
  create: createPermissionProcedure(PERMISSIONS.PROJECTS_WRITE)
    .input(
      z.object({
        organizationId: z.string().cuid(),
        name: z.string().min(1, "Project name is required"),
        description: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        status: ProjectStatusSchema.default("PLANNED"),
        budget: z.number().min(0).optional(),
        currency: z.string().default("USD"),
        createdById: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.requirePermission(input.organizationId);
      return ctx.db.project.create({
        data: {
          organizationId: input.organizationId,
          name: input.name,
          description: input.description,
          startDate: input.startDate,
          endDate: input.endDate,
          status: input.status,
          budget: input.budget,
          currency: input.currency,
          createdById: input.createdById,
        },
        include: {
          _count: {
            select: {
              tasks: true,
            },
          },
        },
      });
    }),

  // Update project
  update: createPermissionProcedure(PERMISSIONS.PROJECTS_WRITE)
    .input(
      z.object({
        id: z.string().cuid(),
        organizationId: z.string().cuid(),
        name: z.string().min(1, "Project name is required").optional(),
        description: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        status: ProjectStatusSchema.optional(),
        budget: z.number().min(0).optional(),
        currency: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.requirePermission(input.organizationId);
      const { id, organizationId, ...updateData } = input;

      return ctx.db.project.update({
        where: {
          id,
          organizationId,
        },
        data: updateData,
        include: {
          _count: {
            select: {
              tasks: true,
            },
          },
        },
      });
    }),

  // Delete project
  delete: createPermissionProcedure(PERMISSIONS.PROJECTS_WRITE)
    .input(
      z.object({
        id: z.string().cuid(),
        organizationId: z.string().cuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.requirePermission(input.organizationId);
      return ctx.db.project.delete({
        where: {
          id: input.id,
          organizationId: input.organizationId,
        },
      });
    }),

  // Get project statistics
  getStats: createAnyPermissionProcedure([
    PERMISSIONS.PROJECTS_READ,
    PERMISSIONS.PROJECTS_WRITE,
    PERMISSIONS.PROJECTS_ADMIN,
  ])
    .input(z.object({ organizationId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      await ctx.requireAnyPermission(input.organizationId);
      const projects = await ctx.db.project.findMany({
        where: {
          organizationId: input.organizationId,
        },
        include: {
          tasks: {
            select: {
              status: true,
            },
          },
        },
      });

      const totalProjects = projects.length;
      const activeProjects = projects.filter(
        p => p.status === "IN_PROGRESS"
      ).length;
      const completedProjects = projects.filter(
        p => p.status === "COMPLETED"
      ).length;
      const totalTasks = projects.reduce((acc, p) => acc + p.tasks.length, 0);
      const completedTasks = projects.reduce(
        (acc, p) => acc + p.tasks.filter(t => t.status === "DONE").length,
        0
      );

      return {
        totalProjects,
        activeProjects,
        completedProjects,
        totalTasks,
        completedTasks,
        completionRate:
          totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      };
    }),
});
