import { z } from "zod";
import type {
  ActionTemplate,
  CustomRole,
  CustomRolePermission,
  FinancialReport,
  VariableDefinition,
  Workflow,
  WorkflowConnection,
  WorkflowNode,
  WorkflowTrigger,
} from "@prisma/client";
import { db } from "~/server/db";
import {
  TemplateManifestSchema,
  type TemplateManifest,
} from "~/types/templates";
import {
  type IntegrationTypeType,
  type VariableDataTypeType,
  type VariableScopeType,
} from "../../../prisma/generated/zod";

export const ExportSelectionSchema = z.object({
  organizationId: z.string().cuid(),
  selection: z.object({
    workflowIds: z.array(z.string().cuid()).default([]),
    reportIds: z.array(z.string().cuid()).default([]),
    actionTemplateIds: z.array(z.string()).default([]), // cuid or sys_*
    variableNames: z.array(z.string()).default([]),
    roleNames: z.array(z.string()).default([]),
    includeSeeds: z.boolean().optional().default(false),
    uiLayoutKeys: z.array(z.string()).default([]),
  }),
  meta: z
    .object({
      name: z.string().min(1),
      description: z.string().optional(),
      category: z.string().optional(),
      version: z.string().regex(/^\d+\.\d+\.\d+$/),
      appVersion: z.string().min(1),
      compatibleModules: z
        .array(z.enum(["crm", "projects", "finance", "hr"]))
        .nonempty(),
    })
    .strict(),
});
export type ExportSelectionInput = z.infer<typeof ExportSelectionSchema>;

export function scrubPII(value: unknown): unknown {
  if (typeof value === "string") {
    // Replace emails and phone numbers
    const scrubbed = value
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "masked@example.com")
      .replace(/\+?\d[\d\s().-]{7,}\d/g, "+10000000000");
    return scrubbed;
  }
  if (Array.isArray(value)) return value.map(v => scrubPII(v));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = scrubPII(v);
    }
    return out;
  }
  return value;
}

