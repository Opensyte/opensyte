"use client";

import React, { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Checkbox } from "~/components/ui/checkbox";
import { toast } from "sonner";
import { ClientPermissionGuard } from "~/components/shared/client-permission-guard";
import { PERMISSIONS } from "~/lib/rbac";
import type { WorkflowCanvasNode } from "~/hooks/use-workflow-canvas";
import { Plus, Trash2 } from "lucide-react";
import { Skeleton } from "~/components/ui/skeleton";
import { useWorkflowNodePrefill } from "~/hooks/use-workflow-node-prefill";

const integerField = z.preprocess(
  value => {
    if (value === undefined || value === null) {
      return undefined;
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length === 0) {
        return undefined;
      }
      const parsed = Number(trimmed);
      return Number.isNaN(parsed) ? value : parsed;
    }
    return value;
  },
  z
    .number({ invalid_type_error: "Enter a valid number" })
    .int("Value must be an integer")
    .min(0, "Value cannot be negative")
    .max(10000, "Value is too large")
    .optional()
);

const OPERATORS = [
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
] as const;

type Operator = (typeof OPERATORS)[number];

const isOperator = (value: unknown): value is Operator => {
  return (
    typeof value === "string" &&
    (OPERATORS as readonly string[]).includes(value as Operator)
  );
};

const filterSchema = z.object({
  field: z.string().trim().min(1, { message: "Field is required" }),
  operator: z.enum(OPERATORS),
  value: z.string().trim().optional(),
  negate: z.boolean().optional(),
});

const schema = z.object({
  name: z.string().trim().min(1, { message: "Name is required" }),
  model: z.string().trim().min(1, { message: "Model is required" }),
  limit: integerField,
  offset: integerField,
  resultKey: z.string().trim().optional(),
  fallbackKey: z.string().trim().optional(),
  filters: z.array(filterSchema).default([]),
  orderByField: z.string().trim().optional(),
  orderByDirection: z.enum(["asc", "desc"]).default("asc"),
  selectFields: z.string().trim().optional(),
  includeRelations: z.string().trim().optional(),
});

export interface QueryNodeFormProps {
  node: WorkflowCanvasNode;
  onNodeUpdate: (nodeId: string, data: Record<string, unknown>) => void;
  ensureNodeExists: (nodeId: string) => Promise<string>;
  onClose: () => void;
  workflowId?: string;
  organizationId?: string;
}

