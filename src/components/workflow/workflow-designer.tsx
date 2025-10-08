"use client";

import React, { useCallback, useState, useMemo } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Plus,
  Play,
  Pause,
  Save,
  Loader2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Search,
  Filter as FilterIcon,
  CalendarClock,
  GitBranch,
} from "lucide-react";
import { TriggerNode } from "./nodes/trigger-node";
import { ActionNode } from "./nodes/action-node";
import { DelayNode } from "./nodes/delay-node";
import { LoopNode } from "./nodes/loop-node";
import { QueryNode } from "./nodes/query-node";
import { FilterNode } from "./nodes/filter-node";
import { ScheduleNode } from "./nodes/schedule-node";
import { ConditionNode } from "./nodes/condition-node";
import { WorkflowConfigSheet } from "./workflow-config-sheet";
import { toast } from "sonner";
import { ClientPermissionGuard } from "~/components/shared/client-permission-guard";
import { PERMISSIONS } from "~/lib/rbac";
import { api } from "~/trpc/react";
import {
  useWorkflowCanvas,
  type WorkflowCanvasNode,
} from "~/hooks/use-workflow-canvas";

// Custom node types with delete handler
const createNodeTypes = (onDeleteNode: (nodeId: string) => void) => ({
  trigger: (props: NodeProps) => (
    <TriggerNode {...props} onDelete={onDeleteNode} />
  ),
  action: (props: NodeProps) => (
    <ActionNode {...props} onDelete={onDeleteNode} />
  ),
  delay: (props: NodeProps) => (
    <DelayNode
      {...(props as NodeProps<WorkflowCanvasNode>)}
      onDelete={onDeleteNode}
    />
  ),
  loop: (props: NodeProps) => (
    <LoopNode
      {...(props as NodeProps<WorkflowCanvasNode>)}
      onDelete={onDeleteNode}
    />
  ),
  query: (props: NodeProps) => (
    <QueryNode
      {...(props as NodeProps<WorkflowCanvasNode>)}
      onDelete={onDeleteNode}
    />
  ),
  filter: (props: NodeProps) => (
    <FilterNode
      {...(props as NodeProps<WorkflowCanvasNode>)}
      onDelete={onDeleteNode}
    />
  ),
  schedule: (props: NodeProps) => (
    <ScheduleNode
      {...(props as NodeProps<WorkflowCanvasNode>)}
      onDelete={onDeleteNode}
    />
  ),
  condition: (props: NodeProps) => (
    <ConditionNode
      {...(props as NodeProps<WorkflowCanvasNode>)}
      onDelete={onDeleteNode}
    />
  ),
});

interface WorkflowDesignerProps {
  organizationId: string;
  workflowId?: string;
}

