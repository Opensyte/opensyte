"use client";

import React, { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import { Checkbox } from "~/components/ui/checkbox";
import { toast } from "sonner";
import { ClientPermissionGuard } from "~/components/shared/client-permission-guard";
import { PERMISSIONS } from "~/lib/rbac";
import type { WorkflowCanvasNode } from "~/hooks/use-workflow-canvas";
import { useWorkflowNodePrefill } from "~/hooks/use-workflow-node-prefill";
import { Plus, Trash2 } from "lucide-react";
import { Skeleton } from "~/components/ui/skeleton";
import {
  WORKFLOW_COLLECTION_PATH_OPTIONS,
  WORKFLOW_FIELD_OPTIONS,
} from "./node-field-options";

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

const conditionSchema = z.object({
  field: z.string().trim().min(1, { message: "Field is required" }),
  operator: z.enum(OPERATORS),
  value: z.string().trim().optional(),
  negate: z.boolean().optional(),
});

const schema = z.object({
  name: z.string().trim().min(1, { message: "Name is required" }),
  sourceKey: z.string().trim().min(1, { message: "Choose a collection" }),
  logicalOperator: z.enum(["AND", "OR"]).default("AND"),
  conditions: z.array(conditionSchema).default([]),
  resultKey: z.string().trim().optional(),
  fallbackKey: z.string().trim().optional(),
});

type FormValues = z.infer<typeof schema>;

export interface FilterNodeFormProps {
  node: WorkflowCanvasNode;
  onNodeUpdate: (nodeId: string, data: Record<string, unknown>) => void;
  ensureNodeExists: (nodeId: string) => Promise<string>;
  onClose: () => void;
  workflowId?: string;
  organizationId?: string;
}

export function FilterNodeForm({
  node,
  onNodeUpdate,
  ensureNodeExists,
  onClose,
  workflowId,
  organizationId,
}: FilterNodeFormProps) {
  const {
    config,
    name: nodeName,
    isLoading: isPrefilling,
  } = useWorkflowNodePrefill({
    workflowId,
    organizationId,
    node,
  });

  const defaults = React.useMemo<FormValues>(() => {
    const rawConditions = Array.isArray(config.conditions)
      ? (config.conditions as Array<Record<string, unknown>>)
      : [];

    const parsedConditions = rawConditions
      .map(raw => {
        const operator =
          typeof raw.operator === "string" &&
          (OPERATORS as readonly string[]).includes(raw.operator)
            ? (raw.operator as (typeof OPERATORS)[number])
            : "equals";
        return {
          field: typeof raw.field === "string" ? raw.field.trim() : "",
          operator,
          value: typeof raw.value === "string" ? raw.value : undefined,
          negate: typeof raw.negate === "boolean" ? raw.negate : undefined,
        };
      })
      .filter(condition => condition.field.length > 0);

    const sourceKey =
      typeof config.sourceKey === "string" && config.sourceKey.trim().length > 0
        ? config.sourceKey.trim()
        : typeof node.data.sourceKey === "string"
          ? node.data.sourceKey
          : "";

    return {
      name: nodeName ?? node.data.label ?? "Filter",
      sourceKey,
      logicalOperator:
        (config.logicalOperator as "AND" | "OR" | undefined) ?? "AND",
      conditions: parsedConditions,
      resultKey:
        typeof config.resultKey === "string"
          ? config.resultKey
          : typeof node.data.resultKey === "string"
            ? node.data.resultKey
            : "",
      fallbackKey:
        typeof config.fallbackKey === "string"
          ? config.fallbackKey
          : typeof node.data.fallbackKey === "string"
            ? node.data.fallbackKey
            : "",
    } satisfies FormValues;
  }, [config, node.data, nodeName]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "conditions",
  });

  const sourceKeyValue = form.watch("sourceKey") ?? "";

  useEffect(() => {
    form.reset(defaults);
  }, [defaults, form]);

  const onAddCondition = () => {
    append({ field: "", operator: "equals", value: "" });
  };

  const onSubmit = form.handleSubmit(async values => {
    const conditions = values.conditions
      .map(condition => ({
        field: condition.field.trim(),
        operator: condition.operator,
        value: condition.value?.trim(),
        negate: condition.negate,
      }))
      .filter(condition => condition.field.length > 0);

    const sourceKey = values.sourceKey.trim();
    const resultKey = values.resultKey?.trim() ?? undefined;
    const fallbackKey = values.fallbackKey?.trim() ?? undefined;

    const config: Record<string, unknown> = {
      sourceKey,
      logicalOperator: values.logicalOperator,
      conditions: conditions.length > 0 ? conditions : undefined,
      resultKey,
      fallbackKey,
    };

    Object.entries(config).forEach(([key, value]) => {
      if (value === undefined) {
        delete config[key];
        return;
      }
      if (typeof value === "string" && value.length === 0) {
        delete config[key];
      }
    });

    onNodeUpdate(node.id, {
      name: values.name,
      label: values.name,
      sourceKey,
      logicalOperator: values.logicalOperator,
      resultKey,
      fallbackKey,
      config,
    });

    await ensureNodeExists(node.id);
    toast.success("Filter node saved");
    onClose();
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Filter Node</CardTitle>
            <CardDescription>
              Narrow a collection down to entries that match your conditions.
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
                    Make it obvious what this filter keeps.
                  </FormDescription>
                  <FormControl>
                    <Input placeholder="Filter node name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sourceKey"
              render={({ field }) => {
                const selectedOption = WORKFLOW_COLLECTION_PATH_OPTIONS.find(
                  option => option.value === field.value
                );
                const selectValue = selectedOption
                  ? selectedOption.value
                  : field.value && field.value.length > 0
                    ? "__custom"
                    : "";

                return (
                  <FormItem>
                    <FormLabel>Collection to filter</FormLabel>
                    <FormDescription>
                      Pick the array this node should run filters against.
                    </FormDescription>
                    <Select
                      value={selectValue || undefined}
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
                          <SelectValue placeholder="Choose a collection" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {WORKFLOW_COLLECTION_PATH_OPTIONS.map(option => (
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
                        <SelectItem value="__custom" textValue="Custom path">
                          Custom path
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {selectValue === "__custom" ? (
                      <FormControl>
                        <Input
                          className="mt-2"
                          placeholder="payload.items"
                          value={sourceKeyValue}
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
              name="logicalOperator"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>How should we combine conditions?</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select operator" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="AND">
                        AND (all conditions must match)
                      </SelectItem>
                      <SelectItem value="OR">
                        OR (any condition can match)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="resultKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Result Key (Optional)</FormLabel>
                    <FormDescription>
                      Store the filtered collection for later nodes.
                    </FormDescription>
                    <FormControl>
                      <Input
                        placeholder="filtered_items"
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
                    <FormLabel>Fallback Key (Optional)</FormLabel>
                    <FormDescription>
                      Store results when nothing passed the filter.
                    </FormDescription>
                    <FormControl>
                      <Input
                        placeholder="empty_result_path"
                        value={field.value ?? ""}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Filter Conditions</CardTitle>
                <CardDescription>
                  Add conditions the collection must satisfy.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={onAddCondition}
              >
                <Plus className="h-4 w-4" /> Add condition
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {fields.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No conditions yet. Add one to start filtering.
              </p>
            )}
            {fields.map((item, index) => (
              <div
                key={item.id}
                className="space-y-3 rounded-md border border-border/40 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-sm font-medium">Condition {index + 1}</h4>
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
                    name={`conditions.${index}.field`}
                    render={({ field }) => {
                      const selectedOption = WORKFLOW_FIELD_OPTIONS.find(
                        option => option.value === field.value
                      );
                      const selectValue = selectedOption
                        ? selectedOption.value
                        : field.value && field.value.length > 0
                          ? "__custom"
                          : "";

                      return (
                        <FormItem>
                          <FormLabel>Field</FormLabel>
                          <Select
                            value={selectValue || undefined}
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
                                <SelectValue placeholder="Choose a field" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {WORKFLOW_FIELD_OPTIONS.map(option => (
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
                              <SelectItem
                                value="__custom"
                                textValue="Custom path"
                              >
                                Custom path
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
                    name={`conditions.${index}.operator`}
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
                    name={`conditions.${index}.value`}
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
                    name={`conditions.${index}.negate`}
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
