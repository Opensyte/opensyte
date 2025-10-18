import { z } from "zod";
import {
  createTRPCRouter,
  createPermissionProcedure,
  createAnyPermissionProcedure,
} from "~/server/api/trpc";
import type { Prisma } from "@prisma/client";
import { db } from "~/server/db";
import { PERMISSIONS } from "~/lib/rbac";

import {
  InteractionTypeSchema,
  InteractionMediumSchema,
} from "../../../../../prisma/generated/zod";

const CustomerInteractionUpdateInputSchema =
  z.custom<Prisma.CustomerInteractionUpdateInput>();

export const interactionsRouter = createTRPCRouter({
  // Fetch all interactions for an organization
  getByOrganization: createAnyPermissionProcedure([
    PERMISSIONS.CRM_READ,
    PERMISSIONS.CRM_WRITE,
    PERMISSIONS.CRM_ADMIN,
  ])
    .input(z.object({ organizationId: z.string().cuid() }))
    .query(async ({ input, ctx }) => {
      try {
        // Verify user has permission to read from this organization
        await ctx.requireAnyPermission(input.organizationId);

        return db.customerInteraction.findMany({
          where: { customer: { organizationId: input.organizationId } },
          orderBy: { createdAt: "desc" },
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                company: true,
                email: true,
              },
            },
          },
        });
      } catch (error) {
        console.error("Failed to fetch interactions:", error);
        throw new Error("Failed to fetch interactions");
      }
    }),

  // Fetch a single interaction by ID
  getById: createAnyPermissionProcedure([
    PERMISSIONS.CRM_READ,
    PERMISSIONS.CRM_WRITE,
    PERMISSIONS.CRM_ADMIN,
  ])
    .input(
      z.object({
        id: z.string().cuid(),
        organizationId: z.string().cuid(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        // Verify user has permission to read from this organization
        await ctx.requireAnyPermission(input.organizationId);

        const interaction = await db.customerInteraction.findFirst({
          where: {
            id: input.id,
            customer: { organizationId: input.organizationId },
          },
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                company: true,
                email: true,
              },
            },
          },
        });

        if (!interaction) {
          throw new Error("Interaction not found or access denied");
        }

        return interaction;
      } catch (error) {
        console.error("Failed to fetch interaction:", error);
        throw new Error("Failed to fetch interaction");
      }
    }),

  // Create a new interaction
  createInteraction: createPermissionProcedure(PERMISSIONS.CRM_WRITE)
    .input(
      z.object({
        organizationId: z.string().cuid(),
        customerId: z.string().cuid(),
        type: InteractionTypeSchema,
        medium: InteractionMediumSchema,
        subject: z.string().optional(),
        content: z.string().optional(),
        scheduledAt: z.date().optional(),
        completedAt: z.date().optional(),
        outcome: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Verify user has permission to write to this organization
        await ctx.requirePermission(input.organizationId);

        // Verify customer belongs to the organization
        const customer = await db.customer.findFirst({
          where: {
            id: input.customerId,
            organizationId: input.organizationId,
          },
        });

        if (!customer) {
          throw new Error("Customer not found or access denied");
        }

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { organizationId, scheduledAt, completedAt, ...rest } = input;

        return db.customerInteraction.create({
          data: {
            ...rest,
            scheduledAt,
            completedAt,
          },
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                company: true,
                email: true,
              },
            },
          },
        });
      } catch (error) {
        console.error("Failed to create interaction:", error);
        throw new Error("Failed to create interaction");
      }
    }),

  // Update an existing interaction
  updateInteraction: createPermissionProcedure(PERMISSIONS.CRM_WRITE)
    .input(
      z.object({
        id: z.string().cuid(),
        organizationId: z.string().cuid(),
        data: CustomerInteractionUpdateInputSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Verify user has permission to write to this organization
        await ctx.requirePermission(input.organizationId);

        // Verify interaction belongs to the organization
        const existingInteraction = await db.customerInteraction.findFirst({
          where: {
            id: input.id,
            customer: { organizationId: input.organizationId },
          },
        });

        if (!existingInteraction) {
          throw new Error("Interaction not found or access denied");
        }

        return db.customerInteraction.update({
          where: { id: input.id },
          data: input.data,
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                company: true,
                email: true,
              },
            },
          },
        });
      } catch (error) {
        console.error("Failed to update interaction:", error);
        throw new Error("Failed to update interaction");
      }
    }),

  // Delete an interaction
  deleteInteraction: createPermissionProcedure(PERMISSIONS.CRM_WRITE)
    .input(
      z.object({
        id: z.string().cuid(),
        organizationId: z.string().cuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Verify user has permission to write to this organization
        await ctx.requirePermission(input.organizationId);

        // Verify interaction belongs to the organization
        const existingInteraction = await db.customerInteraction.findFirst({
          where: {
            id: input.id,
            customer: { organizationId: input.organizationId },
          },
        });

        if (!existingInteraction) {
          throw new Error("Interaction not found or access denied");
        }

        await db.customerInteraction.delete({
          where: { id: input.id },
        });

        return { success: true };
      } catch (error) {
        console.error("Failed to delete interaction:", error);
        throw new Error("Failed to delete interaction");
      }
    }),
});
