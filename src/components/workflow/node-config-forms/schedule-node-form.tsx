"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
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
import { Calendar } from "~/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Checkbox } from "~/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { toast } from "sonner";
import { ClientPermissionGuard } from "~/components/shared/client-permission-guard";
import { PERMISSIONS } from "~/lib/rbac";
import type { WorkflowCanvasNode } from "~/hooks/use-workflow-canvas";
import { useWorkflowNodePrefill } from "~/hooks/use-workflow-node-prefill";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";
import { CalendarIcon } from "lucide-react";

const FREQUENCY_OPTIONS = [
  {
    value: "HOURLY",
    label: "Every hour",
    description: "Run once per hour",
  },
  {
    value: "DAILY",
    label: "Every day",
    description: "Run once per day",
  },
  {
    value: "WEEKLY",
    label: "Every week",
    description: "Run once each week",
  },
  {
    value: "MONTHLY",
    label: "Every month",
    description: "Run once per month",
  },
  {
    value: "YEARLY",
    label: "Every year",
    description: "Run once per year",
  },
] as const;

type FrequencyValue = (typeof FREQUENCY_OPTIONS)[number]["value"];

const schema = z
  .object({
    name: z.string().trim().min(1, { message: "Name is required" }),
    mode: z.enum(["frequency", "cron"]).default("frequency"),
    cron: z.string().trim().optional(),
    frequency: z
      .enum(["HOURLY", "DAILY", "WEEKLY", "MONTHLY", "YEARLY"] as const)
      .optional(),
    timezone: z.string().trim().default("UTC"),
    startAt: z.string().trim().optional(),
    endAt: z.string().trim().optional(),
    isActive: z.boolean().default(true),
    resultKey: z.string().trim().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.mode === "frequency" && !values.frequency) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select how often the workflow should run",
        path: ["frequency"],
      });
    }
    if (values.mode === "cron" && !values.cron) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a cron expression",
        path: ["cron"],
      });
    }
  });

type FormValues = z.infer<typeof schema>;

export interface ScheduleNodeFormProps {
  node: WorkflowCanvasNode;
  onNodeUpdate: (nodeId: string, data: Record<string, unknown>) => void;
  ensureNodeExists: (nodeId: string) => Promise<string>;
  onClose: () => void;
  workflowId?: string;
  organizationId?: string;
}

