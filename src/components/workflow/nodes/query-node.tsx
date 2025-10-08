"use client";

import React from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Search, Trash2 } from "lucide-react";
import type { WorkflowCanvasNode } from "~/hooks/use-workflow-canvas";

type QueryNodeProps = NodeProps<WorkflowCanvasNode> & {
  onDelete?: (nodeId: string) => void;
};

export function QueryNode({ data, selected, id, onDelete }: QueryNodeProps) {
  const config = data.config as Record<string, unknown> | undefined;
  const label = data.label ?? data.name ?? "Query";
  const model =
    (config?.model as string | undefined) ??
    (data.model as string | undefined) ??
    "Model";
  const resultKey =
    (config?.resultKey as string | undefined) ??
    (data.resultKey as string | undefined);
  const filters = Array.isArray(config?.filters) ? config.filters : [];
  const limit =
    (config?.limit as number | undefined) ?? (data.limit as number | undefined);
  const orderBy = Array.isArray(config?.orderBy) ? config.orderBy : [];

  return (
    <Card
      className={`relative min-w-[260px] border-2 p-3 shadow-sm transition-all group ${
        selected
          ? "border-emerald-500 shadow-emerald-500/20 ring-2 ring-emerald-500/20"
          : "border-emerald-500/50 hover:border-emerald-500 hover:shadow-md"
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
        className="!border-emerald-600 !bg-emerald-500 !h-3 !w-3"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!border-emerald-600 !bg-emerald-500 !h-3 !w-3"
      />

      <div className="mb-3 flex items-start gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
          <Search className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-foreground">
              {label}
            </h3>
            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              QUERY
            </span>
          </div>
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
            {model}
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        {filters.length > 0 && (
          <div className="flex items-center gap-1.5 rounded-md bg-emerald-50/80 px-2 py-1 dark:bg-emerald-900/20">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="text-[11px] text-emerald-700 dark:text-emerald-300">
              {filters.length} filter{filters.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
        {orderBy.length > 0 && (
          <div className="flex items-center gap-1.5 rounded-md bg-emerald-50/80 px-2 py-1 dark:bg-emerald-900/20">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="text-[11px] text-emerald-700 dark:text-emerald-300">
              Sorted by {orderBy.length} field{orderBy.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
        {limit && (
          <div className="rounded-md bg-emerald-50/50 px-2 py-1 text-[11px] text-emerald-600 dark:bg-emerald-900/10 dark:text-emerald-400">
            Limit: {limit} records
          </div>
        )}
        {resultKey && (
          <div className="rounded-md bg-emerald-50/50 px-2 py-1 text-[11px] text-emerald-600 dark:bg-emerald-900/10 dark:text-emerald-400">
            Output: <span className="font-mono font-medium">{resultKey}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
