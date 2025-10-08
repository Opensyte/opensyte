"use client";

import React from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { RefreshCw, Trash2 } from "lucide-react";
import type { WorkflowCanvasNode } from "~/hooks/use-workflow-canvas";

type LoopNodeProps = NodeProps<WorkflowCanvasNode> & {
  onDelete?: (nodeId: string) => void;
};

export function LoopNode({ data, selected, id, onDelete }: LoopNodeProps) {
  const config = data.config as Record<string, unknown> | undefined;
  const label = data.label ?? data.name ?? "Loop";
  const itemVariable =
    (config?.itemVariable as string | undefined) ??
    (data.itemVariable as string | undefined) ??
    "item";
  const indexVariable =
    (config?.indexVariable as string | undefined) ??
    (data.indexVariable as string | undefined) ??
    "index";
  const sourceKey =
    (config?.sourceKey as string | undefined) ??
    (data.sourceKey as string | undefined) ??
    "source";
  const maxIterations =
    (config?.maxIterations as number | undefined) ??
    (data.maxIterations as number | undefined);
  const resultKey =
    (config?.resultKey as string | undefined) ??
    (data.resultKey as string | undefined);

  return (
    <Card
      className={`relative min-w-[260px] border-2 p-3 shadow-sm transition-all group ${
        selected
          ? "border-blue-500 shadow-blue-500/20 ring-2 ring-blue-500/20"
          : "border-blue-500/50 hover:border-blue-500 hover:shadow-md"
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
        className="!border-blue-600 !bg-blue-500 !h-3 !w-3"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!border-blue-600 !bg-blue-500 !h-3 !w-3"
      />

      <div className="mb-3 flex items-start gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
          <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-foreground">
              {label}
            </h3>
            <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              LOOP
            </span>
          </div>
          <p className="text-xs text-blue-600 dark:text-blue-400">
            Source: <span className="font-mono font-medium">{sourceKey}</span>
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-2 rounded-md bg-blue-50/80 px-2 py-1.5 dark:bg-blue-900/20">
          <div className="flex-1 space-y-0.5">
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              <span className="text-[11px] text-blue-700 dark:text-blue-300">
                Item:{" "}
                <span className="font-mono font-medium">{itemVariable}</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              <span className="text-[11px] text-blue-700 dark:text-blue-300">
                Index:{" "}
                <span className="font-mono font-medium">{indexVariable}</span>
              </span>
            </div>
          </div>
        </div>
        {maxIterations && (
          <div className="rounded-md bg-blue-50/50 px-2 py-1 text-[11px] text-blue-600 dark:bg-blue-900/10 dark:text-blue-400">
            Max: {maxIterations} iterations
          </div>
        )}
        {resultKey && (
          <div className="rounded-md bg-blue-50/50 px-2 py-1 text-[11px] text-blue-600 dark:bg-blue-900/10 dark:text-blue-400">
            Output: <span className="font-mono font-medium">{resultKey}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
