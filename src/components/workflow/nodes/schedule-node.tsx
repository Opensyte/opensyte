"use client";

import React from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { CalendarClock, Trash2 } from "lucide-react";
import type { WorkflowCanvasNode } from "~/hooks/use-workflow-canvas";

type ScheduleNodeProps = NodeProps<WorkflowCanvasNode> & {
  onDelete?: (nodeId: string) => void;
};

export function ScheduleNode({
  data,
  selected,
  id,
  onDelete,
}: ScheduleNodeProps) {
  const config = data.config;
  const label = data.label ?? data.name ?? "Schedule";
  const cron =
    (typeof config?.cron === "string" ? config.cron : undefined) ??
    (typeof data.cron === "string" ? data.cron : undefined);
  const frequency =
    (typeof config?.frequency === "string" ? config.frequency : undefined) ??
    (typeof data.frequency === "string" ? data.frequency : undefined);
  const timezone =
    (typeof config?.timezone === "string" ? config.timezone : undefined) ??
    (typeof data.timezone === "string" ? data.timezone : undefined) ??
    "UTC";
  const isActive =
    typeof config?.isActive === "boolean"
      ? config.isActive
      : typeof data.isActive === "boolean"
        ? data.isActive
        : true;
  const startAt =
    (typeof config?.startAt === "string" ? config.startAt : undefined) ??
    (typeof data.startAt === "string" ? data.startAt : undefined);
  const resultKey =
    (typeof config?.resultKey === "string" ? config.resultKey : undefined) ??
    (typeof data.resultKey === "string" ? data.resultKey : undefined);

  const scheduleDisplay =
    cron ?? (frequency ? `Every ${frequency}ms` : "Not configured");

  return (
    <Card
      className={`relative min-w-[260px] border-2 p-3 shadow-sm transition-all group ${
        selected
          ? "border-indigo-500 shadow-indigo-500/20 ring-2 ring-indigo-500/20"
          : "border-indigo-500/50 hover:border-indigo-500 hover:shadow-md"
      }`}
    >
      <Button
        size="sm"
        variant="destructive"
        className="absolute -right-2 -top-2 h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={event => {
          event.stopPropagation();
          onDelete?.(id);
        }}
      >
        <Trash2 className="h-3 w-3" />
      </Button>

      <Handle
        type="target"
        position={Position.Left}
        className="!border-indigo-600 !bg-indigo-500 !h-3 !w-3"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!border-indigo-600 !bg-indigo-500 !h-3 !w-3"
      />

      <div className="mb-3 flex items-start gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
          <CalendarClock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-foreground">
              {label}
            </h3>
            <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
              SCHEDULE
            </span>
          </div>
          <p className="truncate text-xs font-mono text-indigo-600 dark:text-indigo-400">
            {scheduleDisplay}
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 rounded-md bg-indigo-50/80 px-2 py-1.5 dark:bg-indigo-900/20">
          <div
            className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-green-500" : "bg-gray-400"}`}
          />
          <span className="text-[11px] text-indigo-700 dark:text-indigo-300">
            {isActive ? "Active" : "Inactive"}
          </span>
          <span className="mx-1 text-[11px] text-indigo-400">•</span>
          <span className="text-[11px] text-indigo-700 dark:text-indigo-300">
            {timezone}
          </span>
        </div>
        {startAt && (
          <div className="rounded-md bg-indigo-50/50 px-2 py-1 text-[11px] text-indigo-600 dark:bg-indigo-900/10 dark:text-indigo-400">
            Starts: {new Date(startAt).toLocaleDateString()}
          </div>
        )}
        {resultKey && (
          <div className="rounded-md bg-indigo-50/50 px-2 py-1 text-[11px] text-indigo-600 dark:bg-indigo-900/10 dark:text-indigo-400">
            Output: <span className="font-mono font-medium">{resultKey}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