export function ScheduleNodeForm({
  node,
  onNodeUpdate,
  ensureNodeExists,
  onClose,
  workflowId,
  organizationId,
}: ScheduleNodeFormProps) {
  const {
    config,
    name: nodeName,
    isLoading: isPrefilling,
  } = useWorkflowNodePrefill({
    workflowId,
    organizationId,
    node,
  });

  const parseISOValue = (value?: string) => {
    if (!value) return undefined;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return undefined;
    }
    return parsed;
  };

  const formatDateLabel = (value?: string) => {
    const date = parseISOValue(value);
    if (!date) return "Pick a date";
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
    }).format(date);
  };

  const getTimeFromValue = (value?: string) => {
    const date = parseISOValue(value);
    if (!date) return "";
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const combineDateAndTime = (date: Date, time: string) => {
    const [hoursStr = "0", minutesStr = "0"] = time.split(":");
    const hours = Number.parseInt(hoursStr, 10);
    const minutes = Number.parseInt(minutesStr, 10);
    const safeHours = Number.isNaN(hours) ? 0 : hours;
    const safeMinutes = Number.isNaN(minutes) ? 0 : minutes;
    const combined = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      safeHours,
      safeMinutes,
      0,
      0
    );
    return combined.toISOString();
  };

  const normalizeDateValue = (value?: string) => {
    if (!value) return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
      return trimmed;
    }
    return parsed.toISOString();
  };

  const defaults = React.useMemo<FormValues>(() => {
    const cronRaw = config.cron;
    const cron = typeof cronRaw === "string" ? cronRaw : undefined;

    const frequencyRaw = config.frequency ?? node.data.frequency;
    const normalizedFrequency =
      typeof frequencyRaw === "string" ? frequencyRaw.toUpperCase() : undefined;
    const hasValidFrequency = FREQUENCY_OPTIONS.some(
      option => option.value === normalizedFrequency
    );
    const fallbackFrequency: FrequencyValue = hasValidFrequency
      ? (normalizedFrequency as FrequencyValue)
      : "DAILY";

    const timezone =
      (typeof config.timezone === "string" && config.timezone.trim().length > 0
        ? config.timezone
        : typeof node.data.timezone === "string"
          ? node.data.timezone
          : "UTC") ?? "UTC";

    const startAt = normalizeDateValue(
      typeof config.startAt === "string"
        ? config.startAt
        : typeof node.data.startAt === "string"
          ? node.data.startAt
          : undefined
    );
    const endAt = normalizeDateValue(
      typeof config.endAt === "string"
        ? config.endAt
        : typeof node.data.endAt === "string"
          ? node.data.endAt
          : undefined
    );

    const isActive =
      typeof config.isActive === "boolean"
        ? config.isActive
        : typeof node.data.isActive === "boolean"
          ? node.data.isActive
          : true;

    const resultKey =
      typeof config.resultKey === "string"
        ? config.resultKey
        : typeof node.data.resultKey === "string"
          ? node.data.resultKey
          : undefined;

    return {
      name: nodeName ?? node.data.label ?? "Schedule",
      mode: cron ? "cron" : "frequency",
      cron: cron ?? "",
      frequency: fallbackFrequency,
      timezone,
      startAt,
      endAt,
      isActive,
      resultKey: resultKey ?? "",
    } satisfies FormValues;
  }, [config, node.data, nodeName]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  useEffect(() => {
    form.register("mode");
  }, [form]);

  const mode = form.watch("mode");

  useEffect(() => {
    form.reset(defaults);
  }, [defaults, form]);

  const onSubmit = form.handleSubmit(async values => {
    const timezoneValue = values.timezone.trim() || "UTC";
    const config: Record<string, unknown> = {
      cron: values.mode === "cron" ? values.cron?.trim() : undefined,
      frequency:
        values.mode === "frequency"
          ? values.frequency?.toUpperCase()
          : undefined,
      timezone: timezoneValue,
      startAt: normalizeDateValue(values.startAt),
      endAt: normalizeDateValue(values.endAt),
      isActive: values.isActive,
      resultKey: values.resultKey?.trim() ?? undefined,
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

    const nodeUpdates: Record<string, unknown> = {
      name: values.name,
      label: values.name,
      config,
      timezone: timezoneValue,
      isActive: values.isActive,
    };

    if (values.mode === "cron") {
      nodeUpdates.cron = values.cron?.trim() ?? undefined;
      nodeUpdates.frequency = undefined;
    } else {
      nodeUpdates.frequency = values.frequency?.toUpperCase();
      nodeUpdates.cron = undefined;
    }

    const startAt = normalizeDateValue(values.startAt);
    const endAt = normalizeDateValue(values.endAt);
    const resultKey = values.resultKey?.trim();

    nodeUpdates.startAt = startAt;
    nodeUpdates.endAt = endAt;
    nodeUpdates.resultKey =
      resultKey && resultKey.length > 0 ? resultKey : undefined;

    onNodeUpdate(node.id, {
      ...nodeUpdates,
    });

    await ensureNodeExists(node.id);
    toast.success("Schedule node saved");
    onClose();
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Schedule Node</CardTitle>
            <CardDescription>Execute workflow on a schedule</CardDescription>
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
                  <FormControl>
                    <Input placeholder="Schedule node name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Tabs
              value={mode}
              onValueChange={value =>
                form.setValue("mode", value as "cron" | "frequency")
              }
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="frequency">Frequency</TabsTrigger>
                <TabsTrigger value="cron">Cron</TabsTrigger>
              </TabsList>

              <TabsContent value="frequency" className="mt-4 space-y-4">
                <FormField
                  control={form.control}
                  name="frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>How often should it run?</FormLabel>
                      <FormDescription>
                        Pick a cadence that matches how frequently this workflow
                        needs to fire.
                      </FormDescription>
                      <Select
                        onValueChange={value =>
                          field.onChange(value as FrequencyValue)
                        }
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {FREQUENCY_OPTIONS.map(option => (
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
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="cron" className="mt-4 space-y-4">
                <FormField
                  control={form.control}
                  name="cron"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cron Expression</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="0 */5 * * * *"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormDescription>
                        Standard cron format: second minute hour day month
                        weekday
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Timezone</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {[
                          "UTC",
                          "America/New_York",
                          "America/Chicago",
                          "America/Denver",
                          "America/Los_Angeles",
                          "Europe/London",
                          "Europe/Berlin",
                          "Europe/Paris",
                          "Asia/Singapore",
                          "Asia/Tokyo",
                          "Australia/Sydney",
                        ].map(option => (
                          <SelectItem
                            key={option}
                            value={option}
                            textValue={option}
                          >
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs">
                      We evaluate cron and frequency windows in this timezone.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3 space-y-0 rounded-md border border-border/40 p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={checked =>
                          field.onChange(Boolean(checked))
                        }
                      />
                    </FormControl>
                    <div className="space-y-1">
                      <FormLabel className="!mt-0">Active</FormLabel>
                      <FormDescription className="text-xs">
                        Enable schedule execution
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="startAt"
                render={({ field }) => {
                  const selectedDate = parseISOValue(field.value);
                  const timeValue = getTimeFromValue(field.value);
                  const hasDate = Boolean(selectedDate);

                  return (
                    <FormItem>
                      <FormLabel>Start At (Optional)</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !hasDate && "text-muted-foreground"
                              )}
                            >
                              {hasDate
                                ? formatDateLabel(field.value)
                                : "Pick a date"}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={date => {
                              if (!date) {
                                field.onChange(undefined);
                                return;
                              }
                              const nextValue = combineDateAndTime(
                                date,
                                timeValue || "00:00"
                              );
                              field.onChange(nextValue);
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <div className="mt-3 flex items-center gap-2">
                        <Input
                          type="time"
                          value={timeValue}
                          onChange={event => {
                            const value = event.target.value;
                            if (!selectedDate) {
                              field.onChange(undefined);
                              return;
                            }
                            const nextValue = combineDateAndTime(
                              selectedDate,
                              value || "00:00"
                            );
                            field.onChange(nextValue);
                          }}
                          disabled={!hasDate}
                        />
                        {field.value ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-9 text-muted-foreground"
                            onClick={() => field.onChange(undefined)}
                          >
                            Clear
                          </Button>
                        ) : null}
                      </div>
                      <FormDescription className="text-xs">
                        Optional start boundary evaluated in your selected
                        timezone.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="endAt"
                render={({ field }) => {
                  const selectedDate = parseISOValue(field.value);
                  const timeValue = getTimeFromValue(field.value);
                  const hasDate = Boolean(selectedDate);

                  return (
                    <FormItem>
                      <FormLabel>End At (Optional)</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !hasDate && "text-muted-foreground"
                              )}
                            >
                              {hasDate
                                ? formatDateLabel(field.value)
                                : "Pick a date"}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={date => {
                              if (!date) {
                                field.onChange(undefined);
                                return;
                              }
                              const nextValue = combineDateAndTime(
                                date,
                                timeValue || "00:00"
                              );
                              field.onChange(nextValue);
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <div className="mt-3 flex items-center gap-2">
                        <Input
                          type="time"
                          value={timeValue}
                          onChange={event => {
                            const value = event.target.value;
                            if (!selectedDate) {
                              field.onChange(undefined);
                              return;
                            }
                            const nextValue = combineDateAndTime(
                              selectedDate,
                              value || "00:00"
                            );
                            field.onChange(nextValue);
                          }}
                          disabled={!hasDate}
                        />
                        {field.value ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-9 text-muted-foreground"
                            onClick={() => field.onChange(undefined)}
                          >
                            Clear
                          </Button>
                        ) : null}
                      </div>
                      <FormDescription className="text-xs">
                        Stop running after this moment. Leave blank to keep
                        running.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>

            <FormField
              control={form.control}
              name="resultKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Result Key (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. schedule_result"
                      {...field}
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
