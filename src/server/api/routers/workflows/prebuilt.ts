import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { createAnyPermissionProcedure, createTRPCRouter } from "../../trpc";
import { PERMISSIONS } from "~/lib/rbac";
import {
  PREBUILT_WORKFLOWS,
  PREBUILT_WORKFLOW_KEYS,
  type PrebuiltWorkflowKey,
} from "~/workflows/prebuilt/definitions";
import type { ExtendedUserOrganization } from "~/types/custom-roles";
import {
  hasAllPermissions,
  hasAnyPermission as customHasAnyPermission,
} from "~/lib/custom-rbac";
import { SystemTemplateService } from "~/lib/system-templates";
import type { Prisma } from "@prisma/client";

function getDefinitionByKey(key: string) {
  return PREBUILT_WORKFLOWS.find(workflow => workflow.key === key);
}

function summarizeEmail(body: string) {
  const trimmed = body.trim();
  if (trimmed.length === 0) {
    return "";
  }
  const normalized = trimmed.replace(/\s+/g, " ");
  return normalized.length > 140
    ? `${normalized.slice(0, 137)}...`
    : normalized;
}

function stripHtml(content: string) {
  return content
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function createEmailPreview(subject: string, body: string) {
  const plain = stripHtml(body);
  const combined = `${subject} ${plain}`.trim();
  return summarizeEmail(combined);
}

function getPermissionLabel(permission: string) {
  const [module, action] = permission.split(":");
  if (!module || !action) {
    return permission;
  }
  const moduleLabel = module.charAt(0).toUpperCase() + module.slice(1);
  const actionLabel = action.charAt(0).toUpperCase() + action.slice(1);
  return `${moduleLabel} ${actionLabel}`;
}

type RouterContext = {
  db: PrismaClient;
  user: { id: string };
};

interface PrebuiltWorkflowConfigRecord {
  id: string;
  organizationId: string;
  workflowKey: PrebuiltWorkflowKey;
  enabled: boolean;
  emailSubject: string;
  emailBody: string;
  templateVersion: number;
  updatedByUserId: string;
  messageTemplateId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface PrebuiltWorkflowConfigDelegate {
  findMany(args: {
    where: { organizationId: string };
  }): Promise<PrebuiltWorkflowConfigRecord[]>;
  findUnique(args: {
    where: {
      organizationId_workflowKey: {
        organizationId: string;
        workflowKey: PrebuiltWorkflowKey;
      };
    };
  }): Promise<PrebuiltWorkflowConfigRecord | null>;
  upsert(args: {
    where: {
      organizationId_workflowKey: {
        organizationId: string;
        workflowKey: PrebuiltWorkflowKey;
      };
    };
    update: {
      enabled?: boolean;
      emailSubject?: string;
      emailBody?: string;
      templateVersion?: { increment: number };
      updatedByUserId: string;
      messageTemplateId?: string | null;
    };
    create: {
      organizationId: string;
      workflowKey: PrebuiltWorkflowKey;
      enabled: boolean;
      emailSubject: string;
      emailBody: string;
      updatedByUserId: string;
      messageTemplateId?: string | null;
    };
  }): Promise<PrebuiltWorkflowConfigRecord>;
}

function getPrebuiltWorkflowConfigDelegate(
  prisma: PrismaClient
): PrebuiltWorkflowConfigDelegate {
  return (
    prisma as unknown as {
      prebuiltWorkflowConfig: PrebuiltWorkflowConfigDelegate;
    }
  ).prebuiltWorkflowConfig;
}

async function fetchUserOrganization(
  ctx: RouterContext,
  organizationId: string
) {
  const userOrg = await ctx.db.userOrganization.findFirst({
    where: {
      userId: ctx.user.id,
      organizationId,
    },
    include: {
      customRole: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  if (!userOrg) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "User not found in organization",
    });
  }

  return userOrg as ExtendedUserOrganization;
}

type ResolvedTemplateMeta = {
  id: string;
  name: string;
  type: string;
  isSystem: boolean;
  description?: string | null;
};

type ResolvedEmailTemplate = {
  subject: string;
  body: string;
  meta: ResolvedTemplateMeta;
};

function extractEmailTemplate(template: Prisma.JsonValue | null | undefined) {
  if (!template || typeof template !== "object") {
    return null;
  }
  const record = template as Record<string, unknown>;
  const email = record.email;
  if (!email || typeof email !== "object") {
    return null;
  }

  const emailRecord = email as Record<string, unknown>;
  const subject = emailRecord.subject;
  const html = emailRecord.html;

  if (typeof subject !== "string" || typeof html !== "string") {
    return null;
  }

  return { subject, html };
}

async function resolveEmailTemplate(
  ctx: RouterContext,
  organizationId: string,
  templateId: string
): Promise<ResolvedEmailTemplate> {
  if (SystemTemplateService.isSystemTemplate(templateId)) {
    const template = SystemTemplateService.findById(templateId);
    if (!template) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Message template not found",
      });
    }

    if (template.type !== "EMAIL") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Only email templates can be used with workflows",
      });
    }

    const email = extractEmailTemplate(template.template as Prisma.JsonValue);
    if (!email) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Selected template is missing email content",
      });
    }

    return {
      subject: email.subject,
      body: email.html,
      meta: {
        id: template.id,
        name: template.name,
        type: template.type,
        isSystem: true,
        description: template.description,
      },
    } satisfies ResolvedEmailTemplate;
  }

  const actionTemplate = await ctx.db.actionTemplate.findFirst({
    where: {
      id: templateId,
      OR: [{ organizationId }, { isPublic: true }],
    },
    select: {
      id: true,
      name: true,
      type: true,
      description: true,
      template: true,
    },
  });

  if (!actionTemplate) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Message template not found",
    });
  }

  if (actionTemplate.type !== "EMAIL") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Only email templates can be used with workflows",
    });
  }

  const email = extractEmailTemplate(actionTemplate.template);
  if (!email) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Selected template is missing email content",
    });
  }

  return {
    subject: email.subject,
    body: email.html,
    meta: {
      id: actionTemplate.id,
      name: actionTemplate.name,
      type: actionTemplate.type,
      isSystem: false,
      description: actionTemplate.description,
    },
  } satisfies ResolvedEmailTemplate;
}

