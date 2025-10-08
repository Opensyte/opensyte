"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { toast } from "sonner";
import { ClientPermissionGuard } from "~/components/shared/client-permission-guard";
import { PERMISSIONS } from "~/lib/rbac";
import type { WorkflowCanvasNode } from "~/hooks/use-workflow-canvas";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";
import { useWorkflowNodePrefill } from "~/hooks/use-workflow-node-prefill";
import { WORKFLOW_COLLECTION_PATH_OPTIONS } from "./node-field-options";

const numericField = z
  .string()
  .trim()
  .optional()
  .refine(
    value => value === undefined || value === "" || /^[0-9]+$/.test(value),
    {
      message: "Must be a positive integer",
    }
  )
  .transform(value => {
    if (!value) {
      return undefined;
    }
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  });

const schema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  dataSource: z.string().trim().optional(),
  sourceKey: z.string().trim().optional(),
  itemVariable: z
    .string()
    .trim()
    .min(1, "Item variable is required")
    .default("item"),
  indexVariable: z
    .string()
    .trim()
    .min(1, "Index variable is required")
    .default("index"),
  maxIterations: numericField,
  resultKey: z.string().trim().optional(),
  emptyPathHandle: z.string().trim().optional(),
});

export interface LoopNodeFormProps {
  node: WorkflowCanvasNode;
  onNodeUpdate: (nodeId: string, data: Record<string, unknown>) => void;
  ensureNodeExists: (nodeId: string) => Promise<string>;
  onClose: () => void;
  workflowId?: string;
  organizationId?: string;
}

