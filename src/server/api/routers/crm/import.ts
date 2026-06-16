import { Prisma } from "@prisma/client";
import type {
  PrismaClient,
  CustomerType,
  DedupeMode,
  ImportEntityType,
  ImportModule,
  ImportStatus,
  IssueSeverity,
  LeadSource,
  LeadStatus,
  RowStatus,
} from "@prisma/client";
import { z } from "zod";
import { PERMISSIONS } from "~/lib/rbac";
import {
  CRM_CONTACT_FIELDS,
  CRM_REQUIRED_CONTACT_FIELDS,
  CRM_SUPPORTED_CONTACT_TYPES,
  CRM_SUPPORTED_LEAD_STATUS,
  DEDUPE_MODES,
  EMAIL_REGEX,
  type CRMContactFieldKey,
  type DedupeModeValue,
  type ImportRowRecord,
  type ImportableValue,
} from "~/lib/imports/definitions";
import {
  generateContactSchemaSuggestions,
  type ColumnSuggestionMap,
} from "~/lib/imports/schema-detection";
import {
  buildTemplateColumnSignature,
  buildTemplateMappingEntries,
  calculateTemplateMatch,
  type TemplateColumnSignature,
  type TemplateMappingConfig,
} from "~/lib/imports/templates";
import { createPermissionProcedure, createTRPCRouter } from "../../trpc";

const contactFieldKeyTuple = CRM_CONTACT_FIELDS.map(field => field.key) as [
  CRMContactFieldKey,
  ...CRMContactFieldKey[],
];

const dedupeModeTuple = [...DEDUPE_MODES] as [
  DedupeModeValue,
  ...DedupeModeValue[],
];
const importEntityTypeTuple = [
  "CONTACT",
  "ORGANIZATION",
  "DEAL",
] as const satisfies readonly ImportEntityType[];

const CRM_SUPPORTED_LEAD_SOURCES = [
  "WEBSITE",
  "REFERRAL",
  "SOCIAL_MEDIA",
  "EMAIL_CAMPAIGN",
  "EVENT",
  "COLD_CALL",
  "OTHER",
] as const satisfies readonly LeadSource[];

const ISSUE_SEVERITY_ERROR: IssueSeverity = "ERROR";
const ISSUE_SEVERITY_WARNING: IssueSeverity = "WARNING";

const ROW_STATUS_VALIDATED: RowStatus = "VALIDATED";
const ROW_STATUS_FAILED: RowStatus = "FAILED";
const ROW_STATUS_SKIPPED: RowStatus = "SKIPPED";
const ROW_STATUS_IMPORTED: RowStatus = "IMPORTED";

const IMPORT_STATUS_UPLOADING: ImportStatus = "UPLOADING";
const IMPORT_STATUS_DETECTING: ImportStatus = "DETECTING";
const IMPORT_STATUS_MAPPING_REVIEW: ImportStatus = "MAPPING_REVIEW";
const IMPORT_STATUS_VALIDATING: ImportStatus = "VALIDATING";
const IMPORT_STATUS_READY: ImportStatus = "READY_TO_IMPORT";
const IMPORT_STATUS_VALIDATION_FAILED: ImportStatus = "VALIDATION_FAILED";
const IMPORT_STATUS_IMPORTING: ImportStatus = "IMPORTING";
const IMPORT_STATUS_COMPLETED: ImportStatus = "COMPLETED";

const IMPORT_MODULE_CRM: ImportModule = "CRM";

const rowValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const rowRecordSchema = z.record(rowValueSchema);
const MAX_DETECTION_SAMPLE_ROWS = 500;

const mappingSchema = z.object({
  sourceColumn: z.string().min(1),
  targetField: z.enum(contactFieldKeyTuple).optional().nullable(),
});

const templateMappingEntrySchema = z.object({
  sourceColumn: z.string().min(1),
  normalizedSourceColumn: z.string().min(1),
  targetField: z.enum(contactFieldKeyTuple),
});

const templateMappingConfigSchema = z.object({
  entries: z.array(templateMappingEntrySchema).min(1),
  dedupeMode: z.enum(dedupeModeTuple),
  updatedAt: z.string(),
});

