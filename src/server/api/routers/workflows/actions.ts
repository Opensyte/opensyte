import { z } from "zod";
import {
  createTRPCRouter,
  createPermissionProcedure,
  createAnyPermissionProcedure,
} from "../../trpc";
import { PERMISSIONS } from "~/lib/rbac";
import { db } from "~/server/db";
import { TRPCError } from "@trpc/server";
import {
  ActionTemplateCategorySchema,
  WorkflowNodeTypeSchema,
  InputJsonValueSchema,
} from "../../../../../prisma/generated/zod";
import type { Prisma } from "@prisma/client";

// Enhanced action templates router that matches actual Prisma schema
export const actionsRouter = createTRPCRouter({
  // Get action templates
  getActionTemplates: createAnyPermissionProcedure([
    PERMISSIONS.WORKFLOWS_READ,
    PERMISSIONS.WORKFLOWS_WRITE,
    PERMISSIONS.WORKFLOWS_ADMIN,
  ])
    .input(
      z.object({
        organizationId: z.string().cuid(),
        category: ActionTemplateCategorySchema.optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      await ctx.requireAnyPermission(input.organizationId);

      try {
        const templates = await db.actionTemplate.findMany({
          where: {
            OR: [{ organizationId: input.organizationId }, { isPublic: true }],
            ...(input.category && { category: input.category }),
          },
          select: {
            id: true,
            name: true,
            description: true,
            category: true,
            type: true,
            isActive: true,
          },
        });

        return templates;
      } catch (error) {
        console.error("Failed to fetch action templates:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch action templates",
        });
      }
    }),

  // Get single action template with full details
  getActionTemplate: createAnyPermissionProcedure([
    PERMISSIONS.WORKFLOWS_READ,
    PERMISSIONS.WORKFLOWS_WRITE,
    PERMISSIONS.WORKFLOWS_ADMIN,
  ])
    .input(
      z.object({
        templateId: z.string().cuid(),
        organizationId: z.string().cuid(),
      })
    )
    .query(async ({ input, ctx }) => {
      await ctx.requireAnyPermission(input.organizationId);

      try {
        const template = await db.actionTemplate.findFirst({
          where: {
            id: input.templateId,
            OR: [
              { organizationId: input.organizationId },
              { isPublic: true },
            ],
          },
          include: {
            versions: {
              where: { isActive: true },
              orderBy: { createdAt: "desc" },
              take: 5,
            },
          },
        });

        if (!template) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Action template not found",
          });
        }

        return template;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to fetch action template:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch action template",
        });
      }
    }),

  // Create custom action template
  createActionTemplate: createPermissionProcedure(PERMISSIONS.WORKFLOWS_ADMIN)
    .input(
      z.object({
        organizationId: z.string().cuid(),
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        category: ActionTemplateCategorySchema,
        type: WorkflowNodeTypeSchema,
        template: InputJsonValueSchema,
        defaultConfig: InputJsonValueSchema.optional(),
        schema: InputJsonValueSchema.optional(),
        version: z.string().default("1.0.0"),
        isPublic: z.boolean().default(false),
        requiredVariables: InputJsonValueSchema.optional(),
        optionalVariables: InputJsonValueSchema.optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);

      try {
        // Check if template name already exists in organization
        const existingTemplate = await db.actionTemplate.findFirst({
          where: {
            organizationId: input.organizationId,
            name: input.name,
          },
        });

        if (existingTemplate) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "An action template with this name already exists",
          });
        }

        const template = await db.$transaction(async (tx) => {
          // Create the template
          const newTemplate = await tx.actionTemplate.create({
            data: {
              organizationId: input.organizationId,
              name: input.name,
              description: input.description,
              category: input.category,
              type: input.type,
              template: input.template,
              defaultConfig: input.defaultConfig!,
              schema: input.schema!,
              version: input.version,
              isPublic: input.isPublic,
              requiredVariables: input.requiredVariables!,
              optionalVariables: input.optionalVariables!,
              createdById: ctx.user.id,
            },
          });

          // Create initial version
          await tx.actionTemplateVersion.create({
            data: {
              templateId: newTemplate.id,
              version: input.version,
              template: input.template,
              changes: "Initial version",
              isActive: true,
              createdById: ctx.user.id,
            },
          });

          return newTemplate;
        });

        return template;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to create action template:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create action template",
        });
      }
    }),

  // Update action template
  updateActionTemplate: createPermissionProcedure(PERMISSIONS.WORKFLOWS_ADMIN)
    .input(
      z.object({
        templateId: z.string().cuid(),
        organizationId: z.string().cuid(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().optional(),
        template: InputJsonValueSchema.optional(),
        defaultConfig: InputJsonValueSchema.optional(),
        schema: InputJsonValueSchema.optional(),
        isPublic: z.boolean().optional(),
        isActive: z.boolean().optional(),
        requiredVariables: InputJsonValueSchema.optional(),
        optionalVariables: InputJsonValueSchema.optional(),
        versionNotes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);

      const { templateId, organizationId, versionNotes, ...updateData } = input;

      try {
        // Verify template exists and belongs to organization
        const existingTemplate = await db.actionTemplate.findFirst({
          where: {
            id: templateId,
            organizationId,
          },
        });

        if (!existingTemplate) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Action template not found",
          });
        }

        // Check name uniqueness if name is being updated
        if (updateData.name && updateData.name !== existingTemplate.name) {
          const nameConflict = await db.actionTemplate.findFirst({
            where: {
              organizationId,
              name: updateData.name,
              id: { not: templateId },
            },
          });

          if (nameConflict) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "An action template with this name already exists",
            });
          }
        }

        const updatedTemplate = await db.$transaction(async (tx) => {
          // Update the template
          const template = await tx.actionTemplate.update({
            where: { id: templateId },
            data: {
              ...(updateData.name && { name: updateData.name }),
              ...(updateData.description !== undefined && {
                description: updateData.description,
              }),
              ...(updateData.template && {
                template: updateData.template as Prisma.InputJsonValue,
              }),
              ...(updateData.defaultConfig && {
                defaultConfig: updateData.defaultConfig as Prisma.InputJsonValue,
              }),
              ...(updateData.schema && {
                schema: updateData.schema as Prisma.InputJsonValue,
              }),
              ...(updateData.isPublic !== undefined && {
                isPublic: updateData.isPublic,
              }),
              ...(updateData.isActive !== undefined && {
                isActive: updateData.isActive,
              }),
              ...(updateData.requiredVariables && {
                requiredVariables: updateData.requiredVariables as Prisma.InputJsonValue,
              }),
              ...(updateData.optionalVariables && {
                optionalVariables: updateData.optionalVariables as Prisma.InputJsonValue,
              }),
            },
          });

          // Create new version if template content changed
          if (updateData.template) {
            // Deactivate old versions
            await tx.actionTemplateVersion.updateMany({
              where: { templateId, isActive: true },
              data: { isActive: false },
            });

            // Create new version
            const versionNumber = `${existingTemplate.version.split('.').map((n, i) => i === 2 ? String(parseInt(n) + 1) : n).join('.')}`;
            
            await tx.actionTemplateVersion.create({
              data: {
                templateId,
                version: versionNumber,
                template: updateData.template as Prisma.InputJsonValue,
                changes: versionNotes ?? "Template updated",
                isActive: true,
                createdById: ctx.user.id,
              },
            });

            // Update template version
            await tx.actionTemplate.update({
              where: { id: templateId },
              data: { version: versionNumber },
            });
          }

          return template;
        });

        return updatedTemplate;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to update action template:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update action template",
        });
      }
    }),

  // Delete action template
  deleteActionTemplate: createPermissionProcedure(PERMISSIONS.WORKFLOWS_ADMIN)
    .input(
      z.object({
        templateId: z.string().cuid(),
        organizationId: z.string().cuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);

      try {
        // Verify template exists and belongs to organization
        const existingTemplate = await db.actionTemplate.findFirst({
          where: {
            id: input.templateId,
            organizationId: input.organizationId,
          },
        });

        if (!existingTemplate) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Action template not found",
          });
        }

        // Check if template is being used
        // This would require checking if any workflow nodes reference this template
        // For now, we'll allow deletion but in production you might want to add this check

        await db.actionTemplate.delete({
          where: { id: input.templateId },
        });

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to delete action template:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete action template",
        });
      }
    }),

  // Get template usage statistics
  getTemplateUsageStats: createAnyPermissionProcedure([
    PERMISSIONS.WORKFLOWS_READ,
    PERMISSIONS.WORKFLOWS_WRITE,
    PERMISSIONS.WORKFLOWS_ADMIN,
  ])
    .input(
      z.object({
        templateId: z.string().cuid(),
        organizationId: z.string().cuid(),
      })
    )
    .query(async ({ input, ctx }) => {
      await ctx.requireAnyPermission(input.organizationId);

      try {
        // Verify template exists and belongs to organization or is public
        const template = await db.actionTemplate.findFirst({
          where: {
            id: input.templateId,
            OR: [
              { organizationId: input.organizationId },
              { isPublic: true },
            ],
          },
        });

        if (!template) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Action template not found",
          });
        }

        // In a real implementation, you would count actual usage
        // This is a simplified version
        return {
          templateId: input.templateId,
          templateName: template.name,
          usageCount: template.usageCount,
          isActive: template.isActive,
          isPublic: template.isPublic,
          lastUsed: null, // Would need to track this in actual usage
          version: template.version,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to fetch template usage stats:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch template usage stats",
        });
      }
    }),
});
