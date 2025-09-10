"use client";

import React, { useCallback, useState } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Zap, Play, Pause } from "lucide-react";
import { TriggerNode } from "./nodes/trigger-node";
import { ActionNode } from "./nodes/action-node";
import { WorkflowConfigSheet } from "./workflow-config-sheet";

// Custom node types
const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
};

// Dummy data for development
const workflows = [
  {
    id: 1,
    name: "Customer Onboarding",
    description: "Automate new customer welcome process",
    triggerConfig: { type: "customer_created", module: "CRM" },
    status: "ACTIVE",
    organizationId: 1,
  },
  {
    id: 2,
    name: "Deal Closure Notification",
    description: "Notify team when deal status changes to closed",
    triggerConfig: {
      type: "deal_status_updated",
      module: "CRM",
      criteria: { status: "CLOSED_WON" },
    },
    status: "ACTIVE",
    organizationId: 1,
  },
  {
    id: 3,
    name: "Employee Onboarding",
    description: "Automate new employee onboarding process",
    triggerConfig: { type: "employee_created", module: "HR" },
    status: "ACTIVE",
    organizationId: 1,
  },
];

const initialNodes: Node[] = [
  {
    id: "t1",
    type: "trigger",
    position: { x: 100, y: 100 },
    data: {
      label: "Customer Created",
      workflowId: 1,
      triggerId: 1,
      module: "CRM",
      triggerType: "customer_created",
    },
  },
  {
    id: "a1",
    type: "action",
    position: { x: 350, y: 80 },
    data: {
      label: "Send Welcome Email",
      templateId: 1,
      actionId: 1,
      actionType: "email",
    },
  },
  {
    id: "a2",
    type: "action",
    position: { x: 350, y: 180 },
    data: {
      label: "Send SMS Notification",
      templateId: 2,
      actionId: 2,
      actionType: "sms",
    },
  },
];

const initialEdges: Edge[] = [
  { id: "e1", source: "t1", target: "a1" },
  { id: "e2", source: "t1", target: "a2" },
];

interface WorkflowDesignerProps {
  organizationId: string;
  workflowId?: string;
}

export function WorkflowDesigner({
  organizationId: _organizationId,
  workflowId: _workflowId,
}: WorkflowDesignerProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [currentWorkflow, setCurrentWorkflow] = useState(workflows[0]);

  const onConnect = useCallback(
    (params: Connection | Edge) => {
      // Connection validation: only allow trigger→action and action→action
      const sourceNode = nodes.find(n => n.id === params.source);
      const targetNode = nodes.find(n => n.id === params.target);

      if (sourceNode && targetNode) {
        const validConnections = [
          sourceNode.type === "trigger" && targetNode.type === "action",
          sourceNode.type === "action" && targetNode.type === "action",
          sourceNode.type === "condition" && targetNode.type === "action",
          sourceNode.type === "action" && targetNode.type === "condition",
        ];

        if (validConnections.some(v => v)) {
          setEdges(eds => addEdge(params, eds));
        }
      }
    },
    [setEdges, nodes]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setIsConfigOpen(true);
  }, []);

  const addNewNode = useCallback(
    (type: string) => {
      const newNode: Node = {
        id: `${type}_${Date.now()}`,
        type,
        position: { x: Math.random() * 500, y: Math.random() * 300 },
        data: {
          label: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
          ...(type === "trigger" && {
            module: "System",
            triggerType: "manual",
          }),
          ...(type === "action" && { actionType: "email" }),
        },
      };
      setNodes(nds => nds.concat(newNode));
    },
    [setNodes]
  );

  const toggleWorkflowStatus = useCallback(() => {
    setCurrentWorkflow(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        status: prev.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
      };
    });
  }, []);

  const onNodesDelete = useCallback(
    (deletedNodes: Node[]) => {
      const deletedNodeIds = deletedNodes.map(node => node.id);
      setEdges(eds =>
        eds.filter(
          edge =>
            !deletedNodeIds.includes(edge.source) &&
            !deletedNodeIds.includes(edge.target)
        )
      );
    },
    [setEdges]
  );

  return (
    <div className="h-[calc(100vh-12rem)] w-full flex gap-4">
      {/* Main Canvas Area */}
      <Card className="flex-1 p-0 overflow-hidden">
        <div className="h-full w-full relative">
          {/* Toolbar */}
          <div className="absolute top-4 left-4 z-10 flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => addNewNode("trigger")}
              className="gap-2"
            >
              <Zap className="h-4 w-4 text-green-500" />
              Trigger
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => addNewNode("action")}
              className="gap-2"
            >
              <Play className="h-4 w-4 text-blue-500" />
              Action
            </Button>
          </div>

          {/* Workflow Status Toggle */}
          <div className="absolute top-4 right-4 z-10">
            <Button
              size="sm"
              variant={
                currentWorkflow?.status === "ACTIVE" ? "default" : "secondary"
              }
              onClick={toggleWorkflowStatus}
              className="gap-2"
            >
              {currentWorkflow?.status === "ACTIVE" ? (
                <>
                  <Play className="h-4 w-4" />
                  Active
                </>
              ) : (
                <>
                  <Pause className="h-4 w-4" />
                  Inactive
                </>
              )}
            </Button>
          </div>

          {/* React Flow Canvas */}
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onNodesDelete={onNodesDelete}
            nodeTypes={nodeTypes}
            fitView
            deleteKeyCode="Delete"
            className="bg-slate-50 dark:bg-slate-900"
          >
            <Controls position="bottom-left" />
            <MiniMap
              position="bottom-right"
              className="bg-background border border-border rounded-lg"
            />
            <Background gap={20} size={1} className="opacity-30" />
          </ReactFlow>
        </div>
      </Card>

      {/* Configuration Sheet */}
      <WorkflowConfigSheet
        open={isConfigOpen}
        onOpenChange={setIsConfigOpen}
        selectedNode={selectedNode}
        workflow={currentWorkflow}
        onNodeUpdate={(nodeId: string, data: Record<string, unknown>) => {
          setNodes(nds =>
            nds.map(node =>
              node.id === nodeId
                ? { ...node, data: { ...node.data, ...data } }
                : node
            )
          );
        }}
      />
    </div>
  );
}
