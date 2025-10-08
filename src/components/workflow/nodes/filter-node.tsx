"use client";

import React from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Filter as FilterIcon, Trash2 } from "lucide-react";
import type { WorkflowCanvasNode } from "~/hooks/use-workflow-canvas";

type FilterNodeProps = NodeProps<WorkflowCanvasNode> & {
  onDelete?: (nodeId: string) => void;
};

export function FilterNode({ data, selected, id, onDelete }: FilterNodeProps) {
  const config = data.config as Record<string, unknown> | undefined;
  const label = data.label ?? data.name ?? "Filter";
  const sourceKey =
    (config?.sourceKey as string | undefined) ??
    (data.sourceKey as string | undefined) ??
    "source";
  const logicalOperator =
    (config?.logicalOperator as string | undefined) ??
    (data.logicalOperator as string | undefined) ??
    "AND";
  const conditions = Array.isArray(config?.conditions) ? config.conditions : [];
  const resultKey =
    (config?.resultKey as string | undefined) ??
    (data.resultKey as string | undefined);
  const fallbackKey =
    (config?.fallbackKey as string | undefined) ??
    (data.fallbackKey as string | undefined);

  return (
    <Card
      className={`relative min-w-[260px] border-2 p-3 shadow-sm transition-all group ${
        selected
          ? "border-red-500 shadow-red-500/20 ring-2 ring-red-500/20"
          : "border-red-500/50 hover:border-red-500 hover:shadow-md"
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
        className="!border-red-600 !bg-red-500 !h-3 !w-3"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!border-red-600 !bg-red-500 !h-3 !w-3"
      />

      <div className="mb-3 flex items-start gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
          <FilterIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-foreground">
              {label}
            </h3>
            <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
              FILTER
            </span>
          </div>
          <p className="text-xs text-red-600 dark:text-red-400">
            Source: <span className="font-mono font-medium">{sourceKey}</span>
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        {conditions.length > 0 && (
          <div className="flex items-center gap-1.5 rounded-md bg-red-50/80 px-2 py-1.5 dark:bg-red-900/20">
            <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
            <span className="text-[11px] text-red-700 dark:text-red-300">
              {conditions.length} condition{conditions.length !== 1 ? "s" : ""}{" "}
              ({logicalOperator})
            </span>
          </div>
        )}
        {resultKey && (
          <div className="rounded-md bg-red-50/50 px-2 py-1 text-[11px] text-red-600 dark:bg-red-900/10 dark:text-red-400">
            Match: <span className="font-mono font-medium">{resultKey}</span>
          </div>
        )}
        {fallbackKey && (
          <div className="rounded-md bg-red-50/50 px-2 py-1 text-[11px] text-red-600 dark:bg-red-900/10 dark:text-red-400">
            Reject: <span className="font-mono font-medium">{fallbackKey}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
