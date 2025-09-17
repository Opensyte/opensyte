import { z } from "zod";
import type {
  Prisma,
  VariableDataType,
  VariableScope,
  IntegrationType,
  WhatsAppMessageType,
} from "@prisma/client";
import { db } from "~/server/db";
import { TemplateManifestSchema } from "~/types/templates";
import {
  TemplateInstallStrategySchema,
  ActionTemplateCategorySchema,
  WorkflowNodeTypeSchema,
  VariableDataTypeSchema,
  VariableScopeSchema,
  WorkflowTriggerTypeSchema,
} from "../../../prisma/generated/zod";

export const InstallPreflightSchema = z.object({
  organizationId: z.string().cuid(),
  manifest: TemplateManifestSchema,
  strategy: TemplateInstallStrategySchema.default("MERGE"),
  namePrefix: z.string().optional(),
});
export type InstallPreflightInput = z.infer<typeof InstallPreflightSchema>;

export type InstallPreflightResult = {
  ok: boolean;
  issues: string[];
  requiredIntegrations: { type: string; key: string }[];
  requiredVariables: string[];
  collisions: { type: string; name: string; entity: string }[];
  plan: Array<{
    assetType: string;
    name: string;
    strategy: "MERGE" | "OVERWRITE" | "PREFIX";
    reason?: string;
  }>;
};

export async function preflightInstall(
  input: InstallPreflightInput
): Promise<InstallPreflightResult> {
  const { organizationId, manifest } = InstallPreflightSchema.parse(input);

  const issues: string[] = [];
  // TODO: compare manifest.header.compatibleAppVersion with app version if available

  const requiredIntegrations = manifest.requires.integrations;
  const requiredVariables = [
    ...new Set([
      ...manifest.requires.variables.map(v => v.name),
      ...manifest.assets.variables.map(v => v.name),
    ]),
  ];

  const [existingVars, existingRoles, existingReports, existingWorkflows] =
    await Promise.all([
      db.variableDefinition.findMany({
        where: { organizationId, name: { in: requiredVariables } },
        select: { name: true },
      }),
      db.customRole.findMany({
        where: {
          organizationId,
          name: { in: manifest.assets.rbac.roles.map(r => r.name) },
        },
        select: { name: true },
      }),
      db.financialReport.findMany({
        where: { organizationId },
        select: { name: true },
      }),
      db.workflow.findMany({
        where: { organizationId },
        select: { name: true },
      }),
    ]);
  const collisions: { type: string; name: string; entity: string }[] = [];
  for (const v of existingVars)
    collisions.push({
      type: "variable",
      name: v.name,
      entity: "VariableDefinition",
    });
  for (const r of existingRoles)
    collisions.push({ type: "role", name: r.name, entity: "CustomRole" });
  for (const rep of manifest.assets.reports) {
    if (existingReports.some(er => er.name === rep.localKey)) {
      collisions.push({
        type: "report",
        name: rep.localKey,
        entity: "FinancialReport",
      });
    }
  }
  for (const wf of manifest.assets.workflows) {
    const name = wf.workflow.name;
    if (existingWorkflows.some(ew => ew.name === name)) {
      collisions.push({ type: "workflow", name, entity: "Workflow" });
    }
  }

  const plan: Array<{
    assetType: string;
    name: string;
    strategy: "MERGE" | "OVERWRITE" | "PREFIX";
    reason?: string;
  }> = [];
  for (const c of collisions) {
    plan.push({
      assetType: c.type,
      name: c.name,
      strategy: "MERGE",
      reason: "default",
    });
  }

  return {
    ok: issues.length === 0,
    issues,
    requiredIntegrations,
    requiredVariables,
    collisions,
    plan,
  };
}

export const StartInstallSchema = z.object({
  organizationId: z.string().cuid(),
  manifest: TemplateManifestSchema,
  strategy: TemplateInstallStrategySchema.default("MERGE"),
  namePrefix: z.string().optional(),
  templatePackageId: z.string().cuid().optional(),
  versionId: z.string().cuid().optional(),
  createdById: z.string().optional(),
});
export type StartInstallInput = z.infer<typeof StartInstallSchema>;

export type InstallResult = {
  installationId: string;
};