const templateColumnSignatureSchema = z.object({
  columns: z.array(z.string().min(1)),
  normalizedColumns: z.array(z.string()),
  generatedAt: z.string(),
});

type MappingEntry = z.infer<typeof mappingSchema>;

type ValidationIssue = {
  severity: IssueSeverity;
  field?: string;
  message: string;
  hint?: string;
  value?: string | null;
};

type ValidationRowResult = {
  rowNumber: number;
  rawData: ImportRowRecord;
  mappedData: Partial<Record<CRMContactFieldKey, string | null>>;
  issues: ValidationIssue[];
  status: RowStatus;
  dedupeHint?: string | null;
};

type DetectionPayload = {
  columnSuggestions: ColumnSuggestionMap;
  recommendedMapping: Record<string, CRMContactFieldKey | null>;
  columns: string[];
  sampleRowCount: number;
  generatedAt: string;
};

function parseTemplateMappingConfig(
  value: unknown
): TemplateMappingConfig | null {
  const result = templateMappingConfigSchema.safeParse(value);
  if (!result.success) {
    return null;
  }

  return result.data;
}

function parseTemplateColumnSignature(
  value: unknown
): TemplateColumnSignature | null {
  const result = templateColumnSignatureSchema.safeParse(value);
  if (!result.success) {
    return null;
  }

  return result.data;
}

type ImportTemplateDelegate = {
  findMany: (args: unknown) => Promise<unknown>;
  findFirst: (args: unknown) => Promise<unknown>;
  create: (args: unknown) => Promise<unknown>;
  update: (args: unknown) => Promise<unknown>;
  updateMany: (args: unknown) => Promise<{ count: number }>;
};

function getImportTemplateDelegate(
  db: PrismaClient | Prisma.TransactionClient
): ImportTemplateDelegate {
  return db.importTemplate as unknown as ImportTemplateDelegate;
}

const importTemplateRecordSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string(),
  usageCount: z.number(),
  lastUsedAt: z.date().nullable(),
  mappingConfig: z.unknown(),
  columnSignature: z.unknown(),
  module: z.string(),
  entityType: z.string(),
});

const importTemplateArraySchema = z.array(importTemplateRecordSchema);

function normalizeCellValue(value: ImportableValue | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return null;
    }

    return String(value);
  }

  return value ? "true" : "false";
}

function normalizeChoiceValue(value: string, uppercase = true): string {
  const formatted = uppercase ? value.toUpperCase() : value;
  return formatted.replace(/\s+/g, "_");
}

function ensureJsonObject(
  data: Record<string, string | number | boolean | null>
): Prisma.JsonObject {
  const result: Record<string, Prisma.JsonValue> = {};
  for (const [key, value] of Object.entries(data)) {
    result[key] = value as Prisma.JsonValue;
  }

  return result as Prisma.JsonObject;
}

function extractExistingId(hint: string | null | undefined): string | null {
  if (!hint) {
    return null;
  }

  if (hint.startsWith("existing:")) {
    const parts = hint.split(":");
    return parts[1] ?? null;
  }

  return null;
}

function buildCustomerData(
  mappedData: Partial<Record<CRMContactFieldKey, string | null>>,
  organizationId: string
): Prisma.CustomerUncheckedCreateInput {
  const typeValue =
    (mappedData.type as CustomerType | null | undefined) ?? "LEAD";
  const statusValue =
    (mappedData.status as LeadStatus | null | undefined) ?? null;
  const sourceValue =
    (mappedData.source as LeadSource | null | undefined) ?? null;

  return {
    organizationId,
    type: typeValue,
    status: statusValue,
    firstName: mappedData.firstName ?? "",
    lastName: mappedData.lastName ?? "",
    email: mappedData.email ?? null,
    phone: mappedData.phone ?? null,
    company: mappedData.company ?? null,
    position: mappedData.position ?? null,
    address: mappedData.address ?? null,
    city: mappedData.city ?? null,
    state: mappedData.state ?? null,
    country: mappedData.country ?? null,
    postalCode: mappedData.postalCode ?? null,
    source: sourceValue,
    notes: mappedData.notes ?? null,
  } satisfies Prisma.CustomerUncheckedCreateInput;
}

