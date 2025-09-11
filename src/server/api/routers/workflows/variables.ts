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
import {
  VariableDataTypeSchema,
  VariableScopeSchema,
} from "../../../../../prisma/generated/zod";

// Workflow variables router that matches actual Prisma schema
export const variablesRouter = createTRPCRouter({
  // Get variable definitions
  getVariables: createAnyPermissionProcedure([
    PERMISSIONS.WORKFLOWS_READ,
    PERMISSIONS.WORKFLOWS_WRITE,
    PERMISSIONS.WORKFLOWS_ADMIN,
  ])
    .input(
      z.object({
        organizationId: z.string().cuid(),
        scope: VariableScopeSchema.optional(),
        category: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      await ctx.requireAnyPermission(input.organizationId);

      try {
        const variables = await db.variableDefinition.findMany({
          where: {
            organizationId: input.organizationId,
            ...(input.scope && { scope: input.scope }),
            ...(input.category && { category: input.category }),
          },
          select: {
            id: true,
            name: true,
            displayName: true,
            dataType: true,
            scope: true,
            category: true,
            defaultValue: true,
            isRequired: true,
            isCustom: true,
            description: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: [{ scope: "asc" }, { category: "asc" }, { name: "asc" }],
        });

        return variables;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to fetch variables:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch variables",
        });
      }
    }),

  // Create variable definition
  createVariable: createPermissionProcedure(PERMISSIONS.WORKFLOWS_WRITE)
    .input(
      z.object({
        organizationId: z.string().cuid(),
        name: z.string().min(1).max(100),
        displayName: z.string().min(1).max(200),
        description: z.string().optional(),
        category: z.string().min(1),
        dataType: VariableDataTypeSchema,
        scope: VariableScopeSchema.default("ORGANIZATION"),
        moduleScope: z.string().optional(),
        defaultValue: z.string().optional(),
        validation: z.record(z.unknown()).optional(),
        formatting: z.record(z.unknown()).optional(),
        isRequired: z.boolean().default(false),
        isCustom: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);

      try {
        const variable = await db.variableDefinition.create({
          data: {
            organizationId: input.organizationId,
            name: input.name,
            displayName: input.displayName,
            description: input.description,
            category: input.category,
            dataType: input.dataType,
            scope: input.scope,
            moduleScope: input.moduleScope,
            defaultValue: input.defaultValue,
            validation: input.validation as Prisma.InputJsonValue,
            formatting: input.formatting as Prisma.InputJsonValue,
            isRequired: input.isRequired,
            isCustom: input.isCustom,
            createdById: ctx.user.id,
          },
        });

        return variable;
      } catch (error) {
        console.error("Failed to create variable:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create variable",
        });
      }
    }),

  // Update variable definition
  updateVariable: createPermissionProcedure(PERMISSIONS.WORKFLOWS_WRITE)
    .input(
      z.object({
        id: z.string().cuid(),
        organizationId: z.string().cuid(),
        displayName: z.string().min(1).max(200).optional(),
        description: z.string().optional(),
        category: z.string().min(1).optional(),
        defaultValue: z.string().optional(),
        validation: z.record(z.unknown()).optional(),
        formatting: z.record(z.unknown()).optional(),
        isRequired: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);

      const { id, organizationId, ...updateData } = input;

      try {
        // Verify variable exists and belongs to organization
        const existingVariable = await db.variableDefinition.findFirst({
          where: {
            id,
            organizationId,
          },
        });

        if (!existingVariable) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Variable not found",
          });
        }

        const updatedVariable = await db.variableDefinition.update({
          where: { id },
          data: {
            ...(updateData.displayName && {
              displayName: updateData.displayName,
            }),
            ...(updateData.description !== undefined && {
              description: updateData.description,
            }),
            ...(updateData.category && { category: updateData.category }),
            ...(updateData.defaultValue !== undefined && {
              defaultValue: updateData.defaultValue,
            }),
            ...(updateData.validation && {
              validation: updateData.validation as Prisma.InputJsonValue,
            }),
            ...(updateData.formatting && {
              formatting: updateData.formatting as Prisma.InputJsonValue,
            }),
            ...(updateData.isRequired !== undefined && {
              isRequired: updateData.isRequired,
            }),
          },
        });

        return updatedVariable;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to update variable:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update variable",
        });
      }
    }),

  // Delete variable definition
  deleteVariable: createPermissionProcedure(PERMISSIONS.WORKFLOWS_WRITE)
    .input(
      z.object({
        id: z.string().cuid(),
        organizationId: z.string().cuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);

      try {
        // Verify variable exists and belongs to organization
        const existingVariable = await db.variableDefinition.findFirst({
          where: {
            id: input.id,
            organizationId: input.organizationId,
          },
        });

        if (!existingVariable) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Variable not found",
          });
        }

        await db.variableDefinition.delete({
          where: { id: input.id },
        });

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to delete variable:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete variable",
        });
      }
    }),
});