export function QueryNodeForm({
  node,
  onNodeUpdate,
  ensureNodeExists,
  onClose,
  workflowId,
  organizationId,
}: QueryNodeFormProps) {
  const {
    config,
    name: nodeName,
    isLoading: isPrefilling,
  } = useWorkflowNodePrefill({
    workflowId,
    organizationId,
    node,
  });

  const defaults = React.useMemo<z.infer<typeof schema>>(() => {
    const getString = (key: string) => {
      const raw = config[key];
      return typeof raw === "string" ? raw : undefined;
    };
    const getNumber = (key: string) => {
      const raw = config[key];
      return typeof raw === "number" ? raw : undefined;
    };

    const rawFilters = Array.isArray(config.filters)
      ? (config.filters as Array<Record<string, unknown>>)
      : Array.isArray(node.data.filters)
        ? node.data.filters
        : [];

    const parsedFilters = rawFilters
      .map(raw => {
        const field = typeof raw.field === "string" ? raw.field.trim() : "";
        const operator = isOperator(raw.operator) ? raw.operator : "equals";
        const value = typeof raw.value === "string" ? raw.value : undefined;
        const negate = typeof raw.negate === "boolean" ? raw.negate : undefined;
        return { field, operator, value, negate } satisfies z.infer<
          typeof filterSchema
        >;
      })
      .filter(filter => filter.field.length > 0);

    const orderByRaw = Array.isArray(config.orderBy)
      ? (config.orderBy as Array<Record<string, unknown>>)
      : undefined;
    const firstOrder = orderByRaw?.[0];
    const orderByField =
      typeof firstOrder?.field === "string" ? firstOrder.field : "";
    const orderByDirection =
      firstOrder && typeof firstOrder.direction === "string"
        ? firstOrder.direction === "desc"
          ? "desc"
          : "asc"
        : "asc";

    const selectFields = Array.isArray(config.select)
      ? (config.select as string[]).join(", ")
      : "";
    const includeRelations = Array.isArray(config.include)
      ? (config.include as string[]).join(", ")
      : "";

    return {
      name: nodeName ?? node.data.label ?? "Query",
      model:
        getString("model") ??
        (typeof node.data.model === "string" ? node.data.model : "contacts"),
      limit:
        getNumber("limit") ??
        (typeof node.data.limit === "number" ? node.data.limit : undefined),
      offset:
        getNumber("offset") ??
        (typeof node.data.offset === "number" ? node.data.offset : undefined),
      resultKey:
        getString("resultKey") ??
        (typeof node.data.resultKey === "string"
          ? node.data.resultKey
          : undefined),
      fallbackKey:
        getString("fallbackKey") ??
        (typeof node.data.fallbackKey === "string"
          ? node.data.fallbackKey
          : undefined),
      filters: parsedFilters,
      orderByField,
      orderByDirection,
      selectFields,
      includeRelations,
    } satisfies z.infer<typeof schema>;
  }, [config, node.data, nodeName]);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "filters",
  });

  const modelValue = form.watch("model");
  const limitValue = form.watch("limit");
  const orderByFieldValue = form.watch("orderByField") ?? "";

  useEffect(() => {
    form.reset(defaults);
  }, [defaults, form]);

  const onAddFilter = () => {
    append({ field: "", operator: "equals", value: "" });
  };

  const onSubmit = form.handleSubmit(async values => {
    const filters = values.filters
      .map(filter => ({
        field: filter.field.trim(),
        operator: filter.operator,
        value: filter.value?.trim(),
        negate: filter.negate,
      }))
      .filter(filter => filter.field.length > 0);

    const orderByField = values.orderByField?.trim();
    const orderBy = orderByField
      ? [
          {
            field: orderByField,
            direction: values.orderByDirection ?? "asc",
          },
        ]
      : undefined;

    const select = values.selectFields
      ?.split(",")
      .map(entry => entry.trim())
      .filter(Boolean);
    const include = values.includeRelations
      ?.split(",")
      .map(entry => entry.trim())
      .filter(Boolean);

    const config: Record<string, unknown> = {
      model: values.model.trim(),
      limit: values.limit,
      offset: values.offset,
      resultKey: values.resultKey?.trim(),
      fallbackKey: values.fallbackKey?.trim(),
      filters: filters.length > 0 ? filters : undefined,
      orderBy,
      select: select && select.length > 0 ? select : undefined,
      include: include && include.length > 0 ? include : undefined,
    };

    Object.entries(config).forEach(([key, val]) => {
      if (val === undefined) {
        delete config[key];
        return;
      }
      if (typeof val === "string" && val.length === 0) {
        delete config[key];
      }
    });

    onNodeUpdate(node.id, {
      name: values.name,
      label: values.name,
      model: values.model.trim(),
      resultKey: values.resultKey?.trim(),
      fallbackKey: values.fallbackKey?.trim(),
      limit: values.limit,
      offset: values.offset,
      config,
    });

    await ensureNodeExists(node.id);
    toast.success("Query node saved");
    onClose();
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Query Node</CardTitle>
            <CardDescription>
              Find records that match specific criteria.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {isPrefilling ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : null}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormDescription>
                    Give this search a clear, action-focused label.
                  </FormDescription>
                  <FormControl>
                    <Input placeholder="Query node name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="model"
              render={({ field }) => {
                const options = [
                  {
                    value: "contacts",
                    label: "Contacts",
                    description: "CRM people and companies",
                  },
                  {
                    value: "deals",
                    label: "Deals",
                    description: "Sales pipeline records",
                  },
                  {
                    value: "projects",
                    label: "Projects",
                    description: "Project management workspaces",
                  },
                  {
                    value: "tasks",
                    label: "Tasks",
                    description: "Individual project tasks",
                  },
                  {
                    value: "invoices",
                    label: "Invoices",
                    description: "Finance module invoices",
                  },
                  {
                    value: "employees",
                    label: "Employees",
                    description: "HR team members",
                  },
                ] as const;
                const isCustom =
                  field.value !== undefined &&
                  field.value !== "" &&
                  !options.some(option => option.value === field.value);
                const selectValue = isCustom
                  ? "__custom"
                  : (field.value ?? "contacts");

                return (
                  <FormItem>
                    <FormLabel>Which records do you need?</FormLabel>
                    <FormDescription>
                      Choose a dataset or type the Prisma model name.
                    </FormDescription>
                    <Select
                      value={selectValue}
                      onValueChange={value => {
                        if (value === "__custom") {
                          field.onChange("");
                          return;
                        }
                        field.onChange(value);
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {options.map(option => (
                          <SelectItem
                            key={option.value}
                            value={option.value}
                            textValue={option.label}
                          >
                            <div className="flex flex-col text-left">
                              <span>{option.label}</span>
                              <span className="text-xs text-muted-foreground">
                                {option.description}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                        <SelectItem value="__custom" textValue="Custom model">
                          Custom model
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {selectValue === "__custom" ? (
                      <FormControl>
                        <Input
                          className="mt-2"
                          placeholder="Prisma model name"
                          value={modelValue ?? ""}
                          onChange={event => field.onChange(event.target.value)}
                        />
                      </FormControl>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Filters</CardTitle>
                <CardDescription>
                  Add conditions to refine the results.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={onAddFilter}
              >
                <Plus className="h-4 w-4" /> Add Filter
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {fields.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No filters applied. Add one to limit results.
              </p>
            )}
            {fields.map((fieldItem, index) => (
              <div
                key={fieldItem.id}
                className="space-y-3 rounded-md border border-border/40 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-sm font-medium">Filter {index + 1}</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Separator />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name={`filters.${index}.field`}
                    render={({ field }) => {
                      const suggestions = [
                        "status",
                        "ownerId",
                        "assignedToId",
                        "createdAt",
                        "updatedAt",
                        "total",
                      ] as const;
                      const isCustom =
                        field.value !== undefined &&
                        field.value !== "" &&
                        !suggestions.includes(
                          field.value as (typeof suggestions)[number]
                        );
                      const selectValue = isCustom
                        ? "__custom"
                        : (field.value ?? "status");

                      return (
                        <FormItem>
                          <FormLabel>Field</FormLabel>
                          <Select
                            value={selectValue}
                            onValueChange={value => {
                              if (value === "__custom") {
                                field.onChange("");
                                return;
                              }
                              field.onChange(value);
                            }}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {suggestions.map(option => (
                                <SelectItem
                                  key={option}
                                  value={option}
                                  textValue={option}
                                >
                                  {option}
                                </SelectItem>
                              ))}
                              <SelectItem
                                value="__custom"
                                textValue="Custom field"
                              >
                                Custom field
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          {selectValue === "__custom" ? (
                            <FormControl>
                              <Input
                                className="mt-2"
                                placeholder="payload.status"
                                value={field.value ?? ""}
                                onChange={event =>
                                  field.onChange(event.target.value)
                                }
                              />
                            </FormControl>
                          ) : null}
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                  <FormField
                    control={form.control}
                    name={`filters.${index}.operator`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Operator</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select operator" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {OPERATORS.map(option => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`filters.${index}.value`}
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Value</FormLabel>
                        <FormDescription>
                          Leave blank for operators like "is empty".
                        </FormDescription>
                        <FormControl>
                          <Input placeholder="Value" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`filters.${index}.negate`}
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value ?? false}
                            onCheckedChange={checked =>
                              field.onChange(Boolean(checked))
                            }
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Negate</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Results & sorting</CardTitle>
            <CardDescription>
              Control how many records are returned and in what order.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 pt-0 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="limit"
              render={({ field }) => {
                const presets = [25, 50, 100, 250] as const;
                const selectValue = (() => {
                  if (field.value === undefined) return "none";
                  const match = presets.find(item => item === field.value);
                  return match ? String(match) : "custom";
                })();

                return (
                  <FormItem>
                    <FormLabel>Max results</FormLabel>
                    <FormDescription>
                      Keep queries lightweight by limiting the number of rows.
                    </FormDescription>
                    <Select
                      value={selectValue}
                      onValueChange={value => {
                        if (value === "none") {
                          field.onChange(undefined);
                          return;
                        }
                        if (value === "custom") {
                          field.onChange(field.value ?? undefined);
                          return;
                        }
                        field.onChange(Number(value));
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none" textValue="No limit">
                          No limit
                        </SelectItem>
                        {presets.map(option => (
                          <SelectItem
                            key={option}
                            value={String(option)}
                            textValue={`${option}`}
                          >
                            {option.toLocaleString()} records
                          </SelectItem>
                        ))}
                        <SelectItem value="custom" textValue="Custom">
                          Custom number
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {selectValue === "custom" ? (
                      <FormControl>
                        <Input
                          className="mt-2"
                          type="number"
                          min={1}
                          placeholder="Enter a limit"
                          value={
                            limitValue === undefined ? "" : String(limitValue)
                          }
                          onChange={event => {
                            const raw = event.target.value;
                            if (raw.trim().length === 0) {
                              field.onChange(undefined);
                              return;
                            }
                            const parsed = Number(raw);
                            field.onChange(
                              Number.isNaN(parsed) ? undefined : parsed
                            );
                          }}
                        />
                      </FormControl>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
            <FormField
              control={form.control}
              name="offset"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Skip records</FormLabel>
                  <FormDescription>
                    Start results after this many rows (optional).
                  </FormDescription>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={field.value ?? ""}
                      onChange={event => field.onChange(event.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="orderByField"
              render={({ field }) => {
                const suggestions = [
                  "createdAt",
                  "updatedAt",
                  "name",
                  "status",
                  "total",
                ] as const;
                const isCustom =
                  field.value !== undefined &&
                  field.value !== "" &&
                  !suggestions.includes(
                    field.value as (typeof suggestions)[number]
                  );
                const selectValue = isCustom
                  ? "__custom"
                  : (field.value ?? "createdAt");

                return (
                  <FormItem>
                    <FormLabel>Sort by</FormLabel>
                    <Select
                      value={selectValue}
                      onValueChange={value => {
                        if (value === "__custom") {
                          field.onChange("");
                          return;
                        }
                        field.onChange(value);
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {suggestions.map(option => (
                          <SelectItem
                            key={option}
                            value={option}
                            textValue={option}
                          >
                            {option}
                          </SelectItem>
                        ))}
                        <SelectItem value="__custom" textValue="Custom field">
                          Custom field
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {selectValue === "__custom" ? (
                      <FormControl>
                        <Input
                          className="mt-2"
                          placeholder="e.g. data.amount"
                          value={orderByFieldValue}
                          onChange={event => field.onChange(event.target.value)}
                        />
                      </FormControl>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
            <FormField
              control={form.control}
              name="orderByDirection"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sort direction</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="asc" textValue="Ascending">
                        Ascending
                      </SelectItem>
                      <SelectItem value="desc" textValue="Descending">
                        Descending
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="selectFields"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fields to return</FormLabel>
                  <FormDescription>
                    Separate with commas. Leave blank to return full records.
                  </FormDescription>
                  <FormControl>
                    <Input
                      placeholder="name, email, status"
                      value={field.value ?? ""}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="includeRelations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Relations to include</FormLabel>
                  <FormDescription>
                    Use Prisma include syntax. Example: tasks, owner.
                  </FormDescription>
                  <FormControl>
                    <Input
                      placeholder="owner, tasks"
                      value={field.value ?? ""}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="resultKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Result key</FormLabel>
                  <FormDescription>
                    Store the query output for later workflow steps.
                  </FormDescription>
                  <FormControl>
                    <Input
                      placeholder="query_results"
                      value={field.value ?? ""}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fallbackKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fallback key</FormLabel>
                  <FormDescription>
                    Optional place to store default data if nothing is found.
                  </FormDescription>
                  <FormControl>
                    <Input
                      placeholder="Optional"
                      value={field.value ?? ""}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 border-t border-border/50 pt-6 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={onClose}
          >
            Cancel
          </Button>
          <ClientPermissionGuard
            requiredAnyPermissions={[PERMISSIONS.WORKFLOWS_WRITE]}
          >
            <Button
              type="submit"
              className="w-full gap-2 sm:w-auto"
              disabled={form.formState.isSubmitting}
            >
              Save Configuration
            </Button>
          </ClientPermissionGuard>
        </div>
      </form>
    </Form>
  );
}
