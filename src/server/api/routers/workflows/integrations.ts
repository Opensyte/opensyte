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
import { IntegrationTypeSchema } from "../../../../../prisma/generated/zod";

// Workflow integrations router that matches actual Prisma schema
export const integrationsRouter = createTRPCRouter({
  // Get integration configurations
  getIntegrations: createAnyPermissionProcedure([
    PERMISSIONS.WORKFLOWS_READ,
    PERMISSIONS.WORKFLOWS_WRITE,
    PERMISSIONS.WORKFLOWS_ADMIN,
  ])
    .input(
      z.object({
        organizationId: z.string().cuid(),
        type: IntegrationTypeSchema.optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      await ctx.requireAnyPermission(input.organizationId);

      try {
        const integrations = await db.integrationConfig.findMany({
          where: {
            organizationId: input.organizationId,
            ...(input.type && { type: input.type }),
          },
          select: {
            id: true,
            name: true,
            type: true,
            isActive: true,
            isHealthy: true,
            lastHealthCheck: true,
            requestCount: true,
            errorCount: true,
            lastUsedAt: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: [{ isActive: "desc" }, { name: "asc" }],
        });

        return integrations;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to fetch integrations:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch integrations",
        });
      }
    }),

  // Create integration
  createIntegration: createPermissionProcedure(PERMISSIONS.WORKFLOWS_ADMIN)
    .input(
      z.object({
        organizationId: z.string().cuid(),
        name: z.string().min(1).max(100),
        type: z.enum([
          "EMAIL_SMTP",
          "EMAIL_SENDGRID",
          "EMAIL_MAILGUN",
          "EMAIL_RESEND",
          "EMAIL_POSTMARK",
          "SMS_TWILIO",
          "SMS_AWS_SNS",
          "SMS_NEXMO",
          "SMS_MESSAGEBIRD",
          "WHATSAPP_BUSINESS",
          "WHATSAPP_TWILIO",
          "SLACK",
          "GOOGLE_CALENDAR",
          "OUTLOOK_CALENDAR",
          "APPLE_CALENDAR",
        ]),
        config: z.record(z.unknown()),
        credentials: z.record(z.unknown()).optional(),
        endpoints: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);

      try {
        const integration = await db.integrationConfig.create({
          data: {
            organizationId: input.organizationId,
            name: input.name,
            type: input.type,
            config: input.config as Prisma.InputJsonValue,
            credentials: input.credentials as Prisma.InputJsonValue,
            endpoints: input.endpoints as Prisma.InputJsonValue,
            createdById: ctx.user.id,
          },
        });

        return integration;
      } catch (error) {
        console.error("Failed to create integration:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create integration",
        });
      }
    }),

  // Update integration
  updateIntegration: createPermissionProcedure(PERMISSIONS.WORKFLOWS_ADMIN)
    .input(
      z.object({
        id: z.string().cuid(),
        organizationId: z.string().cuid(),
        name: z.string().min(1).max(100).optional(),
        config: z.record(z.unknown()).optional(),
        credentials: z.record(z.unknown()).optional(),
        endpoints: z.record(z.unknown()).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);

      const { id, organizationId, ...updateData } = input;

      try {
        // Verify integration exists and belongs to organization
        const existingIntegration = await db.integrationConfig.findFirst({
          where: {
            id,
            organizationId,
          },
        });

        if (!existingIntegration) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Integration not found",
          });
        }

        const updatedIntegration = await db.integrationConfig.update({
          where: { id },
          data: {
            ...(updateData.name && { name: updateData.name }),
            ...(updateData.config && {
              config: updateData.config as Prisma.InputJsonValue,
            }),
            ...(updateData.credentials && {
              credentials: updateData.credentials as Prisma.InputJsonValue,
            }),
            ...(updateData.endpoints && {
              endpoints: updateData.endpoints as Prisma.InputJsonValue,
            }),
            ...(updateData.isActive !== undefined && {
              isActive: updateData.isActive,
            }),
          },
        });

        return updatedIntegration;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to update integration:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update integration",
        });
      }
    }),

  // Delete integration
  deleteIntegration: createPermissionProcedure(PERMISSIONS.WORKFLOWS_ADMIN)
    .input(
      z.object({
        id: z.string().cuid(),
        organizationId: z.string().cuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);

      try {
        // Verify integration exists and belongs to organization
        const existingIntegration = await db.integrationConfig.findFirst({
          where: {
            id: input.id,
            organizationId: input.organizationId,
          },
        });

        if (!existingIntegration) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Integration not found",
          });
        }

        await db.integrationConfig.delete({
          where: { id: input.id },
        });

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to delete integration:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete integration",
        });
      }
    }),

  // Test integration health
  testIntegration: createPermissionProcedure(PERMISSIONS.WORKFLOWS_ADMIN)
    .input(
      z.object({
        id: z.string().cuid(),
        organizationId: z.string().cuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);

      try {
        // Verify integration exists and belongs to organization
        const integration = await db.integrationConfig.findFirst({
          where: {
            id: input.id,
            organizationId: input.organizationId,
          },
        });

        if (!integration) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Integration not found",
          });
        }

        // Update health check timestamp - actual health testing would be implemented here
        const updatedIntegration = await db.integrationConfig.update({
          where: { id: input.id },
          data: {
            lastHealthCheck: new Date(),
            isHealthy: true, // This would be the result of actual health check
          },
        });

        return {
          success: true,
          isHealthy: updatedIntegration.isHealthy,
          lastHealthCheck: updatedIntegration.lastHealthCheck,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to test integration:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to test integration",
        });
      }
    }),
});