export function WorkflowDesigner({
  organizationId,
  workflowId: _workflowId,
}: WorkflowDesignerProps) {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const utils = api.useUtils();

  // Get workflow data for status and metadata
  const {
    data: workflow,
    isLoading: isLoadingWorkflow,
    error: workflowError,
  } = api.workflows.workflow.getWorkflow.useQuery(
    {
      id: _workflowId!,
      organizationId,
    },
    {
      enabled: !!_workflowId && !!organizationId,
    }
  );

  // Use the new canvas hook
  const {
    nodes,
    edges,
    selectedNode,
    hasUnsavedChanges,
    error: canvasError,
    lastSaveTime,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodeClick,
    saveCanvas,
    ensureNodeExists,
    addNode,
    updateNode,
    deleteNode,
    setSelectedNode,
  } = useWorkflowCanvas({
    workflowId: _workflowId ?? "",
    organizationId,
    autoSaveDelay: 1000, // 1 second auto-save delay
  });

  // Workflow status update mutation
  const updateWorkflowMutation =
    api.workflows.workflow.updateWorkflow.useMutation({
      onSuccess: () => {
        toast.success("Workflow status updated successfully");
        void utils.workflows.workflow.getWorkflow.invalidate();
      },
      onError: err => {
        toast.error("Failed to update workflow status", {
          description: err.message,
        });
      },
    });

  // Toggle workflow status handler
  const toggleWorkflowStatus = useCallback(
    (workflowId: string, currentStatus: string) => {
      const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      updateWorkflowMutation.mutate({
        id: workflowId,
        organizationId,
        status: newStatus,
      });
    },
    [updateWorkflowMutation, organizationId]
  );

  // Manual save handler
  const handleManualSave = useCallback(async () => {
    try {
      await saveCanvas();
      toast.success("Workflow saved successfully");
    } catch (error) {
      console.error("Manual save failed:", error);
      toast.error("Failed to save workflow");
    }
  }, [saveCanvas]);

  // Node deletion handler
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      deleteNode(nodeId);
      toast.success("Node deleted");
    },
    [deleteNode]
  );

  const getNextPosition = useCallback(
    (
      reactFlowType: string,
      fallback: { x: number; y: number },
      offset = 120
    ) => {
      const similarNodes = nodes.filter(node => node.type === reactFlowType);
      if (similarNodes.length === 0) {
        return fallback;
      }

      const lastNode = similarNodes.reduce((last, current) =>
        current.position.y > last.position.y ? current : last
      );

      return {
        x: lastNode.position.x,
        y: lastNode.position.y + offset,
      };
    },
    [nodes]
  );

  // Add node handlers
  const handleAddTrigger = useCallback(() => {
    const position = getNextPosition("trigger", { x: 100, y: 100 }, 90);

    const newNode = addNode(
      {
        type: "TRIGGER",
        name: "New Trigger",
        triggerType: "CONTACT_CREATED",
        module: "CRM",
        config: {
          triggerType: "CONTACT_CREATED",
          module: "CRM",
        },
      },
      position
    );
    setSelectedNode(newNode);
    setIsConfigOpen(true);
  }, [addNode, setSelectedNode, getNextPosition]);

  const handleAddAction = useCallback(() => {
    const position = getNextPosition("action", { x: 320, y: 100 });

    const newNode = addNode(
      {
        type: "ACTION",
        name: "New Action",
        actionType: "email",
        config: {
          actionType: "email",
        },
      },
      position
    );
    setSelectedNode(newNode);
    setIsConfigOpen(true);
  }, [addNode, setSelectedNode, getNextPosition]);

  const handleAddDelay = useCallback(() => {
    const position = getNextPosition("delay", { x: 520, y: 100 });

    const newNode = addNode(
      {
        type: "DELAY",
        name: "Delay",
        config: { delayMs: 1000 },
        delayMs: 1000,
      },
      position
    );
    setSelectedNode(newNode);
    setIsConfigOpen(true);
  }, [addNode, getNextPosition, setSelectedNode]);

  const handleAddLoop = useCallback(() => {
    const position = getNextPosition("loop", { x: 520, y: 240 });

    const newNode = addNode(
      {
        type: "LOOP",
        name: "Loop",
        config: {
          sourceKey: "payload.items",
          itemVariable: "item",
          indexVariable: "index",
        },
        sourceKey: "payload.items",
        itemVariable: "item",
        indexVariable: "index",
      },
      position
    );
    setSelectedNode(newNode);
    setIsConfigOpen(true);
  }, [addNode, getNextPosition, setSelectedNode]);

  const handleAddQuery = useCallback(() => {
    const position = getNextPosition("query", { x: 720, y: 100 });

    const newNode = addNode(
      {
        type: "QUERY",
        name: "Query",
        config: {
          model: "contacts",
          resultKey: "query_results",
        },
        model: "contacts",
        resultKey: "query_results",
      },
      position
    );
    setSelectedNode(newNode);
    setIsConfigOpen(true);
  }, [addNode, getNextPosition, setSelectedNode]);

  const handleAddFilter = useCallback(() => {
    const position = getNextPosition("filter", { x: 720, y: 240 });

    const newNode = addNode(
      {
        type: "FILTER",
        name: "Filter",
        config: {
          sourceKey: "query_results",
          conditions: [],
          logicalOperator: "AND",
        },
        sourceKey: "query_results",
        logicalOperator: "AND",
      },
      position
    );
    setSelectedNode(newNode);
    setIsConfigOpen(true);
  }, [addNode, getNextPosition, setSelectedNode]);

  const handleAddSchedule = useCallback(() => {
    const position = getNextPosition("schedule", { x: 900, y: 100 });

    const newNode = addNode(
      {
        type: "SCHEDULE",
        name: "Schedule",
        config: {
          cron: "0 * * * *",
          timezone: "UTC",
        },
        cron: "0 * * * *",
        timezone: "UTC",
      },
      position
    );
    setSelectedNode(newNode);
    setIsConfigOpen(true);
  }, [addNode, getNextPosition, setSelectedNode]);

  const handleAddCondition = useCallback(() => {
    const position = getNextPosition("condition", { x: 900, y: 240 });

    const newNode = addNode(
      {
        type: "CONDITION",
        name: "Condition",
        config: {
          conditions: [],
          logicalOperator: "AND",
        },
        logicalOperator: "AND",
      },
      position
    );
    setSelectedNode(newNode);
    setIsConfigOpen(true);
  }, [addNode, getNextPosition, setSelectedNode]);

  // Node click handler
  const handleNodeClickInternal = useCallback(
    (event: React.MouseEvent, node: Node) => {
      // Cast to WorkflowCanvasNode since we know our nodes have the correct structure
      const workflowNode = node as unknown as WorkflowCanvasNode;
      onNodeClick(event, workflowNode);
      setIsConfigOpen(true);
    },
    [onNodeClick]
  );

  // Memoize node types to prevent re-renders
  const nodeTypes = useMemo(
    () => createNodeTypes(handleDeleteNode),
    [handleDeleteNode]
  );

  // Enhanced node update handler for config sheet
  const handleNodeUpdate = useCallback(
    (nodeId: string, data: Record<string, unknown>) => {
      updateNode(nodeId, data);
    },
    [updateNode]
  );

  // Only show full-page skeleton while workflow metadata is loading
  const isDesignerLoading = isLoadingWorkflow;
  const error = workflowError ?? canvasError;

  if (error) {
    return (
      <Card className="flex h-[600px] items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
          <h3 className="mt-4 text-lg font-semibold">Error loading workflow</h3>
          <p className="text-muted-foreground">
            {error.message ?? "Something went wrong"}
          </p>
        </div>
      </Card>
    );
  }

  if (isDesignerLoading) {
    return (
      <Card className="h-[600px] p-4">
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
        <Skeleton className="h-[500px] w-full" />
      </Card>
    );
  }

  return (
    <div className="flex h-full gap-4">
      {/* Sidebar - Node Types */}
      <ClientPermissionGuard
        requiredPermissions={[PERMISSIONS.WORKFLOWS_WRITE]}
      >
        <Card className="w-20 flex-shrink-0 p-2">
          <div className="flex flex-col gap-2">
            <div className="mb-2 text-center">
              <p className="text-xs font-medium text-muted-foreground">Nodes</p>
            </div>

            {/* Trigger Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddTrigger}
              className="h-14 w-full flex-col gap-1 p-1"
              title="Add Trigger"
            >
              <Plus className="h-5 w-5" />
              <span className="text-[10px] leading-tight">Trigger</span>
            </Button>

            {/* Action Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddAction}
              className="h-14 w-full flex-col gap-1 p-1"
              title="Add Action"
            >
              <Plus className="h-5 w-5" />
              <span className="text-[10px] leading-tight">Action</span>
            </Button>

            <div className="my-1 border-t border-border" />

            {/* Delay Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddDelay}
              className="h-14 w-full flex-col gap-1 border-amber-500/50 bg-amber-50 p-1 hover:border-amber-500 hover:bg-amber-100 dark:bg-amber-950/20 dark:hover:bg-amber-950/40"
              title="Add Delay Node"
            >
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <span className="text-[10px] leading-tight text-amber-900 dark:text-amber-100">
                Delay
              </span>
            </Button>

            {/* Loop Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddLoop}
              className="h-14 w-full flex-col gap-1 border-blue-500/50 bg-blue-50 p-1 hover:border-blue-500 hover:bg-blue-100 dark:bg-blue-950/20 dark:hover:bg-blue-950/40"
              title="Add Loop Node"
            >
              <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="text-[10px] leading-tight text-blue-900 dark:text-blue-100">
                Loop
              </span>
            </Button>

            {/* Query Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddQuery}
              className="h-14 w-full flex-col gap-1 border-emerald-500/50 bg-emerald-50 p-1 hover:border-emerald-500 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40"
              title="Add Query Node"
            >
              <Search className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-[10px] leading-tight text-emerald-900 dark:text-emerald-100">
                Query
              </span>
            </Button>

            {/* Filter Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddFilter}
              className="h-14 w-full flex-col gap-1 border-red-500/50 bg-red-50 p-1 hover:border-red-500 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40"
              title="Add Filter Node"
            >
              <FilterIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
              <span className="text-[10px] leading-tight text-red-900 dark:text-red-100">
                Filter
              </span>
            </Button>

            {/* Schedule Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddSchedule}
              className="h-14 w-full flex-col gap-1 border-indigo-500/50 bg-indigo-50 p-1 hover:border-indigo-500 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40"
              title="Add Schedule Node"
            >
              <CalendarClock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <span className="text-[10px] leading-tight text-indigo-900 dark:text-indigo-100">
                Schedule
              </span>
            </Button>

            {/* Condition Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddCondition}
              className="h-14 w-full flex-col gap-1 border-purple-500/50 bg-purple-50 p-1 hover:border-purple-500 hover:bg-purple-100 dark:bg-purple-950/20 dark:hover:bg-purple-950/40"
              title="Add Condition Node"
            >
              <GitBranch className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <span className="text-[10px] leading-tight text-purple-900 dark:text-purple-100">
                Condition
              </span>
            </Button>
          </div>
        </Card>
      </ClientPermissionGuard>

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <Card className="mb-4 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-xl font-semibold">{workflow?.name}</h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge
                    variant={
                      workflow?.status === "ACTIVE" ? "default" : "secondary"
                    }
                  >
                    {workflow?.status}
                  </Badge>
                  {hasUnsavedChanges ? (
                    <div className="flex items-center gap-1 text-orange-600">
                      <Clock className="h-3 w-3" />
                      <span>Unsaved changes</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-green-600">
                      <span>
                        Last saved:{" "}
                        {new Date(lastSaveTime).toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Save Button */}
              <ClientPermissionGuard
                requiredPermissions={[PERMISSIONS.WORKFLOWS_WRITE]}
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManualSave}
                  disabled={!hasUnsavedChanges || isLoadingWorkflow}
                  className="flex items-center gap-2"
                >
                  {isLoadingWorkflow ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save
                </Button>
              </ClientPermissionGuard>

              {/* Workflow Controls */}
              <ClientPermissionGuard
                requiredPermissions={[PERMISSIONS.WORKFLOWS_ADMIN]}
              >
                {workflow?.status === "ACTIVE" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      workflow &&
                      toggleWorkflowStatus(workflow.id, workflow.status)
                    }
                    disabled={updateWorkflowMutation.isPending}
                  >
                    {updateWorkflowMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Pause className="h-4 w-4" />
                    )}
                    Pause
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() =>
                      workflow &&
                      toggleWorkflowStatus(workflow.id, workflow.status)
                    }
                    disabled={updateWorkflowMutation.isPending}
                  >
                    {updateWorkflowMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    Activate
                  </Button>
                )}
              </ClientPermissionGuard>
            </div>
          </div>
        </Card>

        {/* React Flow Canvas */}
        <Card className="flex-1 overflow-hidden">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={handleNodeClickInternal}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid
            snapGrid={[15, 15]}
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            minZoom={0.1}
            maxZoom={2}
            attributionPosition="bottom-left"
          >
            <Controls />
            <MiniMap />
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
          </ReactFlow>
        </Card>
      </div>

      {/* Configuration Sheet */}
      {selectedNode && (
        <WorkflowConfigSheet
          isOpen={isConfigOpen}
          onOpenChange={setIsConfigOpen}
          selectedNode={selectedNode}
          workflow={
            workflow
              ? {
                  id: workflow.id,
                  name: workflow.name,
                  description: workflow.description ?? "",
                  status: workflow.status,
                }
              : undefined
          }
          organizationId={organizationId}
          onNodeUpdate={handleNodeUpdate}
          ensureNodeExists={ensureNodeExists}
        />
      )}
    </div>
  );
}