export async function startInstall(
  input: StartInstallInput
): Promise<InstallResult> {
  const {
    organizationId,
    manifest,
    strategy,
    namePrefix,
    templatePackageId,
    versionId,
    createdById,
  } = StartInstallSchema.parse(input);

  const installation = await db.templateInstallation.create({
    data: {
      organizationId,
      templatePackageId: templatePackageId ?? "",
      templateVersionId: versionId,
      status: "RUNNING",
      strategy: strategy,
      namePrefix: namePrefix ?? undefined,
      preflight: [] as Prisma.InputJsonValue,
      logs: [] as Prisma.InputJsonValue,
      error: undefined,
      createdById: createdById ?? "system",
    },
  });

  try {
    await db.$transaction(async tx => {
      type ManifestActionSubEntity = {
        type?: string;
        nodeId?: string;
        integration?: { type?: string; key?: string } | null;
        data?: Record<string, unknown>;
      };

      const getStringField = (
        obj: Record<string, unknown>,
        key: string,
        fallback?: string
      ): string | undefined => {
        const v = obj[key];
        return typeof v === "string" ? v : fallback;
      };

      const getJsonField = (
        obj: Record<string, unknown>,
        key: string
      ): Prisma.InputJsonValue | undefined => {
        const v = obj[key];
        return v === undefined
          ? undefined
          : (JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue);
      };
      const toJson = <T>(v: T): Prisma.InputJsonValue => {
        const serialized = JSON.stringify(v ?? {});
        return JSON.parse(serialized) as unknown as Prisma.InputJsonValue;
      };
      // Roles
      for (const role of manifest.assets.rbac.roles) {
        const created = await tx.customRole.create({
          data: {
            organizationId,
            name: namePrefix ? `${namePrefix}${role.name}` : role.name,
            description: role.description ?? null,
            color: role.color ?? undefined,
            isActive: true,
            createdById: createdById ?? "system",
          },
        });
        await tx.templateInstallItem.create({
          data: {
            installationId: installation.id,
            assetType: "ROLE",
            sourceKey: role.name,
            createdModel: "CustomRole",
            createdId: created.id,
            status: "CREATED",
            details: toJson({}),
          },
        });
      }

      // Variables
      for (const variable of manifest.assets.variables) {
        const created = await tx.variableDefinition.create({
          data: {
            organizationId,
            name: variable.name,
            displayName: variable.name,
            description: null,
            category: "Template",
            dataType: VariableDataTypeSchema.parse(
              variable.dataType
            ) as unknown as VariableDataType,
            defaultValue: variable.defaultValue ?? undefined,
            isRequired: variable.required ?? false,
            scope: VariableScopeSchema.parse(
              variable.scope
            ) as unknown as VariableScope,
            moduleScope: undefined,
            createdById: createdById ?? "system",
          },
        });
        await tx.templateInstallItem.create({
          data: {
            installationId: installation.id,
            assetType: "VARIABLE",
            sourceKey: variable.name,
            createdModel: "VariableDefinition",
            createdId: created.id,
            status: "CREATED",
            details: {} as Prisma.InputJsonValue,
          },
        });
      }

      // Action Templates (org-level copies only when snapshot is included)
      for (const at of manifest.assets.actionTemplates) {
        if (at.templateId?.startsWith("sys_")) {
          continue;
        }
        const created = await tx.actionTemplate.create({
          data: {
            organizationId,
            name: namePrefix
              ? `${namePrefix}${at.name ?? "Unnamed Template"}`
              : (at.name ?? "Unnamed Template"),
            description: at.description ?? null,
            category: ActionTemplateCategorySchema.parse(
              at.category ?? "CUSTOM"
            ),
            type: WorkflowNodeTypeSchema.parse(at.type ?? "CUSTOM"),
            template: toJson(at.template ?? {}),
            defaultConfig: toJson(at.defaultConfig ?? {}),
            schema: toJson(at.schema ?? {}),
            isPublic: false,
            isActive: true,
            isLocked: false,
            version: "1.0.0",
            createdById: createdById ?? "system",
          },
        });
        await tx.templateInstallItem.create({
          data: {
            installationId: installation.id,
            assetType: "ACTION_TEMPLATE",
            sourceKey: at.localKey,
            createdModel: "ActionTemplate",
            createdId: created.id,
            status: "CREATED",
            details: toJson({}),
          },
        });
      }

      // Reports
      for (const rep of manifest.assets.reports) {
        const created = await tx.financialReport.create({
          data: {
            organizationId,
            name: rep.localKey,
            description: null,
            type: "CUSTOM",
            template: toJson(rep.template),
            filters: toJson(rep.filters ?? {}),
            dateRange: toJson(rep.dateRange ?? {}),
            status: "DRAFT",
            isTemplate: true,
            isScheduled: false,
            createdById: createdById ?? "system",
          },
        });
        await tx.templateInstallItem.create({
          data: {
            installationId: installation.id,
            assetType: "REPORT",
            sourceKey: rep.localKey,
            createdModel: "FinancialReport",
            createdId: created.id,
            status: "CREATED",
            details: toJson({}),
          },
        });
      }

      // Workflows (create + graph + action sub-entities)
      for (const wf of manifest.assets.workflows) {
        const createdWf = await tx.workflow.create({
          data: {
            organizationId,
            name: namePrefix
              ? `${namePrefix}${wf.workflow.name}`
              : wf.workflow.name,
            description: wf.workflow.description ?? null,
            category: wf.workflow.category ?? null,
            isTemplate: false,
            canvasData: toJson(wf.workflow.canvasData),
            status: "DRAFT",
            createdById: createdById ?? "system",
          },
        });
        await tx.templateInstallItem.create({
          data: {
            installationId: installation.id,
            assetType: "WORKFLOW",
            sourceKey: wf.localKey,
            createdModel: "Workflow",
            createdId: createdWf.id,
            status: "CREATED",
            details: toJson({ name: wf.workflow.name }),
          },
        });

        // Helpers to narrow arbitrary records
        // idMap for nodeId (ReactFlow) -> created row id
        const nodeIdToRowId = new Map<string, string>();

        for (const rawNode of wf.nodes as unknown as Array<
          Record<string, unknown>
        >) {
          const nodeId =
            (rawNode.nodeId as string) ?? (rawNode.id as string) ?? "";
          const type = WorkflowNodeTypeSchema.parse(
            (rawNode.type as string) ?? "CUSTOM"
          );
          const name = (rawNode.name as string) ?? "Node";
          const description =
            (rawNode.description as string | undefined) ?? null;
          const createdNode = await tx.workflowNode.create({
            data: {
              workflowId: createdWf.id,
              nodeId,
              type,
              name,
              description,
              position: toJson(rawNode.position),
              config: toJson(rawNode.config),
              template: toJson(rawNode.template),
              conditions: toJson(rawNode.conditions),
            },
          });
          nodeIdToRowId.set(nodeId, createdNode.id);
        }
        for (const rawTrig of wf.triggers as unknown as Array<
          Record<string, unknown>
        >) {
          const nodeId = (rawTrig.nodeId as string) ?? "";
          const name = (rawTrig.name as string) ?? "Trigger";
          const type = WorkflowTriggerTypeSchema.parse(
            (rawTrig.type as string) ?? "RECORD_CREATED"
          );
          const moduleName = (rawTrig.module as string | undefined) ?? "";
          const entityType = (rawTrig.entityType as string | undefined) ?? "";
          const eventType = (rawTrig.eventType as string | undefined) ?? "";
          const createdTrig = await tx.workflowTrigger.create({
            data: {
              workflowId: createdWf.id,
              nodeId,
              name,
              type,
              module: moduleName,
              entityType,
              eventType,
              conditions: toJson(rawTrig.conditions),
              isActive: false,
            },
          });
          await tx.templateInstallItem.create({
            data: {
              installationId: installation.id,
              assetType: "WORKFLOW",
              sourceKey: `${wf.localKey}:TRIGGER:${nodeId}`,
              createdModel: "WorkflowTrigger",
              createdId: createdTrig.id,
              status: "CREATED",
              details: toJson({ nodeId, type }),
            },
          });
        }
        for (const rawConn of wf.connections as unknown as Array<
          Record<string, unknown>
        >) {
          const sourceNodeId = (rawConn.sourceNodeId as string) ?? "";
          const targetNodeId = (rawConn.targetNodeId as string) ?? "";
          const edgeId = rawConn.edgeId as string | undefined;
          const label = (rawConn.label as string | undefined) ?? null;
          const createdConn = await tx.workflowConnection.create({
            data: {
              workflowId: createdWf.id,
              sourceNodeId,
              targetNodeId,
              edgeId,
              label,
              conditions: toJson(rawConn.conditions),
            },
          });
          await tx.templateInstallItem.create({
            data: {
              installationId: installation.id,
              assetType: "WORKFLOW",
              sourceKey: `${wf.localKey}:CONNECTION:${edgeId ?? `${sourceNodeId}->${targetNodeId}`}`,
              createdModel: "WorkflowConnection",
              createdId: createdConn.id,
              status: "CREATED",
              details: toJson({ sourceNodeId, targetNodeId, edgeId }),
            },
          });
        }

        // Action sub-entities: resolve integration placeholders and create
        for (const se of wf.actionSubEntities as unknown as Array<ManifestActionSubEntity>) {
          const type = (se.type ?? "").toUpperCase();
          const nodeId = se.nodeId ?? "";
          const createdRowId = nodeIdToRowId.get(nodeId);
          if (!createdRowId) continue;

          // Resolve integration placeholder to config id
          const integration = se.integration;
          let integrationId: string | undefined;
          if (integration?.type && integration?.key) {
            const found = await tx.integrationConfig.findFirst({
              where: {
                organizationId,
                // type is an enum in Prisma; compare as string
                type: integration.type as unknown as Prisma.IntegrationConfigWhereInput["type"],
                name: integration.key,
              },
              select: { id: true },
            });
            integrationId = found?.id ?? undefined;
          }

          const baseData: Record<string, unknown> = se.data ?? {};
          const common = { actionId: createdRowId, integrationId } as {
            actionId: string;
            integrationId?: string;
          };

          if (type === "EMAIL") {
            const emailData: Prisma.EmailActionUncheckedCreateInput = {
              actionId: common.actionId,
              integrationId: common.integrationId,
              subject: getStringField(baseData, "subject") ?? "",
              fromName: getStringField(baseData, "fromName"),
              fromEmail: getStringField(baseData, "fromEmail"),
              replyTo: getStringField(baseData, "replyTo"),
              htmlBody: getStringField(baseData, "htmlBody"),
              textBody: getStringField(baseData, "textBody"),
              templateId: getStringField(baseData, "templateId"),
              ccEmails: getJsonField(baseData, "ccEmails"),
              bccEmails: getJsonField(baseData, "bccEmails"),
              attachments: getJsonField(baseData, "attachments"),
              variables: getJsonField(baseData, "variables"),
              trackOpens:
                (baseData.trackOpens as boolean | undefined) ?? undefined,
              trackClicks:
                (baseData.trackClicks as boolean | undefined) ?? undefined,
            };
            const created = await tx.emailAction.create({ data: emailData });
            await tx.templateInstallItem.create({
              data: {
                installationId: installation.id,
                assetType: "WORKFLOW",
                sourceKey: `${wf.localKey}:EMAIL:${nodeId}`,
                createdModel: "EmailAction",
                createdId: created.id,
                status: "CREATED",
                details: toJson({ nodeId, type: "EMAIL" }),
              },
            });
          } else if (type === "SMS") {
            const smsData: Prisma.SmsActionUncheckedCreateInput = {
              actionId: common.actionId,
              integrationId: common.integrationId,
              message: getStringField(baseData, "message") ?? "",
              fromNumber: getStringField(baseData, "fromNumber"),
              templateId: getStringField(baseData, "templateId"),
              maxLength:
                (baseData.maxLength as number | undefined) ?? undefined,
              unicode: (baseData.unicode as boolean | undefined) ?? undefined,
              variables: getJsonField(baseData, "variables"),
            };
            const created = await tx.smsAction.create({ data: smsData });
            await tx.templateInstallItem.create({
              data: {
                installationId: installation.id,
                assetType: "WORKFLOW",
                sourceKey: `${wf.localKey}:SMS:${nodeId}`,
                createdModel: "SmsAction",
                createdId: created.id,
                status: "CREATED",
                details: toJson({ nodeId, type: "SMS" }),
              },
            });
          } else if (type === "WHATSAPP") {
            const toNumbersVal = (baseData as { toNumbers?: unknown })
              .toNumbers;
            const waData: Prisma.WhatsAppActionUncheckedCreateInput = {
              actionId: common.actionId,
              integrationId: common.integrationId,
              toNumbers: JSON.parse(
                JSON.stringify(toNumbersVal ?? [])
              ) as Prisma.InputJsonValue,
              businessAccountId: getStringField(baseData, "businessAccountId"),
              messageType:
                (getStringField(
                  baseData,
                  "messageType"
                )?.toUpperCase() as WhatsAppMessageType) ?? "TEXT",
              textMessage: getStringField(baseData, "textMessage"),
              templateName: getStringField(baseData, "templateName"),
              templateLanguage: getStringField(baseData, "templateLanguage"),
              mediaUrl: getStringField(baseData, "mediaUrl"),
              mediaType: getStringField(baseData, "mediaType"),
              caption: getStringField(baseData, "caption"),
              templateParams: getJsonField(baseData, "templateParams"),
              variables: getJsonField(baseData, "variables"),
            };
            const created = await tx.whatsAppAction.create({ data: waData });
            await tx.templateInstallItem.create({
              data: {
                installationId: installation.id,
                assetType: "WORKFLOW",
                sourceKey: `${wf.localKey}:WHATSAPP:${nodeId}`,
                createdModel: "WhatsAppAction",
                createdId: created.id,
                status: "CREATED",
                details: toJson({ nodeId, type: "WHATSAPP" }),
              },
            });
          } else if (type === "SLACK") {
            const slackData: Prisma.SlackActionUncheckedCreateInput = {
              actionId: common.actionId,
              integrationId: common.integrationId,
              message: getStringField(baseData, "message") ?? "",
              workspaceId: getStringField(baseData, "workspaceId"),
              channel: getStringField(baseData, "channel"),
              userId: getStringField(baseData, "userId"),
              blocks: getJsonField(baseData, "blocks"),
              attachments: getJsonField(baseData, "attachments"),
              asUser: (baseData.asUser as boolean | undefined) ?? undefined,
              username: getStringField(baseData, "username"),
              iconEmoji: getStringField(baseData, "iconEmoji"),
              iconUrl: getStringField(baseData, "iconUrl"),
              threadTs: getStringField(baseData, "threadTs"),
              replyBroadcast:
                (baseData.replyBroadcast as boolean | undefined) ?? undefined,
              variables: getJsonField(baseData, "variables"),
            };
            const created = await tx.slackAction.create({ data: slackData });
            await tx.templateInstallItem.create({
              data: {
                installationId: installation.id,
                assetType: "WORKFLOW",
                sourceKey: `${wf.localKey}:SLACK:${nodeId}`,
                createdModel: "SlackAction",
                createdId: created.id,
                status: "CREATED",
                details: toJson({ nodeId, type: "SLACK" }),
              },
            });
          } else if (type === "CALENDAR") {
            const calData: Prisma.CalendarActionUncheckedCreateInput = {
              actionId: common.actionId,
              integrationId: common.integrationId,
              title: getStringField(baseData, "title") ?? "Event",
              startTime:
                getStringField(baseData, "startTime") ??
                new Date().toISOString(),
              endTime:
                getStringField(baseData, "endTime") ??
                new Date(Date.now() + 3600000).toISOString(),
              description: getStringField(baseData, "description"),
              location: getStringField(baseData, "location"),
              timezone: getStringField(baseData, "timezone"),
              isAllDay: (baseData.isAllDay as boolean | undefined) ?? undefined,
              attendees: getJsonField(baseData, "attendees"),
              organizer: getStringField(baseData, "organizer"),
              reminders: getJsonField(baseData, "reminders"),
              recurrence: getJsonField(baseData, "recurrence"),
              variables: getJsonField(baseData, "variables"),
            };
            const created = await tx.calendarAction.create({ data: calData });
            await tx.templateInstallItem.create({
              data: {
                installationId: installation.id,
                assetType: "WORKFLOW",
                sourceKey: `${wf.localKey}:CALENDAR:${nodeId}`,
                createdModel: "CalendarAction",
                createdId: created.id,
                status: "CREATED",
                details: toJson({ nodeId, type: "CALENDAR" }),
              },
            });
          }
        }
      }
    });

    await db.templateInstallation.update({
      where: { id: installation.id },
      data: { status: "COMPLETED", completedAt: new Date(), logs: [] },
    });
  } catch (error) {
    await db.templateInstallation.update({
      where: { id: installation.id },
      data: { status: "FAILED", error: (error as Error).message },
    });
    throw error;
  }

  return { installationId: installation.id };
}