function filterUpdateData(
  mappedData: Partial<Record<CRMContactFieldKey, string | null>>
): Prisma.CustomerUncheckedUpdateInput {
  const update: Prisma.CustomerUncheckedUpdateInput = {};

  if (mappedData.firstName !== undefined && mappedData.firstName !== null) {
    update.firstName = mappedData.firstName;
  }
  if (mappedData.lastName !== undefined && mappedData.lastName !== null) {
    update.lastName = mappedData.lastName;
  }
  if (mappedData.email !== undefined && mappedData.email !== null) {
    update.email = mappedData.email;
  }
  if (mappedData.phone !== undefined && mappedData.phone !== null) {
    update.phone = mappedData.phone;
  }
  if (mappedData.company !== undefined && mappedData.company !== null) {
    update.company = mappedData.company;
  }
  if (mappedData.position !== undefined && mappedData.position !== null) {
    update.position = mappedData.position;
  }
  if (mappedData.address !== undefined && mappedData.address !== null) {
    update.address = mappedData.address;
  }
  if (mappedData.city !== undefined && mappedData.city !== null) {
    update.city = mappedData.city;
  }
  if (mappedData.state !== undefined && mappedData.state !== null) {
    update.state = mappedData.state;
  }
  if (mappedData.country !== undefined && mappedData.country !== null) {
    update.country = mappedData.country;
  }
  if (mappedData.postalCode !== undefined && mappedData.postalCode !== null) {
    update.postalCode = mappedData.postalCode;
  }
  if (mappedData.notes !== undefined && mappedData.notes !== null) {
    update.notes = mappedData.notes;
  }
  if (mappedData.type !== undefined && mappedData.type !== null) {
    update.type = mappedData.type as CustomerType;
  }
  if (mappedData.status !== undefined && mappedData.status !== null) {
    update.status = mappedData.status as LeadStatus;
  }
  if (mappedData.source !== undefined && mappedData.source !== null) {
    update.source = mappedData.source as LeadSource;
  }

  return update;
}

async function fetchExistingContacts(
  prisma: PrismaClient,
  organizationId: string,
  candidateEmails: Set<string>
): Promise<Map<string, { id: string }>> {
  if (candidateEmails.size === 0) {
    return new Map();
  }

  const contacts = await prisma.customer.findMany({
    where: {
      organizationId,
      email: {
        in: Array.from(candidateEmails),
      },
    },
    select: {
      id: true,
      email: true,
    },
  });

  const map = new Map<string, { id: string }>();
  for (const contact of contacts) {
    if (!contact.email) {
      continue;
    }

    map.set(contact.email.toLowerCase(), { id: contact.id });
  }

  return map;
}

function validateRequiredFields(
  mappedData: Partial<Record<CRMContactFieldKey, string | null>>
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const requiredField of CRM_REQUIRED_CONTACT_FIELDS) {
    if (!mappedData[requiredField]) {
      issues.push({
        severity: ISSUE_SEVERITY_ERROR,
        field: requiredField,
        message: `${requiredField} is required`,
        hint: "Map this field before continuing",
      });
    }
  }

  return issues;
}

