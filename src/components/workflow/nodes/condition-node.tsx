"use client";

import React from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Card } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { GitBranch } from "lucide-react";

interface ConditionNodeData {
  label: string;
  field?: string;
  operator?: string;
  value?: string;
}

export function ConditionNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as ConditionNodeData;

  return (
    <Card
      className={`p-3 min-w-[200px] border-2 transition-colors ${
        selected
          ? "border-yellow-500 ring-2 ring-yellow-500/20"
          : "border-yellow-500"
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-yellow-500 !border-yellow-600"
      />

      <div className="flex items-center gap-2 mb-2">
        <div className="flex-shrink-0 w-8 h-8 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center">
          <GitBranch className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm text-foreground truncate">
            {nodeData.label}
          </h3>
          <Badge variant="secondary" className="mt-1 text-xs">
            Condition
          </Badge>
        </div>
      </div>

      {nodeData.field && nodeData.operator && nodeData.value && (
        <div className="text-xs text-muted-foreground">
          {nodeData.field} {nodeData.operator} {nodeData.value}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="!bg-yellow-500 !border-yellow-600"
      />
    </Card>
  );
}
