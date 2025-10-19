import { z } from "zod";
import type { Customer, Prisma } from "@prisma/client";
import {
  createTRPCRouter,
  createPermissionProcedure,
  createAnyPermissionProcedure,
} from "~/server/api/trpc";
import { ProjectStatusSchema } from "../../../../../prisma/generated/zod/index";
import { PERMISSIONS } from "~/lib/rbac";
import { WorkflowEvents } from "~/lib/workflow-dispatcher";

type CustomerPreview = Pick<
  Customer,
  "id" | "firstName" | "lastName" | "email" | "company"
>;

type ProjectWithCustomer = Prisma.ProjectGetPayload<{
  include: {
    customer: {
      select: {
        id: true;
        firstName: true;
        lastName: true;
        email: true;
        company: true;
      };
    };
    _count: {
      select: {
        tasks: true;
      };
    };
  };
}>;

export const projectRouter = createTRPCRouter({
  // Get all projects for an organization
  getAll: createAnyPermissionProcedure([
    PERMISSIONS.PROJECTS_READ,
    PERMISSIONS.PROJECTS_WRITE,
    PERMISSIONS.PROJECTS_ADMIN,
  ])
    .input(
      z.object({
        organizationId: z.string().cuid(),
        customerId: z.string().cuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      await ctx.requireAnyPermission(input.organizationId);

      if (input.customerId) {
        const customerRecord = await ctx.db.customer.findFirst({
          where: {
            id: input.customerId,
            organizationId: input.organizationId,
          },
          select: { id: true },
        });

        if (!customerRecord) {
          throw new Error("Customer not found or access denied");
        }
      }

      return ctx.db.project.findMany({
        where: {
          organizationId: input.organizationId,
          ...(input.customerId ? { customerId: input.customerId } : {}),
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
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              company: true,
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
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              company: true,
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
        customerId: z.string().cuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.requirePermission(input.organizationId);
      let customerDetails: CustomerPreview | null = null;

      if (input.customerId) {
        customerDetails = await ctx.db.customer.findFirst({
          where: {
            id: input.customerId,
            organizationId: input.organizationId,
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            company: true,
          },
        });

        if (!customerDetails) {
          throw new Error("Customer not found or access denied");
        }
      }

      const project: ProjectWithCustomer = await ctx.db.project.create({
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
          customerId: input.customerId,
        },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              company: true,
            },
          },
          _count: {
            select: {
              tasks: true,
            },
          },
        },
      });

      const resolvedCustomer: CustomerPreview | null =
        customerDetails ?? project.customer ?? null;

      // Trigger workflow events
      try {
        await WorkflowEvents.dispatchProjectEvent(
          "created",
          "project",
          input.organizationId,
          {
            id: project.id,
            name: project.name,
            description: project.description,
            startDate: project.startDate,
            endDate: project.endDate,
            status: project.status,
            budget: project.budget,
            currency: project.currency,
            createdById: project.createdById,
            organizationId: project.organizationId,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
            customerId: project.customerId,
            customerName: deriveCustomerName(resolvedCustomer),
            customerEmail: resolvedCustomer?.email ?? undefined,
            customerCompany: resolvedCustomer?.company ?? undefined,
          },
          ctx.user.id
        );
      } catch (workflowError) {
        console.error("Workflow dispatch failed:", workflowError);
        // Don't fail the main operation if workflow fails
      }

      return project;
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
        customerId: z.string().cuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.requirePermission(input.organizationId);
      const { id, organizationId, ...updateData } = input;

      // Load existing for status change detection
      const existing = await ctx.db.project.findFirst({
        where: { id, organizationId },
        select: { status: true },
      });

      let customer: CustomerPreview | null = null;

      if (updateData.customerId) {
        customer = await ctx.db.customer.findFirst({
          where: {
            id: updateData.customerId,
            organizationId,
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            company: true,
          },
        });

        if (!customer) {
          throw new Error("Customer not found or access denied");
        }
      }

      const updated: ProjectWithCustomer = await ctx.db.project.update({
        where: {
          id,
          organizationId,
        },
        data: updateData,
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              company: true,
            },
          },
          _count: {
            select: {
              tasks: true,
            },
          },
        },
      });

      const updatedCustomer: CustomerPreview | null =
        customer ?? updated.customer ?? null;

      // Trigger workflow events
      try {
        const statusChanged =
          existing &&
          updateData.status &&
          existing.status !== updateData.status;
        await WorkflowEvents.dispatchProjectEvent(
          statusChanged ? "status_changed" : "updated",
          "project",
          organizationId,
          {
            id: updated.id,
            name: updated.name,
            description: updated.description,
            startDate: updated.startDate,
            endDate: updated.endDate,
            status: updated.status,
            budget: updated.budget,
            currency: updated.currency,
            organizationId: updated.organizationId,
            updatedAt: updated.updatedAt,
            customerId: updated.customerId,
            customerName: deriveCustomerName(updatedCustomer),
            customerEmail: updatedCustomer?.email ?? undefined,
            customerCompany: updatedCustomer?.company ?? undefined,
            ...(statusChanged ? { previousStatus: existing?.status } : {}),
          },
          ctx.user.id
        );
      } catch (workflowError) {
        console.error("Workflow dispatch failed:", workflowError);
      }

      return updated;
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

function deriveCustomerName(
  customer: CustomerPreview | null
): string | undefined {
  if (!customer) {
    return undefined;
  }

  const first = customer.firstName?.trim();
  const last = customer.lastName?.trim();
  const parts = [first, last].filter((part): part is string => {
    if (!part) {
      return false;
    }
    return part.length > 0;
  });

  if (parts.length > 0) {
    const fullName = parts.join(" ").trim();
    if (fullName.length > 0) {
      return fullName;
    }
  }

  const company = customer.company?.trim();
  if (company && company.length > 0) {
    return company;
  }

  return undefined;
}