export function LoopNodeForm({
  node,
  onNodeUpdate,
  ensureNodeExists,
  onClose,
  workflowId,
  organizationId,
}: LoopNodeFormProps) {
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

    return {
      name: nodeName ?? node.data.label ?? "Loop",
      dataSource:
        getString("dataSource") ??
        (typeof node.data.dataSource === "string"
          ? node.data.dataSource
          : undefined),
      sourceKey:
        getString("sourceKey") ??
        (typeof node.data.sourceKey === "string" ? node.data.sourceKey : ""),
      itemVariable:
        getString("itemVariable") ??
        (typeof node.data.itemVariable === "string"
          ? node.data.itemVariable
          : "item"),
      indexVariable:
        getString("indexVariable") ??
        (typeof node.data.indexVariable === "string"
          ? node.data.indexVariable
          : "index"),
      maxIterations:
        getNumber("maxIterations") ??
        (typeof node.data.maxIterations === "number"
          ? node.data.maxIterations
          : undefined),
      resultKey:
        getString("resultKey") ??
        (typeof node.data.resultKey === "string"
          ? node.data.resultKey
          : undefined),
      emptyPathHandle:
        getString("emptyPathHandle") ??
        (typeof node.data.emptyPathHandle === "string"
          ? node.data.emptyPathHandle
          : undefined),
    } satisfies z.infer<typeof schema>;
  }, [config, node.data, nodeName]);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  const dataSourceValue = form.watch("dataSource") ?? "";
  const sourceKeyValue = form.watch("sourceKey") ?? "";
  const itemVariableValue = form.watch("itemVariable") ?? "";
  const indexVariableValue = form.watch("indexVariable") ?? "";
  const maxIterationsValue = form.watch("maxIterations");

  useEffect(() => {
    form.reset(defaults);
  }, [defaults, form]);

  const onSubmit = form.handleSubmit(async values => {
    const config: Record<string, unknown> = {
      dataSource: values.dataSource?.trim(),
      sourceKey: values.sourceKey?.trim(),
      itemVariable: values.itemVariable.trim(),
      indexVariable: values.indexVariable.trim(),
      maxIterations: values.maxIterations,
      resultKey: values.resultKey?.trim(),
      emptyPathHandle: values.emptyPathHandle?.trim(),
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
      itemVariable: values.itemVariable.trim(),
      indexVariable: values.indexVariable.trim(),
      sourceKey: values.sourceKey?.trim(),
      dataSource: values.dataSource?.trim(),
      resultKey: values.resultKey?.trim(),
      emptyPathHandle: values.emptyPathHandle?.trim(),
      maxIterations: values.maxIterations,
      config,
    });

    await ensureNodeExists(node.id);
    toast.success("Loop node saved");
    onClose();
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Loop Node</CardTitle>
            <CardDescription>
              Configure how the workflow iterates over a collection.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {isPrefilling ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
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
                    Make it clear what list this loop will walk through.
                  </FormDescription>
                  <FormControl>
                    <Input placeholder="Loop node name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dataSource"
              render={({ field }) => {
                const options = [
                  {
                    value: "payload",
                    label: "Workflow payload",
                    description: "Use the data that triggered this workflow.",
                  },
                  {
                    value: "previous_step",
                    label: "Previous step result",
                    description:
                      "Loop through the data returned by the prior node.",
                  },
                ] as const;
                const isCustom =
                  field.value !== undefined &&
                  field.value !== "" &&
                  !options.some(option => option.value === field.value);
                const selectValue = isCustom
                  ? "__custom"
                  : (field.value ?? "payload");

                return (
                  <FormItem>
                    <FormLabel>Where should we read items from?</FormLabel>
                    <FormDescription>
                      Pick a source or define your own data path.
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
                        <SelectItem value="__custom" textValue="Custom path">
                          Custom path
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {selectValue === "__custom" ? (
                      <FormControl>
                        <Input
                          className="mt-2"
                          placeholder="e.g. payload.contacts"
                          value={dataSourceValue}
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
                    <FormLabel>Collection path</FormLabel>
                    <FormDescription>
                      Provide the path to the array we should loop through.
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="itemVariable"
                render={({ field }) => {
                  const presets = ["item", "record", "entry"] as const;
                  const isCustom =
                    field.value !== undefined &&
                    field.value !== "" &&
                    !presets.includes(field.value as (typeof presets)[number]);
                  const selectValue = isCustom
                    ? "__custom"
                    : (field.value ?? "item");

                  return (
                    <FormItem>
                      <FormLabel>Item variable</FormLabel>
                      <FormDescription>
                        This is how later steps will reference each item.
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
                          {presets.map(option => (
                            <SelectItem
                              key={option}
                              value={option}
                              textValue={option}
                            >
                              {option}
                            </SelectItem>
                          ))}
                          <SelectItem value="__custom" textValue="Custom name">
                            Custom name
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {selectValue === "__custom" ? (
                        <FormControl>
                          <Input
                            className="mt-2"
                            placeholder="e.g. contact"
                            value={itemVariableValue}
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
                name="indexVariable"
                render={({ field }) => {
                  const presets = ["index", "position", "row"] as const;
                  const isCustom =
                    field.value !== undefined &&
                    field.value !== "" &&
                    !presets.includes(field.value as (typeof presets)[number]);
                  const selectValue = isCustom
                    ? "__custom"
                    : (field.value ?? "index");

                  return (
                    <FormItem>
                      <FormLabel>Index variable</FormLabel>
                      <FormDescription>
                        Handy when you need to know the item number.
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
                          {presets.map(option => (
                            <SelectItem
                              key={option}
                              value={option}
                              textValue={option}
                            >
                              {option}
                            </SelectItem>
                          ))}
                          <SelectItem value="__custom" textValue="Custom name">
                            Custom name
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {selectValue === "__custom" ? (
                        <FormControl>
                          <Input
                            className="mt-2"
                            placeholder="e.g. position"
                            value={indexVariableValue}
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
            </div>
            <FormField
              control={form.control}
              name="maxIterations"
              render={({ field }) => {
                const presets = [10, 25, 50, 100] as const;
                const selectValue = (() => {
                  if (field.value === undefined) return "none";
                  const match = presets.find(preset => preset === field.value);
                  return match ? String(match) : "custom";
                })();

                return (
                  <FormItem>
                    <FormLabel>Limit iterations</FormLabel>
                    <FormDescription>
                      Helpful when you want to guard against huge lists.
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
                            {option.toLocaleString()} items
                          </SelectItem>
                        ))}
                        <SelectItem value="custom" textValue="Custom number">
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
                            maxIterationsValue === undefined
                              ? ""
                              : String(maxIterationsValue)
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="resultKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Result key</FormLabel>
                    <FormDescription>
                      Save the loop output to reuse in later nodes.
                    </FormDescription>
                    <FormControl>
                      <Input
                        placeholder="loop_result"
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
                name="emptyPathHandle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>When the list is empty</FormLabel>
                    <FormDescription>
                      Optional path to follow if nothing is found.
                    </FormDescription>
                    <FormControl>
                      <Input
                        placeholder="Optional handle"
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
