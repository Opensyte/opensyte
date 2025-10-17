import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import {
  createAnyPermissionProcedure,
  createTRPCRouter,
} from "../../trpc";
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
    };
    create: {
      organizationId: string;
      workflowKey: PrebuiltWorkflowKey;
      enabled: boolean;
      emailSubject: string;
      emailBody: string;
      updatedByUserId: string;
    };
  }): Promise<PrebuiltWorkflowConfigRecord>;
}

function getPrebuiltWorkflowConfigDelegate(
  prisma: PrismaClient
): PrebuiltWorkflowConfigDelegate {
  return (prisma as unknown as {
    prebuiltWorkflowConfig: PrebuiltWorkflowConfigDelegate;
  }).prebuiltWorkflowConfig;
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

function validateTemplateContent(content: string) {
  const trimmed = content.trim();
  if (trimmed.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Template body cannot be empty",
    });
  }

  if (/<script[\s>]/i.test(trimmed)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Script tags are not allowed in templates",
    });
  }

  return trimmed;
}

function validateSubject(content: string) {
  const trimmed = content.trim();
  if (trimmed.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Subject cannot be empty",
    });
  }

  if (trimmed.length > 180) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Subject must be 180 characters or fewer",
    });
  }

  return trimmed;
}

const workflowKeySchema = z.enum(
  [...PREBUILT_WORKFLOW_KEYS] as [PrebuiltWorkflowKey, ...PrebuiltWorkflowKey[]]
);

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
        const emailSubject = config?.emailSubject ?? definition.emailDefaults.subject;
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
          emailPreview: summarizeEmail(emailBody),
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
        throw new TRPCError({ code: "NOT_FOUND", message: "Workflow not found" });
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
          subject: config?.emailSubject ?? definition.emailDefaults.subject,
          body: config?.emailBody ?? definition.emailDefaults.body,
          defaultSubject: definition.emailDefaults.subject,
          defaultBody: definition.emailDefaults.body,
          variables: definition.emailDefaults.variables,
          isCustomized:
            !!config &&
            (config.emailSubject !== definition.emailDefaults.subject ||
              config.emailBody !== definition.emailDefaults.body),
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
        throw new TRPCError({ code: "NOT_FOUND", message: "Workflow not found" });
      }

      const userOrg = await fetchUserOrganization(ctx, input.organizationId);
      const prebuiltConfig = getPrebuiltWorkflowConfigDelegate(ctx.db);

      if (
        !hasAllPermissions(userOrg, definition.requiredPermissions)
      ) {
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
        subject: z.string().min(1).max(2000),
        body: z.string().min(1).max(20000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.requireAnyPermission(input.organizationId);

      const definition = getDefinitionByKey(input.workflowKey);

      if (!definition) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workflow not found" });
      }

      const subject = validateSubject(input.subject);
      const body = validateTemplateContent(input.body);

      const prebuiltConfig = getPrebuiltWorkflowConfigDelegate(ctx.db);
      const config = await prebuiltConfig.upsert({
        where: {
          organizationId_workflowKey: {
            organizationId: input.organizationId,
            workflowKey: definition.key,
          },
        },
        update: {
          emailSubject: subject,
          emailBody: body,
          templateVersion: {
            increment: 1,
          },
          updatedByUserId: ctx.user.id,
        },
        create: {
          organizationId: input.organizationId,
          workflowKey: definition.key,
          enabled: false,
          emailSubject: subject,
          emailBody: body,
          updatedByUserId: ctx.user.id,
        },
      });

      return {
        key: definition.key,
        emailSubject: config.emailSubject,
        emailBody: config.emailBody,
        templateVersion: config.templateVersion,
      };
    }),
});
