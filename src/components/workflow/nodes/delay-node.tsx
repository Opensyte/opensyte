"use client";

import React from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Clock, Trash2 } from "lucide-react";
import type { WorkflowCanvasNode } from "~/hooks/use-workflow-canvas";

type DelayNodeProps = NodeProps<WorkflowCanvasNode> & {
  onDelete?: (nodeId: string) => void;
};

export function DelayNode({ data, selected, id, onDelete }: DelayNodeProps) {
  const config = data.config;
  const delayMs = (config?.delayMs as number | undefined) ?? data.delayMs ?? 0;
  const label = data.label ?? data.name ?? "Delay";
  const resultKey = (config?.resultKey as string | undefined) ?? data.resultKey;

  // Format delay duration
  const formatDelay = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
  };

  return (
    <Card
      className={`relative min-w-[240px] border-2 p-3 shadow-sm transition-all group ${
        selected
          ? "border-amber-500 shadow-amber-500/20 ring-2 ring-amber-500/20"
          : "border-amber-500/50 hover:border-amber-500 hover:shadow-md"
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
        className="!border-amber-600 !bg-amber-500 !h-3 !w-3"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!border-amber-600 !bg-amber-500 !h-3 !w-3"
      />

      <div className="mb-3 flex items-start gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
          <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-foreground">
              {label}
            </h3>
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              DELAY
            </span>
          </div>
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
            {formatDelay(delayMs)}
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        {resultKey && (
          <div className="flex items-center gap-1.5 rounded-md bg-amber-50/80 px-2 py-1.5 dark:bg-amber-900/20">
            <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            <span className="text-[11px] text-amber-700 dark:text-amber-300">
              Output: <span className="font-mono font-medium">{resultKey}</span>
            </span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Pauses workflow execution</span>
        </div>
      </div>
    </Card>
  );
}
