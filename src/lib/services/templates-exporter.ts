import { z } from "zod";
import type {
  ActionTemplate,
  CustomRole,
  CustomRolePermission,
  FinancialReport,
  Workflow,
  WorkflowConnection,
  WorkflowNode,
  WorkflowTrigger,
  EmailAction,
  SmsAction,
  WhatsAppAction,
  SlackAction,
  CalendarAction,
  IntegrationConfig,
  Project,
  Task,
  Invoice,
  InvoiceItem,
} from "@prisma/client";
import { db } from "~/server/db";
import {
  TemplateManifestSchema,
  type TemplateManifest,
} from "~/types/templates";
import { type IntegrationTypeType } from "../../../prisma/generated/zod";

export const ExportSelectionSchema = z.object({
  organizationId: z.string().cuid(),
  selection: z.object({
    workflowIds: z.array(z.string().cuid()).default([]),
    reportIds: z.array(z.string().cuid()).default([]),
    actionTemplateIds: z.array(z.string()).default([]), // cuid or sys_*
    roleNames: z.array(z.string()).default([]),
    projectIds: z.array(z.string().cuid()).default([]),
    invoiceTemplateIds: z.array(z.string().cuid()).default([]),
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
  const [workflows, reports, orgActionTemplates, roles, projects, invoices] =
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
      selection.projectIds.length
        ? db.project.findMany({
            where: { id: { in: selection.projectIds }, organizationId },
            include: { tasks: true },
          })
        : Promise.resolve([] as Array<Project & { tasks: Task[] }>),
      selection.invoiceTemplateIds.length
        ? db.invoice.findMany({
            where: { id: { in: selection.invoiceTemplateIds }, organizationId },
            include: { items: true },
          })
        : Promise.resolve([] as Array<Invoice & { items: InvoiceItem[] }>),
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

  // Preload action sub-entities and integration configs for workflows
  const allNodeRowIds = workflows.flatMap(w => w.nodes.map(n => n.id));
  const [emailActs, smsActs, waActs, slackActs, calActs] = await Promise.all([
    db.emailAction.findMany({ where: { actionId: { in: allNodeRowIds } } }),
    db.smsAction.findMany({ where: { actionId: { in: allNodeRowIds } } }),
    db.whatsAppAction.findMany({ where: { actionId: { in: allNodeRowIds } } }),
    db.slackAction.findMany({ where: { actionId: { in: allNodeRowIds } } }),
    db.calendarAction.findMany({ where: { actionId: { in: allNodeRowIds } } }),
  ]);

  const integrationIds = new Set<string>();
  for (const a of emailActs)
    if (a.integrationId) integrationIds.add(a.integrationId);
  for (const a of smsActs)
    if (a.integrationId) integrationIds.add(a.integrationId);
  for (const a of waActs)
    if (a.integrationId) integrationIds.add(a.integrationId);
  for (const a of slackActs)
    if (a.integrationId) integrationIds.add(a.integrationId);
  for (const a of calActs)
    if (a.integrationId) integrationIds.add(a.integrationId);
  const integrations: Pick<IntegrationConfig, "id" | "name" | "type">[] =
    integrationIds.size
      ? await db.integrationConfig.findMany({
          where: { id: { in: Array.from(integrationIds) } },
          select: { id: true, name: true, type: true },
        })
      : [];
  const integrationById = new Map<
    string,
    { type: IntegrationTypeType; key: string }
  >();
  for (const i of integrations) {
    integrationById.set(i.id, {
      type: i.type as unknown as IntegrationTypeType,
      key: i.name,
    });
  }

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
    // Action sub-entities for this workflow's nodes
    const nodeRowIdByNodeId = new Map<string, string>();
    for (const n of w.nodes) nodeRowIdByNodeId.set(n.id, n.nodeId);

    const actionSubEntities: Array<{
      type: string;
      nodeId: string;
      integration?: { type: IntegrationTypeType; key: string } | null;
      data: Record<string, unknown>;
    }> = [];
    const toPlaceholder = (integrationId?: string | null) =>
      integrationId ? (integrationById.get(integrationId) ?? null) : null;

    const pushEntity = (
      type: string,
      rec:
        | EmailAction
        | SmsAction
        | WhatsAppAction
        | SlackAction
        | CalendarAction
    ) => {
      const placeholder = toPlaceholder(rec.integrationId);
      if (placeholder) {
        if (
          !requiresIntegrations.some(
            r => r.type === placeholder.type && r.key === placeholder.key
          )
        ) {
          requiresIntegrations.push({
            type: placeholder.type,
            key: placeholder.key,
          });
        }
      }
      const raw = rec as Record<string, unknown>;
      const rest: Record<string, unknown> = { ...raw };
      delete rest.id;
      delete rest.actionId;
      delete rest.integrationId;
      delete rest.createdAt;
      delete rest.updatedAt;
      const nodeIdKey = typeof raw.actionId === "string" ? raw.actionId : "";
      const nodeId = nodeRowIdByNodeId.get(nodeIdKey) ?? "";
      actionSubEntities.push({
        type,
        nodeId,
        integration: placeholder,
        data: scrubPII(rest) as Record<string, unknown>,
      });
    };

    for (const a of emailActs.filter(a => nodeRowIdByNodeId.has(a.actionId)))
      pushEntity("EMAIL", a);
    for (const a of smsActs.filter(a => nodeRowIdByNodeId.has(a.actionId)))
      pushEntity("SMS", a);
    for (const a of waActs.filter(a => nodeRowIdByNodeId.has(a.actionId)))
      pushEntity("WHATSAPP", a);
    for (const a of slackActs.filter(a => nodeRowIdByNodeId.has(a.actionId)))
      pushEntity("SLACK", a);
    for (const a of calActs.filter(a => nodeRowIdByNodeId.has(a.actionId)))
      pushEntity("CALENDAR", a);

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
      actionSubEntities,
    };
  });

  // Reports
  const reportAssets = reports.map((r, idx) => ({
    localKey: deterministicLocalKey("rep", idx + 1, r.name),
    name: r.name,
    description: r.description ?? undefined,
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

  // Projects
  const projectAssets = projects.map((p, idx) => ({
    localKey: deterministicLocalKey("proj", idx + 1, p.name),
    name: p.name,
    description: p.description ?? undefined,
    status: p.status as
      | "PLANNED"
      | "IN_PROGRESS"
      | "ON_HOLD"
      | "COMPLETED"
      | "CANCELLED",
    budget: p.budget ? Number(p.budget) : undefined,
    currency: p.currency,
    tasks: p.tasks.map(task => ({
      title: task.title,
      description: task.description ?? undefined,
      status: task.status as
        | "BACKLOG"
        | "TODO"
        | "IN_PROGRESS"
        | "REVIEW"
        | "DONE"
        | "ARCHIVED",
      priority: task.priority as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
      estimatedHours: task.estimatedHours
        ? Number(task.estimatedHours)
        : undefined,
    })),
  }));

  // Invoices
  const invoiceAssets = invoices.map((inv, idx) => ({
    localKey: deterministicLocalKey("inv", idx + 1, inv.invoiceNumber),
    invoiceNumber: inv.invoiceNumber,
    template: {
      paymentTerms: inv.paymentTerms,
      currency: inv.currency,
      taxRate: Number(inv.taxAmount),
      logo: inv.logoUrl ?? undefined,
      termsAndConditions: inv.termsAndConditions ?? undefined,
      footer: inv.footer ?? undefined,
    },
    items: inv.items.map(item => ({
      description: item.description,
      unitPrice: Number(item.unitPrice),
      quantity: Number(item.quantity),
      taxRate: Number(item.taxRate),
    })),
  }));

  // UI layouts: export selected keys from OrganizationUiConfig
  const uiLayouts: Record<string, unknown> = {};
  if (selection.uiLayoutKeys.length) {
    const rows = await db.organizationUiConfig.findMany({
      where: { organizationId, key: { in: selection.uiLayoutKeys } },
      select: { key: true, config: true },
    });
    for (const r of rows)
      uiLayouts[r.key] = scrubPII(r.config as unknown) as Record<
        string,
        unknown
      >;
  }

  // Data seeds - minimal sanitized seeds with localKey references (cap counts)
  const dataSeeds: Record<string, unknown> = {};

  const manifest: TemplateManifest = {
    header,
    requires: {
      permissions: requiresPermissions,
      integrations: requiresIntegrations,
      variables: [],
    },
    assets: {
      workflows: workflowAssets,
      actionTemplates: actionTemplateAssets,
      reports: reportAssets,
      projects: projectAssets,
      invoices: invoiceAssets,
      uiLayouts:
        uiLayouts as unknown as TemplateManifest["assets"]["uiLayouts"],
      rbac: { roles: rbacRoles },
      variables: [],
      dataSeeds:
        dataSeeds as unknown as TemplateManifest["assets"]["dataSeeds"],
    },
  };

  // Validate before returning
  const validated = TemplateManifestSchema.parse(manifest);
  return validated;
}