async function resolveTemplateMeta(
  ctx: RouterContext,
  organizationId: string,
  templateId: string
): Promise<ResolvedTemplateMeta | null> {
  try {
    const resolved = await resolveEmailTemplate(
      ctx,
      organizationId,
      templateId
    );
    return resolved.meta;
  } catch (error) {
    console.warn("Failed to resolve template metadata", {
      templateId,
      organizationId,
      error,
    });
    return null;
  }
}

const workflowKeySchema = z.enum([...PREBUILT_WORKFLOW_KEYS] as [
  PrebuiltWorkflowKey,
  ...PrebuiltWorkflowKey[],
]);

export const prebuiltWorkflowsRouter = createTRPCRouter({
  list: createAnyPermissionProcedure([
    PERMISSIONS.WORKFLOWS_READ,
    PERMISSIONS.WORKFLOWS_WRITE,
    PERMISSIONS.WORKFLOWS_ADMIN,
  ])
    .input(
      z.object({
        organizationId: z.string().cuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      await ctx.requireAnyPermission(input.organizationId);

      const userOrg = await fetchUserOrganization(ctx, input.organizationId);
      const prebuiltConfig = getPrebuiltWorkflowConfigDelegate(ctx.db);

      const canModify = customHasAnyPermission(userOrg, [
        PERMISSIONS.WORKFLOWS_WRITE,
        PERMISSIONS.WORKFLOWS_ADMIN,
      ]);

      const configs = await prebuiltConfig.findMany({
        where: {
          organizationId: input.organizationId,
        },
      });

      const configMap = new Map(
        configs.map(config => [config.workflowKey, config])
      );

      const workflows = PREBUILT_WORKFLOWS.map(definition => {
        const config = configMap.get(definition.key);
        const enabled = config?.enabled ?? false;
        const emailSubject =
          config?.emailSubject ?? definition.emailDefaults.subject;
        const emailBody = config?.emailBody ?? definition.emailDefaults.body;

        const missingPermissionCodes = definition.requiredPermissions.filter(
          permission => !customHasAnyPermission(userOrg, [permission])
        );

        const canEnable = missingPermissionCodes.length === 0;

        return {
          key: definition.key,
          title: definition.title,
          shortDescription: definition.shortDescription,
          category: definition.category,
          moduleDependencies: definition.moduleDependencies,
          highlight: definition.highlight,
          icon: definition.icon,
          enabled,
          updatedAt: config?.updatedAt ?? null,
          emailSubject,
          emailPreview: createEmailPreview(emailSubject, emailBody),
          missingPermissions: missingPermissionCodes.map(getPermissionLabel),
          missingPermissionCodes,
          canToggle: canModify && canEnable,
          requiresAdditionalPermissions: missingPermissionCodes.length > 0,
        };
      });

      return {
        workflows,
        canModify,
      };
    }),

  detail: createAnyPermissionProcedure([
    PERMISSIONS.WORKFLOWS_READ,
    PERMISSIONS.WORKFLOWS_WRITE,
    PERMISSIONS.WORKFLOWS_ADMIN,
  ])
    .input(
      z.object({
        organizationId: z.string().cuid(),
        workflowKey: workflowKeySchema,
      })
    )
    .query(async ({ ctx, input }) => {
      await ctx.requireAnyPermission(input.organizationId);

      const definition = getDefinitionByKey(input.workflowKey);

      if (!definition) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workflow not found",
        });
      }

      const userOrg = await fetchUserOrganization(ctx, input.organizationId);
      const prebuiltConfig = getPrebuiltWorkflowConfigDelegate(ctx.db);
      const config = await prebuiltConfig.findUnique({
        where: {
          organizationId_workflowKey: {
            organizationId: input.organizationId,
            workflowKey: definition.key,
          },
        },
      });

      const emailSubject =
        config?.emailSubject ?? definition.emailDefaults.subject;
      const emailBody = config?.emailBody ?? definition.emailDefaults.body;
      const preview = createEmailPreview(emailSubject, emailBody);

      const linkedTemplateMeta = config?.messageTemplateId
        ? await resolveTemplateMeta(
            ctx,
            input.organizationId,
            config.messageTemplateId
          )
        : null;

      const missingPermissionCodes = definition.requiredPermissions.filter(
        permission => !customHasAnyPermission(userOrg, [permission])
      );

      const canModify = customHasAnyPermission(userOrg, [
        PERMISSIONS.WORKFLOWS_WRITE,
        PERMISSIONS.WORKFLOWS_ADMIN,
      ]);

      return {
        key: definition.key,
        title: definition.title,
        shortDescription: definition.shortDescription,
        overview: definition.overview,
        trigger: definition.trigger,
        actions: definition.actions,
        moduleDependencies: definition.moduleDependencies,
        highlight: definition.highlight,
        icon: definition.icon,
        emailTemplate: {
          subject: emailSubject,
          body: emailBody,
          defaultSubject: definition.emailDefaults.subject,
          defaultBody: definition.emailDefaults.body,
          variables: definition.emailDefaults.variables,
          isCustomized:
            !!config &&
            (config.emailSubject !== definition.emailDefaults.subject ||
              config.emailBody !== definition.emailDefaults.body),
          preview,
          linkedTemplateId: config?.messageTemplateId ?? null,
          linkedTemplate: linkedTemplateMeta,
        },
        enabled: config?.enabled ?? false,
        missingPermissions: missingPermissionCodes.map(getPermissionLabel),
        missingPermissionCodes,
        canToggle: canModify && missingPermissionCodes.length === 0,
        canEditTemplate: canModify,
      };
    }),

  toggle: createAnyPermissionProcedure([
    PERMISSIONS.WORKFLOWS_WRITE,
    PERMISSIONS.WORKFLOWS_ADMIN,
  ])
    .input(
      z.object({
        organizationId: z.string().cuid(),
        workflowKey: workflowKeySchema,
        enabled: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.requireAnyPermission(input.organizationId);

      const definition = getDefinitionByKey(input.workflowKey);

      if (!definition) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workflow not found",
        });
      }

      const userOrg = await fetchUserOrganization(ctx, input.organizationId);
      const prebuiltConfig = getPrebuiltWorkflowConfigDelegate(ctx.db);

      if (!hasAllPermissions(userOrg, definition.requiredPermissions)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Missing required module permissions",
        });
      }

      const config = await prebuiltConfig.upsert({
        where: {
          organizationId_workflowKey: {
            organizationId: input.organizationId,
            workflowKey: definition.key,
          },
        },
        update: {
          enabled: input.enabled,
          updatedByUserId: ctx.user.id,
        },
        create: {
          organizationId: input.organizationId,
          workflowKey: definition.key,
          enabled: input.enabled,
          emailSubject: definition.emailDefaults.subject,
          emailBody: definition.emailDefaults.body,
          updatedByUserId: ctx.user.id,
        },
      });

      return {
        key: definition.key,
        enabled: config.enabled,
      };
    }),

  updateTemplate: createAnyPermissionProcedure([
    PERMISSIONS.WORKFLOWS_WRITE,
    PERMISSIONS.WORKFLOWS_ADMIN,
  ])
    .input(
      z.object({
        organizationId: z.string().cuid(),
        workflowKey: workflowKeySchema,
        templateId: z.string().min(1).max(128).nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.requireAnyPermission(input.organizationId);

      const definition = getDefinitionByKey(input.workflowKey);

      if (!definition) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workflow not found",
        });
      }

      const templateId =
        typeof input.templateId === "string" &&
        input.templateId.trim().length > 0
          ? input.templateId.trim()
          : null;

      const resolvedTemplate = templateId
        ? await resolveEmailTemplate(ctx, input.organizationId, templateId)
        : null;

      const emailSubject =
        resolvedTemplate?.subject ?? definition.emailDefaults.subject;
      const emailBody = resolvedTemplate?.body ?? definition.emailDefaults.body;

      const prebuiltConfig = getPrebuiltWorkflowConfigDelegate(ctx.db);
      const config = await prebuiltConfig.upsert({
        where: {
          organizationId_workflowKey: {
            organizationId: input.organizationId,
            workflowKey: definition.key,
          },
        },
        update: {
          emailSubject,
          emailBody,
          messageTemplateId: templateId,
          templateVersion: {
            increment: 1,
          },
          updatedByUserId: ctx.user.id,
        },
        create: {
          organizationId: input.organizationId,
          workflowKey: definition.key,
          enabled: false,
          emailSubject,
          emailBody,
          updatedByUserId: ctx.user.id,
          messageTemplateId: templateId,
        },
      });

      const preview = createEmailPreview(emailSubject, emailBody);

      return {
        key: definition.key,
        emailSubject: config.emailSubject,
        emailBody: config.emailBody,
        preview,
        templateVersion: config.templateVersion,
        messageTemplateId: config.messageTemplateId,
        linkedTemplate: resolvedTemplate?.meta ?? null,
      };
    }),
});