async function prepareValidation(
  rows: ImportRowRecord[],
  mapping: MappingEntry[],
  dedupeMode: DedupeModeValue,
  existingByEmail: Map<string, { id: string }>
): Promise<{
  processedRows: ValidationRowResult[];
  totals: {
    valid: number;
    failed: number;
    skipped: number;
    duplicates: number;
  };
}> {
  const processedRows: ValidationRowResult[] = [];
  let valid = 0;
  let failed = 0;
  let skipped = 0;
  let duplicates = 0;

  const fileEmailTracker = new Map<string, number>();

  rows.forEach((row, index) => {
    const issues: ValidationIssue[] = [];
    const mapped: Partial<Record<CRMContactFieldKey, string | null>> = {};

    for (const entry of mapping) {
      const { sourceColumn, targetField } = entry;
      if (!targetField) {
        continue;
      }

      const rawValue = row[sourceColumn];
      const normalized = normalizeCellValue(rawValue);
      if (normalized === null) {
        mapped[targetField] = null;
        continue;
      }

      if (targetField === "email") {
        if (EMAIL_REGEX.test(normalized)) {
          mapped.email = normalized.toLowerCase();
        } else {
          issues.push({
            severity: ISSUE_SEVERITY_ERROR,
            field: targetField,
            message: "Email is not valid",
            hint: "Provide a valid email address",
            value: normalized,
          });
        }
        continue;
      }

      if (targetField === "status") {
        const candidate = normalizeChoiceValue(normalized);
        if (CRM_SUPPORTED_LEAD_STATUS.some(status => status === candidate)) {
          mapped.status = candidate;
        } else {
          issues.push({
            severity: ISSUE_SEVERITY_ERROR,
            field: targetField,
            message: "Status is not recognized",
            hint: "Use a valid CRM lead status",
            value: normalized,
          });
        }
        continue;
      }

      if (targetField === "type") {
        const candidate = normalizeChoiceValue(normalized);
        if (CRM_SUPPORTED_CONTACT_TYPES.some(type => type === candidate)) {
          mapped.type = candidate;
        } else {
          issues.push({
            severity: ISSUE_SEVERITY_ERROR,
            field: targetField,
            message: "Contact type is not recognized",
            hint: "Use lead, prospect, customer, or former",
            value: normalized,
          });
        }
        continue;
      }

      if (targetField === "source") {
        const candidate = normalizeChoiceValue(normalized);
        if (CRM_SUPPORTED_LEAD_SOURCES.some(source => source === candidate)) {
          mapped.source = candidate;
        } else {
          issues.push({
            severity: ISSUE_SEVERITY_ERROR,
            field: targetField,
            message: "Lead source is not recognized",
            hint: "Use one of the supported CRM lead sources",
            value: normalized,
          });
        }
        continue;
      }

      mapped[targetField] = normalized;
    }

    issues.push(...validateRequiredFields(mapped));

    const normalizedEmail = mapped.email ?? null;
    let dedupeHint: string | null = null;
    if (normalizedEmail) {
      const lowerEmail = normalizedEmail.toLowerCase();
      const seenCount = fileEmailTracker.get(lowerEmail) ?? 0;
      fileEmailTracker.set(lowerEmail, seenCount + 1);
      if (seenCount > 0) {
        duplicates += 1;
        issues.push({
          severity: ISSUE_SEVERITY_ERROR,
          field: "email",
          message: "Duplicate email in file",
          hint: "Ensure each row has a unique email",
          value: lowerEmail,
        });
      }

      const existing = existingByEmail.get(lowerEmail);
      if (existing) {
        if (dedupeMode === "SKIP") {
          issues.push({
            severity: ISSUE_SEVERITY_WARNING,
            field: "email",
            message: "Existing contact will be skipped",
            hint: "Select UPDATE mode to merge with existing contacts",
            value: lowerEmail,
          });
        }
        dedupeHint = `existing:${existing.id}`;
      }
    }

    let status: RowStatus = ROW_STATUS_VALIDATED;
    if (issues.some(issue => issue.severity === ISSUE_SEVERITY_ERROR)) {
      status = ROW_STATUS_FAILED;
      failed += 1;
    } else if (dedupeMode === "SKIP" && dedupeHint) {
      status = ROW_STATUS_SKIPPED;
      skipped += 1;
    } else {
      valid += 1;
    }

    processedRows.push({
      rowNumber: index + 1,
      rawData: row,
      mappedData: mapped,
      issues,
      status,
      dedupeHint,
    });
  });

  return {
    processedRows,
    totals: {
      valid,
      failed,
      skipped,
      duplicates,
    },
  };
}

function toMappedData(
  json: Prisma.JsonObject | null
): Partial<Record<CRMContactFieldKey, string | null>> {
  if (!json) {
    return {};
  }

  const mapped: Partial<Record<CRMContactFieldKey, string | null>> = {};

  for (const [key, value] of Object.entries(json)) {
    const fieldKey = key as CRMContactFieldKey;
    if (typeof value === "string") {
      mapped[fieldKey] = value;
    } else if (value === null) {
      mapped[fieldKey] = null;
    } else if (typeof value === "number" || typeof value === "boolean") {
      mapped[fieldKey] = String(value);
    } else {
      mapped[fieldKey] = null;
    }
  }

  return mapped;
}