function deterministicLocalKey(prefix: string, index: number, name?: string) {
  const slug = (name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
  return `${prefix}_${index.toString().padStart(3, "0")}${slug ? `_${slug}` : ""}`;
}

export async function exportTemplateManifest(
  input: ExportSelectionInput
): Promise<TemplateManifest> {
  const { organizationId, selection, meta } =
    ExportSelectionSchema.parse(input);

  // Collect assets scoped to org
  const [workflows, reports, orgActionTemplates, variables, roles] =
    await Promise.all([
      selection.workflowIds.length
        ? db.workflow.findMany({
            where: { id: { in: selection.workflowIds }, organizationId },
            include: { nodes: true, triggers: true, connections: true },
          })
        : Promise.resolve(
            [] as Array<
              Workflow & {
                nodes: WorkflowNode[];
                triggers: WorkflowTrigger[];
                connections: WorkflowConnection[];
              }
            >
          ),
      selection.reportIds.length
        ? db.financialReport.findMany({
            where: { id: { in: selection.reportIds }, organizationId },
          })
        : Promise.resolve([] as FinancialReport[]),
      selection.actionTemplateIds.length
        ? db.actionTemplate.findMany({
            where: {
              id: {
                in: selection.actionTemplateIds.filter(
                  id => !id.startsWith("sys_")
                ),
              },
            },
          })
        : Promise.resolve([] as ActionTemplate[]),
      selection.variableNames.length
        ? db.variableDefinition.findMany({
            where: { organizationId, name: { in: selection.variableNames } },
          })
        : Promise.resolve([] as VariableDefinition[]),
      selection.roleNames.length
        ? db.customRole.findMany({
            where: { organizationId, name: { in: selection.roleNames } },
            include: {
              permissions: { include: { permission: true } },
            },
          })
        : Promise.resolve(
            [] as Array<
              CustomRole & {
                permissions: Array<
                  CustomRolePermission & { permission: { name: string } }
                >;
              }
            >
          ),
    ]);

  // Build manifest
  const header = {
    schemaVersion: "1.0.0",
    name: meta.name,
    version: meta.version,
    category: meta.category,
    description: meta.description,
    compatibleAppVersion: meta.appVersion,
    compatibleModules: meta.compatibleModules,
  };

  const requiresPermissions: string[] = [];
  const requiresIntegrations: Array<{
    type: IntegrationTypeType;
    key: string;
  }> = [];
  const requiresVariables: Array<{
    name: string;
    dataType: VariableDataTypeType;
    scope: VariableScopeType;
    required: boolean;
    defaultValue?: string;
  }> = [];

  // Variables
  for (const v of variables) {
    requiresVariables.push({
      name: v.name,
      dataType:
        v.dataType as unknown as (typeof requiresVariables)[number]["dataType"],
      scope: v.scope as unknown as (typeof requiresVariables)[number]["scope"],
      required: v.isRequired ?? false,
      defaultValue: v.defaultValue ?? undefined,
    });
  }

  // Roles
  const rbacRoles = (
    roles as Array<
      CustomRole & {
        permissions: Array<
          CustomRolePermission & { permission: { name: string } }
        >;
      }
    >
  ).map(r => ({
    name: r.name,
    color: r.color ?? undefined,
    description: r.description ?? undefined,
    permissions: r.permissions.map(p => p.permission.name),
  }));

  // Workflows
  const workflowAssets = workflows.map((w, idx) => {
    const localKey = deterministicLocalKey("wf", idx + 1, w.name);
    const nodes: Record<string, unknown>[] = w.nodes.map((n: WorkflowNode) => ({
      nodeId: n.nodeId,
      type: n.type,
      name: n.name,
      description: n.description ?? undefined,
      position: n.position as unknown as Record<string, unknown>,
      config: n.config as unknown as Record<string, unknown>,
      template: n.template as unknown as Record<string, unknown>,
      conditions: n.conditions as unknown as Record<string, unknown>,
    }));
    const triggers: Record<string, unknown>[] = w.triggers.map(
      (t: WorkflowTrigger) => ({
        nodeId: t.nodeId,
        name: t.name,
        description: t.description ?? undefined,
        type: t.type,
        module: t.module ?? undefined,
        entityType: t.entityType ?? undefined,
        eventType: t.eventType ?? undefined,
        conditions: t.conditions as unknown as Record<string, unknown>,
        isActive: false,
      })
    );
    const connections: Record<string, unknown>[] = w.connections.map(
      (c: WorkflowConnection) => ({
        sourceNodeId: c.sourceNodeId,
        targetNodeId: c.targetNodeId,
        edgeId: c.edgeId ?? undefined,
        label: c.label ?? undefined,
        conditions: c.conditions as unknown as Record<string, unknown>,
      })
    );
    return {
      localKey,
      workflow: {
        name: w.name,
        description: w.description ?? undefined,
        category: w.category ?? undefined,
        canvasData: w.canvasData
          ? (w.canvasData as unknown as Record<string, unknown>)
          : undefined,
      },
      nodes: nodes.map(n => scrubPII(n) as Record<string, unknown>),
      triggers: triggers.map(t => scrubPII(t) as Record<string, unknown>),
      connections: connections.map(c => scrubPII(c) as Record<string, unknown>),
      actionSubEntities: [],
    };
  });

  // Reports
  const reportAssets = reports.map((r, idx) => ({
    localKey: deterministicLocalKey("rep", idx + 1, r.name),
    template: scrubPII(r.template as unknown) as Record<string, unknown>,
    filters: scrubPII((r.filters as unknown) ?? {}) as Record<string, unknown>,
    dateRange: scrubPII((r.dateRange as unknown) ?? {}) as Record<
      string,
      unknown
    >,
  }));

  // Action templates
  let actIndex = 0;
  const systemIds = selection.actionTemplateIds.filter(id =>
    id.startsWith("sys_")
  );
  const systemActionTemplateAssets = systemIds.map(sysId => ({
    localKey: deterministicLocalKey("act", ++actIndex, sysId),
    templateId: sysId,
  }));
  const orgActionTemplateAssets = orgActionTemplates.map(t => ({
    localKey: deterministicLocalKey("act", ++actIndex, t.name),
    name: t.name,
    description: t.description ?? undefined,
    category: t.category as unknown as string,
    type: t.type as unknown as string,
    template: scrubPII(t.template as unknown) as Record<string, unknown>,
    defaultConfig: scrubPII((t.defaultConfig as unknown) ?? {}) as Record<
      string,
      unknown
    >,
    schema: scrubPII((t.schema as unknown) ?? {}) as Record<string, unknown>,
    requiredVariables: Array.isArray(t.requiredVariables)
      ? (t.requiredVariables as unknown as string[])
      : [],
    optionalVariables: Array.isArray(t.optionalVariables)
      ? (t.optionalVariables as unknown as string[])
      : [],
  }));
  const actionTemplateAssets = [
    ...systemActionTemplateAssets,
    ...orgActionTemplateAssets,
  ];

  // Placeholder for UI layouts (phase 1 JSON only)
  const uiLayouts: Record<string, unknown> = {};

  // Data seeds - phase 1: none by default
  const dataSeeds: Record<string, unknown> = {};

  const manifest: TemplateManifest = {
    header,
    requires: {
      permissions: requiresPermissions,
      integrations: requiresIntegrations,
      variables: requiresVariables,
    },
    assets: {
      workflows: workflowAssets,
      actionTemplates: actionTemplateAssets,
      reports: reportAssets,
      uiLayouts:
        uiLayouts as unknown as TemplateManifest["assets"]["uiLayouts"],
      rbac: { roles: rbacRoles },
      variables: requiresVariables,
      dataSeeds:
        dataSeeds as unknown as TemplateManifest["assets"]["dataSeeds"],
    },
  };

  // Validate before returning
  const validated = TemplateManifestSchema.parse(manifest);
  return validated;
}
