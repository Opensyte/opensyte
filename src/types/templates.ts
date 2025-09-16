import { z } from "zod";
import {
  IntegrationTypeSchema,
  VariableDataTypeSchema,
  VariableScopeSchema,
} from "../../prisma/generated/zod";

// Semver string or range like ^1.2.3, ~1.2.3, 1.x, >=1.2.0 <2.0.0
const semverRangeRegex =
  /^(?:\d+\.\d+\.\d+|\^\d+\.\d+\.\d+|~\d+\.\d+\.\d+|\d+\.x|\d+\.\d+\.x|>=?\d+\.\d+\.\d+(?:\s*<\s*\d+\.\d+\.\d+)?|\*|latest)$/;

export const ModuleKeySchema = z.enum(["crm", "projects", "finance", "hr"]);

export const ManifestHeaderSchema = z.object({
  schemaVersion: z.string().min(1),
  name: z.string().min(1).max(120),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, "Must be semver x.y.z"),
  category: z.string().optional(),
  description: z.string().optional(),
  compatibleAppVersion: z
    .string()
    .regex(semverRangeRegex, "Invalid semver or range"),
  compatibleModules: z.array(ModuleKeySchema).nonempty(),
});

export const ManifestPermissionSchema = z.string().min(1);

export const ManifestIntegrationRefSchema = z.object({
  type: IntegrationTypeSchema,
  key: z.string().min(1), // human key like "primary_smtp"; not an id
});

export const ManifestVariableDefSchema = z.object({
  name: z.string().min(1),
  dataType: VariableDataTypeSchema,
  scope: VariableScopeSchema,
  required: z.boolean().default(false),
  defaultValue: z.string().optional(),
});

// Action templates may reference system templates by id like "sys_*" or org templates by cuid
const SystemOrCuidIdSchema = z
  .string()
  .refine(
    val => val.startsWith("sys_") || z.string().cuid().safeParse(val).success,
    { message: "Expected system id (sys_*) or cuid" }
  );

// Workflow graph asset with placeholders for variables/integrations
export const ManifestWorkflowSchema = z.object({
  localKey: z.string().min(1),
  workflow: z
    .object({
      name: z.string().min(1),
      description: z.string().optional(),
      category: z.string().optional(),
      canvasData: z.record(z.unknown()).optional(),
    })
    .strict(),
  nodes: z.array(z.record(z.unknown())),
  triggers: z.array(z.record(z.unknown())),
  connections: z.array(z.record(z.unknown())),
  actionSubEntities: z
    .array(
      z.object({
        // e.g., EmailAction, SmsAction payloads with integration placeholders
        type: z.string().min(1),
        config: z.record(z.unknown()),
      })
    )
    .optional()
    .default([]),
});

export const ManifestActionTemplateSchema = z.object({
  localKey: z.string().min(1),
  // reference can be system id or a snapshot payload to create org-level copy
  templateId: SystemOrCuidIdSchema.optional(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  type: z.string().min(1).optional(),
  template: z.record(z.unknown()).optional(),
  defaultConfig: z.record(z.unknown()).optional(),
  schema: z.record(z.unknown()).optional(),
  requiredVariables: z.array(z.string()).optional(),
  optionalVariables: z.array(z.string()).optional(),
});

export const ManifestReportSchema = z.object({
  localKey: z.string().min(1),
  template: z.record(z.unknown()),
  filters: z.record(z.unknown()).optional(),
  dateRange: z.record(z.unknown()).optional(),
});

export const ManifestUiLayoutsSchema = z.object({
  forms: z.record(z.unknown()).optional(),
  listViews: z.record(z.unknown()).optional(),
  dashboards: z.record(z.unknown()).optional(),
});

export const ManifestRoleSchema = z.object({
  name: z.string().min(1),
  color: z.string().optional(),
  description: z.string().optional(),
  permissions: z.array(ManifestPermissionSchema).default([]),
});

export const ManifestDataSeedRowSchema = z.object({
  localKey: z.string().min(1),
  values: z.record(z.any()), // foreign keys expressed as manifest-local keys
});

export const ManifestDataSeedsSchema = z.record(
  z.string(), // model name
  z.array(ManifestDataSeedRowSchema)
);

export const TemplateManifestSchema = z
  .object({
    header: ManifestHeaderSchema,
    requires: z.object({
      permissions: z.array(ManifestPermissionSchema).default([]),
      integrations: z.array(ManifestIntegrationRefSchema).default([]),
      variables: z.array(ManifestVariableDefSchema).default([]),
    }),
    assets: z.object({
      workflows: z.array(ManifestWorkflowSchema).default([]),
      actionTemplates: z.array(ManifestActionTemplateSchema).default([]),
      reports: z.array(ManifestReportSchema).default([]),
      uiLayouts: ManifestUiLayoutsSchema.optional().default({}),
      rbac: z
        .object({ roles: z.array(ManifestRoleSchema).default([]) })
        .default({ roles: [] }),
      variables: z.array(ManifestVariableDefSchema).default([]),
      dataSeeds: ManifestDataSeedsSchema.optional().default({}),
    }),
  })
  .strict();

export type TemplateManifest = z.infer<typeof TemplateManifestSchema>;
export type ManifestWorkflow = z.infer<typeof ManifestWorkflowSchema>;
export type ManifestRole = z.infer<typeof ManifestRoleSchema>;
