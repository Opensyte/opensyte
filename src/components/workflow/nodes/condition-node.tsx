"use client";

import React from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { GitBranch, Trash2 } from "lucide-react";
import type { WorkflowCanvasNode } from "~/hooks/use-workflow-canvas";

type ConditionNodeProps = NodeProps<WorkflowCanvasNode> & {
  onDelete?: (nodeId: string) => void;
};

export function ConditionNode({
  data,
  selected,
  id,
  onDelete,
}: ConditionNodeProps) {
  const config = data.config;
  const label = data.label ?? data.name ?? "Condition";
  const conditions = Array.isArray(config?.conditions) ? config.conditions : [];
  const logicalOperator =
    (typeof config?.logicalOperator === "string"
      ? config.logicalOperator
      : undefined) ??
    (typeof data.logicalOperator === "string"
      ? data.logicalOperator
      : undefined) ??
    "AND";
  const resultKey =
    (typeof config?.resultKey === "string" ? config.resultKey : undefined) ??
    (typeof data.resultKey === "string" ? data.resultKey : undefined);

  return (
    <Card
      className={`relative min-w-[260px] border-2 p-3 shadow-sm transition-all group ${
        selected
          ? "border-purple-500 shadow-purple-500/20 ring-2 ring-purple-500/20"
          : "border-purple-500/50 hover:border-purple-500 hover:shadow-md"
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
        className="!border-purple-600 !bg-purple-500 !h-3 !w-3"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        className="!border-green-600 !bg-green-500 !h-3 !w-3 !top-[35%]"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="false"
        className="!border-red-600 !bg-red-500 !h-3 !w-3 !top-[65%]"
      />

      <div className="mb-3 flex items-start gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
          <GitBranch className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-foreground">
              {label}
            </h3>
            <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
              CONDITION
            </span>
          </div>
          <p className="text-xs text-purple-600 dark:text-purple-400">
            {conditions.length} rule{conditions.length !== 1 ? "s" : ""} (
            {logicalOperator})
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        {conditions.length > 0 ? (
          <>
            <div className="flex items-center gap-1.5 rounded-md bg-green-50/80 px-2 py-1.5 dark:bg-green-900/20">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
              <span className="text-[11px] text-green-700 dark:text-green-300">
                True path: Continue workflow
              </span>
            </div>
            <div className="flex items-center gap-1.5 rounded-md bg-red-50/80 px-2 py-1.5 dark:bg-red-900/20">
              <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
              <span className="text-[11px] text-red-700 dark:text-red-300">
                False path: Alternative branch
              </span>
            </div>
          </>
        ) : (
          <div className="rounded-md bg-purple-50/80 px-2 py-1.5 text-[11px] text-purple-600 dark:bg-purple-900/20 dark:text-purple-400">
            No conditions configured
          </div>
        )}
        {resultKey && (
          <div className="rounded-md bg-purple-50/50 px-2 py-1 text-[11px] text-purple-600 dark:bg-purple-900/10 dark:text-purple-400">
            Output: <span className="font-mono font-medium">{resultKey}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
