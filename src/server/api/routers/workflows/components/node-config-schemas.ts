import { z } from "zod";
import type { WorkflowNodeType } from "@prisma/client";

const nonEmptyString = () => z.string().trim().min(1);
const optionalNonEmptyString = () => nonEmptyString().optional();
const trimmedUnknown = () =>
  z
    .unknown()
    .transform(value => (typeof value === "string" ? value.trim() : value));

const logicalOperatorSchema = z.enum(["AND", "OR"]);

const queryOrderSchema = z.object({
  field: nonEmptyString(),
  direction: z.enum(["asc", "desc"]).optional(),
});

const queryFilterSchema = z.object({
  field: nonEmptyString(),
  operator: z.enum([
    "equals",
    "not_equals",
    "gt",
    "gte",
    "lt",
    "lte",
    "contains",
    "not_contains",
    "starts_with",
    "ends_with",
    "in",
    "not_in",
    "between",
    "is_empty",
    "is_not_empty",
  ]),
  value: trimmedUnknown().optional(),
  valueTo: trimmedUnknown().optional(),
  values: z.array(trimmedUnknown()).optional(),
  path: optionalNonEmptyString(),
  negate: z.boolean().optional(),
});

export const queryNodeConfigSchema = z.object({
  model: nonEmptyString(),
  filters: z.array(queryFilterSchema).optional(),
  orderBy: z.array(queryOrderSchema).optional(),
  limit: z.number().int().positive().max(1000).optional(),
  offset: z.number().int().min(0).optional(),
  select: z.array(nonEmptyString()).optional(),
  include: z.array(nonEmptyString()).optional(),
  resultKey: optionalNonEmptyString(),
  fallbackKey: optionalNonEmptyString(),
});

export const loopNodeConfigSchema = z.object({
  dataSource: optionalNonEmptyString(),
  sourceKey: optionalNonEmptyString(),
  itemVariable: nonEmptyString().default("item"),
  indexVariable: nonEmptyString().default("index"),
  maxIterations: z.number().int().positive().max(10000).optional(),
  resultKey: optionalNonEmptyString(),
  emptyPathHandle: optionalNonEmptyString(),
});

export const filterNodeConfigSchema = z.object({
  sourceKey: nonEmptyString(),
  conditions: z.array(queryFilterSchema).optional(),
  logicalOperator: logicalOperatorSchema.default("AND"),
  resultKey: optionalNonEmptyString(),
  fallbackKey: optionalNonEmptyString(),
});

export const conditionNodeConfigSchema = z.object({
  conditions: z.array(queryFilterSchema).optional(),
  logicalOperator: logicalOperatorSchema.default("AND"),
  resultKey: optionalNonEmptyString(),
});

export const delayNodeConfigSchema = z.object({
  delayMs: z
    .number()
    .int()
    .min(0)
    .max(1000 * 60 * 60 * 24 * 7)
    .default(1000),
  resultKey: optionalNonEmptyString(),
});

export const scheduleNodeConfigSchema = z
  .object({
    cron: optionalNonEmptyString(),
    frequency: optionalNonEmptyString(),
    timezone: nonEmptyString().default("UTC"),
    startAt: optionalNonEmptyString(),
    endAt: optionalNonEmptyString(),
    isActive: z.boolean().optional(),
    resultKey: optionalNonEmptyString(),
    metadata: z.record(z.unknown()).optional(),
  })
  .superRefine((config, ctx) => {
    if (!config.cron && !config.frequency) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide either a cron expression or a frequency",
        path: ["cron"],
      });
    }
  });

export const nodeConfigSchemaByType: Partial<
  Record<WorkflowNodeType, z.ZodSchema<unknown>>
> = {
  LOOP: loopNodeConfigSchema,
  QUERY: queryNodeConfigSchema,
  FILTER: filterNodeConfigSchema,
  CONDITION: conditionNodeConfigSchema,
  DELAY: delayNodeConfigSchema,
  SCHEDULE: scheduleNodeConfigSchema,
};

export const requiresConfigTypes = new Set<WorkflowNodeType>([
  "LOOP",
  "QUERY",
  "FILTER",
  "CONDITION",
  "DELAY",
  "SCHEDULE",
]);

export const parseConfigForType = (type: WorkflowNodeType, config: unknown) => {
  const schema = nodeConfigSchemaByType[type];
  if (!schema) {
    return config ?? null;
  }

  if (config === undefined || config === null) {
    return null;
  }

  return schema.parse(config);
};