export const crmImportRouter = createTRPCRouter({
  createUploadSession: createPermissionProcedure(PERMISSIONS.CRM_WRITE)
    .input(
      z.object({
        organizationId: z.string().cuid(),
        entityType: z.enum(importEntityTypeTuple).default("CONTACT"),
        fileName: z.string().min(1),
        fileSize: z.number().int().nonnegative(),
        fileType: z.string().optional(),
        columns: z.array(z.string().min(1)).min(1),
        rowCount: z.number().int().nonnegative(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);

      const session = await ctx.db.importSession.create({
        data: {
          organizationId: input.organizationId,
          createdByUserId: ctx.user.id,
          fileName: input.fileName,
          fileSize: input.fileSize,
          fileType: input.fileType ?? null,
          module: IMPORT_MODULE_CRM,
          entityType: input.entityType as ImportEntityType,
          status: IMPORT_STATUS_UPLOADING,
          rowCount: input.rowCount,
        },
        select: {
          id: true,
          status: true,
          rowCount: true,
        },
      });

      return session;
    }),

  detectSchema: createPermissionProcedure(PERMISSIONS.CRM_WRITE)
    .input(
      z.object({
        sessionId: z.string().cuid(),
        organizationId: z.string().cuid(),
        columns: z.array(z.string().min(1)).min(1),
        sampleRows: z
          .array(rowRecordSchema)
          .min(1)
          .max(MAX_DETECTION_SAMPLE_ROWS),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);

      const session = await ctx.db.importSession.findFirst({
        where: {
          id: input.sessionId,
          organizationId: input.organizationId,
        },
        select: {
          id: true,
          mappingConfig: true,
        },
      });

      if (!session) {
        throw new Error("Import session not found");
      }

      await ctx.db.importSession.update({
        where: { id: session.id },
        data: {
          status: IMPORT_STATUS_DETECTING,
        },
      });

      const { columnSuggestions, recommendedMapping } =
        generateContactSchemaSuggestions({
          columns: input.columns,
          rows: input.sampleRows,
        });

      const detectionPayload: DetectionPayload = {
        columnSuggestions,
        recommendedMapping,
        columns: input.columns,
        sampleRowCount: input.sampleRows.length,
        generatedAt: new Date().toISOString(),
      };

      const existingConfig =
        session.mappingConfig &&
        typeof session.mappingConfig === "object" &&
        !Array.isArray(session.mappingConfig)
          ? (session.mappingConfig as Record<string, unknown>)
          : undefined;
      const baseConfig = existingConfig ?? {};

      await ctx.db.importSession.update({
        where: { id: session.id },
        data: {
          status: IMPORT_STATUS_MAPPING_REVIEW,
          mappingConfig: {
            ...baseConfig,
            detection: detectionPayload,
          },
        },
      });

      return detectionPayload;
    }),

  listTemplates: createPermissionProcedure(PERMISSIONS.CRM_WRITE)
    .input(
      z.object({
        organizationId: z.string().cuid(),
        columns: z.array(z.string().min(1)).optional(),
        limit: z.number().int().min(1).max(50).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);

      const importTemplateDelegate = getImportTemplateDelegate(ctx.db);

      const rawTemplates = await importTemplateDelegate.findMany({
        where: {
          organizationId: input.organizationId,
          module: IMPORT_MODULE_CRM,
          entityType: "CONTACT",
        },
        orderBy: [{ usageCount: "desc" }, { createdAt: "desc" }],
        take: input.limit ?? 25,
      });

      const templates = importTemplateArraySchema.parse(rawTemplates);

      const columns = input.columns ?? [];

      const summaries = templates
        .map(template => {
          const mappingConfig = parseTemplateMappingConfig(
            template.mappingConfig
          );
          const columnSignature = parseTemplateColumnSignature(
            template.columnSignature
          );

          if (!mappingConfig || !columnSignature) {
            return null;
          }

          const matchResult =
            columns.length > 0
              ? calculateTemplateMatch({
                  signature: columnSignature,
                  columns,
                })
              : null;

          return {
            id: template.id,
            name: template.name,
            usageCount: template.usageCount,
            lastUsedAt: template.lastUsedAt
              ? template.lastUsedAt.toISOString()
              : null,
            mapping: mappingConfig,
            columnSignature,
            matchScore: matchResult?.score ?? null,
            coverage: matchResult?.coverage ?? null,
          };
        })
        .filter(
          (entry): entry is Exclude<typeof entry, null> => entry !== null
        );

      return summaries;
    }),

  saveTemplate: createPermissionProcedure(PERMISSIONS.CRM_WRITE)
    .input(
      z.object({
        sessionId: z.string().cuid(),
        organizationId: z.string().cuid(),
        name: z.string().min(2).max(100),
        mapping: z.array(mappingSchema).min(1),
        columns: z.array(z.string().min(1)).min(1),
        dedupeMode: z.enum(dedupeModeTuple),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);

      const session = await ctx.db.importSession.findFirst({
        where: {
          id: input.sessionId,
          organizationId: input.organizationId,
        },
        select: {
          id: true,
        },
      });

      if (!session) {
        throw new Error("Import session not found");
      }

      const templateName = input.name.trim();
      if (templateName.length < 2) {
        throw new Error("Template name must be at least 2 characters long");
      }

      const mappingRecord: Record<string, CRMContactFieldKey | ""> = {};
      input.mapping.forEach(entry => {
        const target = entry.targetField ?? null;
        mappingRecord[entry.sourceColumn] = target ?? "";
      });

      const entries = buildTemplateMappingEntries({
        columns: input.columns,
        mapping: mappingRecord,
      });

      if (entries.length === 0) {
        throw new Error(
          "Map at least one field before saving this configuration as a template"
        );
      }

      const mappedTargets = new Set(entries.map(entry => entry.targetField));
      for (const required of CRM_REQUIRED_CONTACT_FIELDS) {
        if (!mappedTargets.has(required)) {
          throw new Error(
            `Required field "${required}" must be mapped before saving a template`
          );
        }
      }

      const mappingConfig: TemplateMappingConfig = {
        entries,
        dedupeMode: input.dedupeMode,
        updatedAt: new Date().toISOString(),
      };

      const columnSignature = buildTemplateColumnSignature(input.columns);

      const importTemplateDelegate = getImportTemplateDelegate(ctx.db);

      try {
        const createdTemplate = await importTemplateDelegate.create({
          data: {
            organizationId: input.organizationId,
            createdByUserId: ctx.user.id,
            name: templateName,
            module: IMPORT_MODULE_CRM,
            entityType: "CONTACT",
            mappingConfig: mappingConfig as unknown as Prisma.JsonObject,
            columnSignature: columnSignature as unknown as Prisma.JsonObject,
          },
        });

        const template = importTemplateRecordSchema.parse(createdTemplate);

        return {
          id: template.id,
          name: template.name,
          usageCount: template.usageCount,
          lastUsedAt: template.lastUsedAt
            ? template.lastUsedAt.toISOString()
            : null,
          mapping: mappingConfig,
          columnSignature,
          matchScore: null,
          coverage: null,
        };
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          throw new Error(
            "A template with this name already exists in your organization"
          );
        }

        throw error;
      }
    }),

  markTemplateUsage: createPermissionProcedure(PERMISSIONS.CRM_WRITE)
    .input(
      z.object({
        templateId: z.string().cuid(),
        organizationId: z.string().cuid(),
        sessionId: z.string().cuid().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);

      const importTemplateDelegate = getImportTemplateDelegate(ctx.db);

      const rawTemplate = await importTemplateDelegate.findFirst({
        where: {
          id: input.templateId,
          organizationId: input.organizationId,
        },
      });

      const template = importTemplateRecordSchema.nullable().parse(rawTemplate);

      if (!template) {
        throw new Error("Template not found");
      }

      await ctx.db.$transaction(async tx => {
        const txTemplateDelegate = getImportTemplateDelegate(tx);

        await txTemplateDelegate.update({
          where: { id: template.id },
          data: {
            usageCount: { increment: 1 },
            lastUsedAt: new Date(),
          },
        });

        if (input.sessionId) {
          await tx.importSession.updateMany({
            where: {
              id: input.sessionId,
              organizationId: input.organizationId,
            },
            data: {
              appliedTemplateId: template.id,
            },
          });
        }
      });

      return { templateId: template.id };
    }),

  validateManualPreview: createPermissionProcedure(PERMISSIONS.CRM_WRITE)
    .input(
      z.object({
        sessionId: z.string().cuid(),
        organizationId: z.string().cuid(),
        mapping: z.array(mappingSchema).min(1),
        rows: z.array(rowRecordSchema).min(1),
        dedupeMode: z.enum(dedupeModeTuple),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);

      const session = await ctx.db.importSession.findFirst({
        where: {
          id: input.sessionId,
          organizationId: input.organizationId,
        },
        select: {
          id: true,
          mappingConfig: true,
        },
      });

      if (!session) {
        throw new Error("Import session not found");
      }

      const existingConfig =
        session.mappingConfig &&
        typeof session.mappingConfig === "object" &&
        !Array.isArray(session.mappingConfig)
          ? (session.mappingConfig as Record<string, unknown>)
          : undefined;

      const detectionConfig =
        existingConfig && typeof existingConfig.detection !== "undefined"
          ? existingConfig.detection
          : undefined;

      await ctx.db.importSession.update({
        where: { id: session.id },
        data: {
          status: IMPORT_STATUS_VALIDATING,
        },
      });

      const activeMapping = input.mapping.filter(entry => entry.targetField);
      const mappedTargets = new Set(
        activeMapping
          .map(entry => entry.targetField)
          .filter(
            (target): target is CRMContactFieldKey =>
              target !== undefined && target !== null
          )
      );

      for (const required of CRM_REQUIRED_CONTACT_FIELDS) {
        if (!mappedTargets.has(required)) {
          throw new Error(
            `Required field "${required}" is missing from the field mapping`
          );
        }
      }

      const candidateEmails = new Set<string>();
      for (const row of input.rows) {
        for (const mappingEntry of activeMapping) {
          if (mappingEntry.targetField !== "email") {
            continue;
          }

          const value = normalizeCellValue(row[mappingEntry.sourceColumn]);
          if (value) {
            candidateEmails.add(value.toLowerCase());
          }
        }
      }

      const existingByEmail = await fetchExistingContacts(
        ctx.db,
        input.organizationId,
        candidateEmails
      );

      const { processedRows, totals } = await prepareValidation(
        input.rows,
        activeMapping,
        input.dedupeMode,
        existingByEmail
      );

      const previewRows = processedRows.slice(0, 25).map(row => ({
        rowNumber: row.rowNumber,
        status: row.status,
        issues: row.issues,
        rawData: row.rawData,
        mappedData: row.mappedData,
      }));

      const sessionStatus =
        totals.failed > 0
          ? IMPORT_STATUS_VALIDATION_FAILED
          : IMPORT_STATUS_READY;

      await ctx.db.$transaction(async tx => {
        await tx.importRowIssue.deleteMany({
          where: { sessionId: input.sessionId },
        });
        await tx.importRow.deleteMany({
          where: { sessionId: input.sessionId },
        });

        for (const row of processedRows) {
          const createdRow = await tx.importRow.create({
            data: {
              sessionId: input.sessionId,
              rowNumber: row.rowNumber,
              rawData: ensureJsonObject(row.rawData),
              mappedData: ensureJsonObject(
                Object.fromEntries(
                  Object.entries(row.mappedData).map(([key, value]) => [
                    key,
                    value ?? null,
                  ])
                )
              ),
              status: row.status,
              dedupeHint: row.dedupeHint ?? null,
            },
          });

          if (row.issues.length > 0) {
            await tx.importRowIssue.createMany({
              data: row.issues.map(issue => ({
                sessionId: input.sessionId,
                rowId: createdRow.id,
                field: issue.field ?? null,
                severity: issue.severity,
                message: issue.message,
                hint: issue.hint ?? null,
                value: issue.value ?? null,
              })),
            });
          }
        }

        const mappingConfigPayload = {
          ...(detectionConfig !== undefined
            ? { detection: detectionConfig as Prisma.JsonValue }
            : {}),
          mapping: {
            entries: activeMapping,
            dedupeMode: input.dedupeMode,
            updatedAt: new Date().toISOString(),
          },
        } as const;

        await tx.importSession.update({
          where: { id: input.sessionId },
          data: {
            mappingConfig: mappingConfigPayload as Prisma.JsonObject,
            dedupeMode: input.dedupeMode as DedupeMode,
            status: sessionStatus,
            processedCount: totals.valid + totals.failed + totals.skipped,
            successCount: totals.valid,
            failureCount: totals.failed,
            skippedCount: totals.skipped,
          },
        });
      });

      return {
        sessionId: input.sessionId,
        previewRows,
        summary: {
          totalRows: processedRows.length,
          validRows: totals.valid,
          failedRows: totals.failed,
          skippedRows: totals.skipped,
          duplicateEmails: totals.duplicates,
          status: sessionStatus,
        },
      };
    }),

  commitImport: createPermissionProcedure(PERMISSIONS.CRM_WRITE)
    .input(
      z.object({
        sessionId: z.string().cuid(),
        organizationId: z.string().cuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);

      const session = await ctx.db.importSession.findFirst({
        where: {
          id: input.sessionId,
          organizationId: input.organizationId,
        },
        include: {
          rows: true,
        },
      });

      if (!session) {
        throw new Error("Import session not found");
      }

      if (session.status !== IMPORT_STATUS_READY) {
        throw new Error(
          "Import session is not ready to import. Resolve validation issues first."
        );
      }

      const dedupeMode = session.dedupeMode;

      await ctx.db.importSession.update({
        where: { id: session.id },
        data: {
          status: IMPORT_STATUS_IMPORTING,
          startedAt: session.startedAt ?? new Date(),
        },
      });

      let successCount = 0;
      let failureCount = 0;
      let skippedCount = 0;

      await ctx.db.$transaction(async tx => {
        for (const row of session.rows) {
          if (row.status === ROW_STATUS_SKIPPED) {
            skippedCount += 1;
            continue;
          }

          const mappedData = toMappedData(
            row.mappedData as Prisma.JsonObject | null
          );
          if (Object.keys(mappedData).length === 0) {
            failureCount += 1;
            await tx.importRow.update({
              where: { id: row.id },
              data: { status: ROW_STATUS_FAILED },
            });
            continue;
          }

          const existingId = extractExistingId(row.dedupeHint);

          try {
            if (dedupeMode === "UPDATE" && existingId) {
              const updateData = filterUpdateData(mappedData);
              if (Object.keys(updateData).length === 0) {
                skippedCount += 1;
                await tx.importRow.update({
                  where: { id: row.id },
                  data: { status: ROW_STATUS_SKIPPED },
                });
                continue;
              }

              await tx.customer.update({
                where: {
                  id: existingId,
                },
                data: updateData,
              });
            } else {
              const createData = buildCustomerData(
                mappedData,
                input.organizationId
              );
              await tx.customer.create({
                data: createData,
              });
            }

            successCount += 1;
            await tx.importRow.update({
              where: { id: row.id },
              data: { status: ROW_STATUS_IMPORTED },
            });
          } catch (error) {
            console.error("Failed to import row", error);
            failureCount += 1;
            await tx.importRow.update({
              where: { id: row.id },
              data: { status: ROW_STATUS_FAILED },
            });

            await tx.importRowIssue.create({
              data: {
                sessionId: session.id,
                rowId: row.id,
                severity: ISSUE_SEVERITY_ERROR,
                message: "Failed to import row",
                hint: "Please review the row data and try again",
                value: null,
              },
            });
          }
        }

        await tx.importSession.update({
          where: { id: session.id },
          data: {
            status: IMPORT_STATUS_COMPLETED,
            successCount,
            failureCount,
            skippedCount,
            completedAt: new Date(),
          },
        });
      });

      return {
        sessionId: session.id,
        status: IMPORT_STATUS_COMPLETED,
        results: {
          imported: successCount,
          failed: failureCount,
          skipped: skippedCount,
          total: successCount + failureCount + skippedCount,
        },
      };
    }),

  getSessionSummary: createPermissionProcedure(PERMISSIONS.CRM_WRITE)
    .input(
      z.object({
        sessionId: z.string().cuid(),
        organizationId: z.string().cuid(),
      })
    )
    .query(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);

      const session = await ctx.db.importSession.findFirst({
        where: {
          id: input.sessionId,
          organizationId: input.organizationId,
        },
        select: {
          id: true,
          status: true,
          successCount: true,
          failureCount: true,
          skippedCount: true,
          rowCount: true,
          completedAt: true,
        },
      });

      if (!session) {
        throw new Error("Import session not found");
      }

      return session;
    }),
});
