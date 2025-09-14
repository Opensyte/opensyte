"use client";

import React from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Clock, Zap, Trash2 } from "lucide-react";

interface TriggerNodeData {
  label: string;
  name?: string;
  templateId?: number;
  triggerId?: number;
  triggerType?: string;
  condition?: {
    field: string;
    equals?: boolean | string;
  };
}

interface TriggerNodeProps extends NodeProps {
  onDelete?: (nodeId: string) => void;
}

export function TriggerNode({
  data,
  selected,
  id,
  onDelete,
}: TriggerNodeProps) {
  const nodeData = data as unknown as TriggerNodeData;
  const IconComponent =
    nodeData.triggerType === "CONTACT_CREATED" ? Zap : Clock;
  const displayName = nodeData.name ?? nodeData.label ?? "Trigger";

  return (
    <Card
      className={`p-3 min-w-[200px] border-2 transition-colors relative group ${
        selected
          ? "border-green-500 ring-2 ring-green-500/20"
          : "border-green-500"
      }`}
    >
      {/* Delete button - shows on hover */}
      <Button
        size="sm"
        variant="destructive"
        className="absolute -top-2 -right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        onClick={e => {
          e.stopPropagation();
          onDelete?.(id);
        }}
      >
        <Trash2 className="h-3 w-3" />
      </Button>

      <Handle
        type="source"
        position={Position.Right}
        className="!bg-green-500 !border-green-600"
      />

      <div className="flex items-center gap-2 mb-2">
        <div className="flex-shrink-0 w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
          <IconComponent className="h-4 w-4 text-green-600 dark:text-green-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm text-foreground truncate">
            {displayName}
          </h3>
        </div>
      </div>
    </Card>
  );
}
