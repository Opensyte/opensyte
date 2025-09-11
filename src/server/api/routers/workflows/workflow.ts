import { z } from "zod";
import {
  createTRPCRouter,
  createPermissionProcedure,
  createAnyPermissionProcedure,
} from "../../trpc";
import { PERMISSIONS } from "~/lib/rbac";
import { db } from "~/server/db";
import { TRPCError } from "@trpc/server";
import type { Prisma } from "@prisma/client";
import { WorkflowStatusSchema } from "../../../../../prisma/generated/zod";

// Simplified workflow router that matches actual Prisma schema
export const workflowRouter = createTRPCRouter({
  // Get workflows
  getWorkflows: createAnyPermissionProcedure([
    PERMISSIONS.WORKFLOWS_READ,
    PERMISSIONS.WORKFLOWS_WRITE,
    PERMISSIONS.WORKFLOWS_ADMIN,
  ])
    .input(
      z.object({
        organizationId: z.string().cuid(),
        status: WorkflowStatusSchema.optional(),
        category: z.string().optional(),
        isTemplate: z.boolean().optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      await ctx.requireAnyPermission(input.organizationId);

      try {
        const where: Prisma.WorkflowWhereInput = {
          organizationId: input.organizationId,
          ...(input.status && { status: input.status }),
          ...(input.category && { category: input.category }),
          ...(input.isTemplate !== undefined && {
            isTemplate: input.isTemplate,
          }),
        };

        const [workflows, total] = await Promise.all([
          db.workflow.findMany({
            where,
            select: {
              id: true,
              name: true,
              description: true,
              version: true,
              status: true,
              isTemplate: true,
              category: true,
              totalExecutions: true,
              successfulExecutions: true,
              failedExecutions: true,
              lastExecutedAt: true,
              createdAt: true,
              updatedAt: true,
              publishedAt: true,
            },
            orderBy: { updatedAt: "desc" },
            skip: input.offset,
            take: input.limit,
          }),
          db.workflow.count({ where }),
        ]);

        return {
          workflows,
          total,
          hasMore: input.offset + workflows.length < total,
        };
      } catch (error) {
        console.error("Failed to fetch workflows:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch workflows",
        });
      }
    }),

  // Get workflow by ID
  getWorkflow: createAnyPermissionProcedure([
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
        const workflow = await db.workflow.findFirst({
          where: {
            id: input.id,
            organizationId: input.organizationId,
          },
          include: {
            triggers: {
              where: { isActive: true },
              orderBy: { createdAt: "asc" },
            },
            nodes: {
              orderBy: [{ executionOrder: "asc" }, { createdAt: "asc" }],
            },
            connections: {
              orderBy: { createdAt: "asc" },
            },
          },
        });

        if (!workflow) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Workflow not found",
          });
        }

        return workflow;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to fetch workflow:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch workflow",
        });
      }
    }),

  // Create workflow
  createWorkflow: createPermissionProcedure(PERMISSIONS.WORKFLOWS_WRITE)
    .input(
      z.object({
        organizationId: z.string().cuid(),
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        category: z.string().optional(),
        isTemplate: z.boolean().default(false),
        canvasData: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);

      try {
        // Check if workflow name already exists
        const existingWorkflow = await db.workflow.findFirst({
          where: {
            organizationId: input.organizationId,
            name: input.name,
          },
        });

        if (existingWorkflow) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A workflow with this name already exists",
          });
        }

        const workflow = await db.workflow.create({
          data: {
            organizationId: input.organizationId,
            name: input.name,
            description: input.description,
            category: input.category,
            isTemplate: input.isTemplate,
            canvasData: input.canvasData as Prisma.InputJsonValue,
            status: "DRAFT",
            createdById: ctx.user.id,
          },
          include: {
            triggers: true,
            nodes: true,
            connections: true,
          },
        });

        return workflow;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to create workflow:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create workflow",
        });
      }
    }),

  // Update workflow
  updateWorkflow: createPermissionProcedure(PERMISSIONS.WORKFLOWS_WRITE)
    .input(
      z.object({
        id: z.string().cuid(),
        organizationId: z.string().cuid(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        canvasData: z.record(z.unknown()).optional(),
        status: z
          .enum(["DRAFT", "INACTIVE", "ACTIVE", "PAUSED", "ARCHIVED", "ERROR"])
          .optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);

      const { id, organizationId, ...updateData } = input;

      try {
        // Verify workflow exists and belongs to organization
        const existingWorkflow = await db.workflow.findFirst({
          where: {
            id,
            organizationId,
          },
        });

        if (!existingWorkflow) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Workflow not found",
          });
        }

        // Check name uniqueness if name is being updated
        if (updateData.name && updateData.name !== existingWorkflow.name) {
          const nameConflict = await db.workflow.findFirst({
            where: {
              organizationId,
              name: updateData.name,
              id: { not: id },
            },
          });

          if (nameConflict) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "A workflow with this name already exists",
            });
          }
        }

        const updatedWorkflow = await db.workflow.update({
          where: { id },
          data: {
            ...(updateData.name && { name: updateData.name }),
            ...(updateData.description !== undefined && {
              description: updateData.description,
            }),
            ...(updateData.category && { category: updateData.category }),
            ...(updateData.canvasData && {
              canvasData: updateData.canvasData as Prisma.InputJsonValue,
            }),
            ...(updateData.status && {
              status: updateData.status,
              ...(updateData.status === "ACTIVE" &&
                !existingWorkflow.publishedAt && {
                  publishedAt: new Date(),
                  publishedById: ctx.user.id,
                }),
            }),
            updatedById: ctx.user.id,
          },
          include: {
            triggers: true,
            nodes: true,
            connections: true,
          },
        });

        return updatedWorkflow;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to update workflow:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update workflow",
        });
      }
    }),

  // Delete workflow
  deleteWorkflow: createPermissionProcedure(PERMISSIONS.WORKFLOWS_ADMIN)
    .input(
      z.object({
        id: z.string().cuid(),
        organizationId: z.string().cuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);

      try {
        // Verify workflow exists and belongs to organization
        const existingWorkflow = await db.workflow.findFirst({
          where: {
            id: input.id,
            organizationId: input.organizationId,
          },
        });

        if (!existingWorkflow) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Workflow not found",
          });
        }

        // Check if workflow has active executions
        const activeExecutions = await db.workflowExecution.count({
          where: {
            workflowId: input.id,
            status: {
              in: ["PENDING", "RUNNING", "PAUSED"],
            },
          },
        });

        if (activeExecutions > 0) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Cannot delete workflow with active executions",
          });
        }

        await db.workflow.delete({
          where: { id: input.id },
        });

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to delete workflow:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete workflow",
        });
      }
    }),

  // Archive workflow
  archiveWorkflow: createPermissionProcedure(PERMISSIONS.WORKFLOWS_ADMIN)
    .input(
      z.object({
        id: z.string().cuid(),
        organizationId: z.string().cuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);

      try {
        const workflow = await db.workflow.update({
          where: {
            id: input.id,
            organizationId: input.organizationId,
          },
          data: {
            status: "ARCHIVED",
            archivedAt: new Date(),
            updatedById: ctx.user.id,
          },
        });

        return workflow;
      } catch (error) {
        console.error("Failed to archive workflow:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to archive workflow",
        });
      }
    }),
});
