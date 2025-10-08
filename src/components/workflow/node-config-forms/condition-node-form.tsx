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
import { WORKFLOW_FIELD_OPTIONS } from "./node-field-options";

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
  logicalOperator: z.enum(["AND", "OR"]).default("AND"),
  conditions: z.array(conditionSchema).default([]),
  resultKey: z.string().trim().optional(),
});

type FormValues = z.infer<typeof schema>;

export interface ConditionNodeFormProps {
  node: WorkflowCanvasNode;
  onNodeUpdate: (nodeId: string, data: Record<string, unknown>) => void;
  ensureNodeExists: (nodeId: string) => Promise<string>;
  onClose: () => void;
  workflowId?: string;
  organizationId?: string;
}

export function ConditionNodeForm({
  node,
  onNodeUpdate,
  ensureNodeExists,
  onClose,
  workflowId: _workflowId,
  organizationId: _organizationId,
}: ConditionNodeFormProps) {
  const defaults = React.useMemo<FormValues>(() => {
    const config = node.data.config;
    const rawConditions = Array.isArray(config?.conditions)
      ? (config.conditions as Array<Record<string, unknown>>)
      : [];

    const parsedConditions = rawConditions
      .map(raw => {
        const operatorStr =
          typeof raw.operator === "string" ? raw.operator : "";
        const isValidOperator = OPERATORS.includes(
          operatorStr as (typeof OPERATORS)[number]
        );

        return {
          field: typeof raw.field === "string" ? raw.field.trim() : "",
          operator: isValidOperator
            ? (operatorStr as (typeof OPERATORS)[number])
            : "equals",
          value: typeof raw.value === "string" ? raw.value : undefined,
          negate: typeof raw.negate === "boolean" ? raw.negate : undefined,
        };
      })
      .filter(c => c.field.length > 0);

    return {
      name: node.data.name ?? node.data.label ?? "Condition",
      logicalOperator:
        (config?.logicalOperator as "AND" | "OR" | undefined) ?? "AND",
      conditions: parsedConditions,
      resultKey: (config?.resultKey as string | undefined) ?? "",
    };
  }, [node]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "conditions",
  });

  useEffect(() => {
    form.reset(defaults);
  }, [defaults, form]);

  const onAddCondition = () => {
    append({ field: "", operator: "equals", value: "" });
  };

  const onSubmit = form.handleSubmit(async values => {
    const conditions = values.conditions
      .map(c => ({
        field: c.field.trim(),
        operator: c.operator,
        value: c.value?.trim(),
        negate: c.negate,
      }))
      .filter(c => c.field.length > 0);

    const config: Record<string, unknown> = {
      logicalOperator: values.logicalOperator,
      conditions: conditions.length > 0 ? conditions : undefined,
      resultKey: values.resultKey?.trim() ?? undefined,
    };

    onNodeUpdate(node.id, {
      name: values.name,
      label: values.name,
      logicalOperator: values.logicalOperator,
      resultKey: values.resultKey?.trim() ?? undefined,
      config,
    });

    await ensureNodeExists(node.id);
    toast.success("Condition node saved");
    onClose();
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Condition Node</CardTitle>
            <CardDescription>
              Branch workflow based on conditions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Condition node name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="logicalOperator"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Logical Operator</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select operator" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="AND">AND (all must match)</SelectItem>
                      <SelectItem value="OR">OR (any must match)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="resultKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Result Key (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. condition_result"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Conditions</CardTitle>
                <CardDescription>Define conditions to evaluate</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={onAddCondition}
              >
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {fields.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No conditions defined. Add one to evaluate.
              </p>
            )}
            {fields.map((fieldItem, index) => (
              <div
                key={fieldItem.id}
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
                            {OPERATORS.map(op => (
                              <SelectItem key={op} value={op}>
                                {op}
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
