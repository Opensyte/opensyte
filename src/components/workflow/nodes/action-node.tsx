"use client";

import React from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import {
  Play,
  Mail,
  MessageSquare,
  Webhook,
  Calendar,
  Trash2,
} from "lucide-react";

interface ActionNodeData {
  label: string;
  name?: string;
  templateId?: number;
  actionId?: number;
  actionType?: string;
  condition?: {
    field: string;
    equals?: boolean | string;
  };
}

interface ActionNodeProps extends NodeProps {
  onDelete?: (nodeId: string) => void;
}

const getActionIcon = (type?: string) => {
  switch (type) {
    case "email":
      return Mail;
    case "sms":
      return MessageSquare;
    case "webhook":
      return Webhook;
    case "calendar":
      return Calendar;
    default:
      return Play;
  }
};

export function ActionNode({ data, selected, id, onDelete }: ActionNodeProps) {
  const nodeData = data as unknown as ActionNodeData;
  const IconComponent = getActionIcon(nodeData.actionType);
  const displayName = nodeData.name ?? nodeData.label ?? "Action";

  return (
    <Card
      className={`p-3 min-w-[200px] border-2 transition-colors relative group ${
        selected ? "border-blue-500 ring-2 ring-blue-500/20" : "border-blue-500"
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
        type="target"
        position={Position.Left}
        className="!bg-blue-500 !border-blue-600"
      />

      <div className="flex items-center gap-2 mb-2">
        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
          <IconComponent className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm text-foreground truncate">
            {displayName}
          </h3>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!bg-blue-500 !border-blue-600"
      />
    </Card>
  );
}
