"use client";

import React from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Card } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Users, Shield, Clock } from "lucide-react";

interface GroupNodeData {
  label: string;
  groupType?: string;
  approvers?: string[];
  timeout?: number;
}

const getGroupIcon = (type?: string) => {
  switch (type) {
    case "approval":
      return Shield;
    case "parallel":
      return Users;
    case "delay":
      return Clock;
    default:
      return Users;
  }
};

export function GroupNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as GroupNodeData;
  const IconComponent = getGroupIcon(nodeData.groupType);

  return (
    <Card
      className={`p-3 min-w-[200px] border-2 transition-colors ${
        selected
          ? "border-orange-500 ring-2 ring-orange-500/20"
          : "border-orange-500"
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-orange-500 !border-orange-600"
      />

      <div className="flex items-center gap-2 mb-2">
        <div className="flex-shrink-0 w-8 h-8 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center">
          <IconComponent className="h-4 w-4 text-orange-600 dark:text-orange-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm text-foreground truncate">
            {nodeData.label}
          </h3>
          {nodeData.groupType && (
            <Badge variant="secondary" className="mt-1 text-xs">
              {nodeData.groupType}
            </Badge>
          )}
        </div>
      </div>

      {nodeData.approvers && nodeData.approvers.length > 0 && (
        <div className="text-xs text-muted-foreground">
          Approvers: {nodeData.approvers.length}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="!bg-orange-500 !border-orange-600"
      />
    </Card>
  );
}
