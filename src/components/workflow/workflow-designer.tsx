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
} from "lucide-react";
import { TriggerNode } from "./nodes/trigger-node";
import { ActionNode } from "./nodes/action-node";
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

  // Add node handlers
  const handleAddTrigger = useCallback(() => {
    const position = { x: 100, y: 100 };
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
  }, [addNode, setSelectedNode]);

  const handleAddAction = useCallback(() => {
    const position = { x: 300, y: 200 };
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
  }, [addNode, setSelectedNode]);

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
    <div className="flex h-full flex-col">
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
                      Last saved: {new Date(lastSaveTime).toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Add Node Buttons */}
            <ClientPermissionGuard
              requiredPermissions={[PERMISSIONS.WORKFLOWS_WRITE]}
            >
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddTrigger}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Trigger
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddAction}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Action
              </Button>
            </ClientPermissionGuard>

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
