import { z } from "zod";
import type { Prisma, VariableDataType, VariableScope } from "@prisma/client";
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
  collisions: { type: string; name: string }[];
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

  const [existingVars, existingRoles] = await Promise.all([
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
  ]);
  const collisions: { type: string; name: string }[] = [];
  for (const v of existingVars)
    collisions.push({ type: "variable", name: v.name });
  for (const r of existingRoles)
    collisions.push({ type: "role", name: r.name });

  return {
    ok: issues.length === 0,
    issues,
    requiredIntegrations,
    requiredVariables,
    collisions,
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

      // Workflows (basic create + graph persistence)
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
            details: toJson({}),
          },
        });

        // Helpers to narrow arbitrary records
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
          await tx.workflowNode.create({
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
          await tx.workflowTrigger.create({
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
        }
        for (const rawConn of wf.connections as unknown as Array<
          Record<string, unknown>
        >) {
          const sourceNodeId = (rawConn.sourceNodeId as string) ?? "";
          const targetNodeId = (rawConn.targetNodeId as string) ?? "";
          const edgeId = rawConn.edgeId as string | undefined;
          const label = (rawConn.label as string | undefined) ?? null;
          await tx.workflowConnection.create({
            data: {
              workflowId: createdWf.id,
              sourceNodeId,
              targetNodeId,
              edgeId,
              label,
              conditions: toJson(rawConn.conditions),
            },
          });
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
