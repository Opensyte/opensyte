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
import { WorkflowTriggerTypeSchema } from "../../../../../prisma/generated/zod";

// Simplified triggers router that matches actual Prisma schema
export const triggersRouter = createTRPCRouter({
  // Get workflow triggers
  getTriggers: createAnyPermissionProcedure([
    PERMISSIONS.WORKFLOWS_READ,
    PERMISSIONS.WORKFLOWS_WRITE,
    PERMISSIONS.WORKFLOWS_ADMIN,
  ])
    .input(
      z.object({
        workflowId: z.string().cuid(),
        organizationId: z.string().cuid(),
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

        const triggers = await db.workflowTrigger.findMany({
          where: {
            workflowId: input.workflowId,
          },
          orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
        });

        return triggers;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to fetch triggers:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch triggers",
        });
      }
    }),

  // Create trigger
  createTrigger: createPermissionProcedure(PERMISSIONS.WORKFLOWS_WRITE)
    .input(
      z.object({
        workflowId: z.string().cuid(),
        organizationId: z.string().cuid(),
        name: z.string().min(1).max(100),
        type: WorkflowTriggerTypeSchema,
        module: z.string().min(1),
        eventType: z.string().min(1),
        entityType: z.string().optional(),
        conditions: z.record(z.unknown()).optional(),
        delay: z.number().min(0).optional(),
        isActive: z.boolean().default(true),
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

        const trigger = await db.workflowTrigger.create({
          data: {
            workflowId: input.workflowId,
            name: input.name,
            type: input.type,
            module: input.module,
            eventType: input.eventType,
            entityType: input.entityType,
            conditions: input.conditions as Prisma.InputJsonValue,
            delay: input.delay,
            isActive: input.isActive,
          },
        });

        return trigger;
      } catch (error) {
        console.error("Failed to create trigger:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create trigger",
        });
      }
    }),

  // Update trigger
  updateTrigger: createPermissionProcedure(PERMISSIONS.WORKFLOWS_WRITE)
    .input(
      z.object({
        id: z.string().cuid(),
        organizationId: z.string().cuid(),
        name: z.string().min(1).max(100).optional(),
        module: z.string().min(1).optional(),
        eventType: z.string().min(1).optional(),
        entityType: z.string().optional(),
        conditions: z.record(z.unknown()).optional(),
        delay: z.number().min(0).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);

      const { id, organizationId, ...updateData } = input;

      try {
        // Verify trigger exists and belongs to organization
        const existingTrigger = await db.workflowTrigger.findFirst({
          where: {
            id,
            workflow: {
              organizationId,
            },
          },
        });

        if (!existingTrigger) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Trigger not found",
          });
        }

        const updatedTrigger = await db.workflowTrigger.update({
          where: { id },
          data: {
            ...(updateData.name && { name: updateData.name }),
            ...(updateData.module && { module: updateData.module }),
            ...(updateData.eventType && { eventType: updateData.eventType }),
            ...(updateData.entityType !== undefined && {
              entityType: updateData.entityType,
            }),
            ...(updateData.conditions && {
              conditions: updateData.conditions as Prisma.InputJsonValue,
            }),
            ...(updateData.delay !== undefined && { delay: updateData.delay }),
            ...(updateData.isActive !== undefined && {
              isActive: updateData.isActive,
            }),
          },
        });

        return updatedTrigger;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to update trigger:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update trigger",
        });
      }
    }),

  // Delete trigger
  deleteTrigger: createPermissionProcedure(PERMISSIONS.WORKFLOWS_WRITE)
    .input(
      z.object({
        id: z.string().cuid(),
        organizationId: z.string().cuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);

      try {
        // Verify trigger exists and belongs to organization
        const existingTrigger = await db.workflowTrigger.findFirst({
          where: {
            id: input.id,
            workflow: {
              organizationId: input.organizationId,
            },
          },
        });

        if (!existingTrigger) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Trigger not found",
          });
        }

        await db.workflowTrigger.delete({
          where: { id: input.id },
        });

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to delete trigger:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete trigger",
        });
      }
    }),
});
