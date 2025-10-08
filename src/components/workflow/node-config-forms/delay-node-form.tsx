"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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

const MAX_DELAY_MS = 1000 * 60 * 60 * 24 * 7; // seven days

const durationUnits = [
  { value: "seconds", label: "Seconds", multiplier: 1000 },
  { value: "minutes", label: "Minutes", multiplier: 1000 * 60 },
  { value: "hours", label: "Hours", multiplier: 1000 * 60 * 60 },
  { value: "days", label: "Days", multiplier: 1000 * 60 * 60 * 24 },
] as const;

type DurationUnit = (typeof durationUnits)[number]["value"];

const schema = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
    durationValue: z.coerce
      .number({ invalid_type_error: "Enter a number" })
      .min(0, "Delay cannot be negative"),
    durationUnit: z.enum(["seconds", "minutes", "hours", "days"]),
    resultKey: z.string().trim().max(100).optional(),
  })
  .refine(values => {
    const multiplier = durationUnits.find(
      option => option.value === values.durationUnit
    )?.multiplier;
    if (!multiplier) return false;
    return values.durationValue * multiplier <= MAX_DELAY_MS;
  }, "Delay exceeds 7 days");

export interface DelayNodeFormProps {
  node: WorkflowCanvasNode;
  onNodeUpdate: (nodeId: string, data: Record<string, unknown>) => void;
  ensureNodeExists: (nodeId: string) => Promise<string>;
  onClose: () => void;
  workflowId?: string;
  organizationId?: string;
}

export function DelayNodeForm({
  node,
  onNodeUpdate,
  ensureNodeExists,
  onClose,
  workflowId,
  organizationId,
}: DelayNodeFormProps) {
  const {
    config,
    name: nodeName,
    isLoading: isPrefilling,
  } = useWorkflowNodePrefill({
    workflowId,
    organizationId,
    node,
  });

  const defaults = React.useMemo(() => {
    const rawDelay = config.delayMs;
    const fallbackDelay =
      typeof node.data.delayMs === "number" ? node.data.delayMs : undefined;
    const delayMs =
      typeof rawDelay === "number" ? rawDelay : (fallbackDelay ?? 1000);

    const matchingUnit = durationUnits.find(option => {
      return delayMs % option.multiplier === 0;
    });

    const unit: DurationUnit = matchingUnit?.value ?? "seconds";
    const multiplier = matchingUnit?.multiplier ?? 1000;
    const value = delayMs === 0 ? 0 : Math.round(delayMs / multiplier);

    const resultKeyRaw =
      typeof config.resultKey === "string"
        ? config.resultKey
        : typeof node.data.resultKey === "string"
          ? node.data.resultKey
          : "";

    return {
      name: nodeName ?? "Delay",
      durationValue: value,
      durationUnit: unit,
      resultKey: resultKeyRaw,
    } satisfies z.infer<typeof schema>;
  }, [config, node.data.delayMs, node.data.resultKey, nodeName]);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  useEffect(() => {
    form.reset(defaults);
  }, [defaults, form]);

  const onSubmit = form.handleSubmit(async values => {
    const multiplier = durationUnits.find(
      option => option.value === values.durationUnit
    )?.multiplier;

    const delayMs = Math.min(
      MAX_DELAY_MS,
      Math.max(0, (multiplier ?? 1000) * values.durationValue)
    );

    const trimmedResultKey = values.resultKey?.trim();
    const config = {
      delayMs,
      ...(trimmedResultKey ? { resultKey: trimmedResultKey } : {}),
    } satisfies Record<string, unknown>;

    onNodeUpdate(node.id, {
      name: values.name,
      label: values.name,
      delayMs,
      resultKey: trimmedResultKey,
      config,
    });

    await ensureNodeExists(node.id);
    toast.success("Delay node saved");
    onClose();
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Delay Node</CardTitle>
            <CardDescription>
              Choose how long the workflow waits before moving on to the next
              step.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {isPrefilling ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
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
                    Give this pause a friendly name so teammates know what it
                    does.
                  </FormDescription>
                  <FormControl>
                    <Input placeholder="Delay node name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr]">
              <FormField
                control={form.control}
                name="durationValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>How long should we wait?</FormLabel>
                    <FormDescription>
                      Enter a number and choose the unit that feels most
                      natural.
                    </FormDescription>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        inputMode="numeric"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="durationUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time unit</FormLabel>
                    <FormDescription>
                      We convert this to milliseconds for you.
                    </FormDescription>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {durationUnits.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "30 seconds", value: 30, unit: "seconds" },
                { label: "5 minutes", value: 5, unit: "minutes" },
                { label: "1 hour", value: 1, unit: "hours" },
              ].map(preset => (
                <Button
                  key={preset.label}
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    form.setValue("durationValue", preset.value);
                    form.setValue("durationUnit", preset.unit as DurationUnit);
                  }}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <FormField
              control={form.control}
              name="resultKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Result Key</FormLabel>
                  <FormDescription>
                    Store the delay details under this name for later steps.
                  </FormDescription>
                  <FormControl>
                    <Input placeholder="Optional storage key" {...field} />
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
