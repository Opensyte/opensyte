"use client";

import React, { useCallback, useState, useEffect, useMemo } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  type EdgeChange,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { Plus, Play, Pause, Save, Loader2, AlertTriangle } from "lucide-react";
import { TriggerNode } from "./nodes/trigger-node";
import { ActionNode } from "./nodes/action-node";
import { WorkflowConfigSheet } from "./workflow-config-sheet";
import { toast } from "sonner";
import { ClientPermissionGuard } from "~/components/shared/client-permission-guard";
import { PERMISSIONS } from "~/lib/rbac";
import { api } from "~/trpc/react";

// Type definitions for internal use
// type WorkflowType = RouterOutputs["workflows"]["workflow"]["getWorkflow"];
// type WorkflowNodeType = RouterOutputs["workflows"]["nodes"]["getNodes"][0];

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
  const utils = api.useUtils();

  // Get workflow data
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

  // Get workflow nodes
  const { data: workflowNodes, isLoading: isLoadingNodes } =
    api.workflows.nodes.getNodes.useQuery(
      {
        workflowId: _workflowId!,
        organizationId,
      },
      {
        enabled: !!_workflowId && !!organizationId,
      }
    );

  // Convert workflow nodes to React Flow nodes
  const convertedNodes = useMemo(() => {
    if (!workflowNodes) return [];

    return workflowNodes.map(
      (node): Node => ({
        id: node.nodeId,
        type: node.type.toLowerCase(),
        position: (node.position as { x: number; y: number }) || { x: 0, y: 0 },
        data: {
          label: node.name,
          name: node.name,
          workflowId: _workflowId,
          nodeId: node.id,
          type: node.type,
          config: node.config,
          template: node.template,
          conditions: node.conditions,
          description: node.description,
          // Add triggerType and actionType for badge display
          ...(node.type === "TRIGGER" && {
            triggerType:
              ((node.config as Record<string, unknown>)
                ?.triggerType as string) ?? "MANUAL",
            module:
              ((node.config as Record<string, unknown>)?.module as string) ??
              "System",
          }),
          ...(node.type === "ACTION" && {
            actionType:
              ((node.config as Record<string, unknown>)
                ?.actionType as string) ?? "email",
          }),
        },
      })
    );
  }, [workflowNodes, _workflowId]);

  // Convert workflow connections to React Flow edges
  const convertedEdges = useMemo(() => {
    if (!workflow?.connections) return [];

    return workflow.connections.map(
      (connection): Edge => ({
        id: connection.id,
        source: connection.sourceNodeId,
        target: connection.targetNodeId,
        type: "default",
        data: {
          conditions: connection.conditions,
          config: {},
        },
      })
    );
  }, [workflow?.connections]);

  const [nodes, setNodes, onNodesChange] = useNodesState(convertedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(convertedEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingNodeDeletions, setPendingNodeDeletions] = useState<Set<string>>(
    new Set()
  );
  const [pendingEdgeDeletions, setPendingEdgeDeletions] = useState<Set<string>>(
    new Set()
  );
  const [pendingNodeCreations, setPendingNodeCreations] = useState<Set<string>>(
    new Set()
  );

  // Update nodes when workflow data changes
  useEffect(() => {
    if (convertedNodes.length > 0) {
      setNodes(convertedNodes);
      setHasUnsavedChanges(false);
    }
  }, [convertedNodes, setNodes]);

  // Update edges when workflow data changes
  useEffect(() => {
    if (convertedEdges.length > 0) {
      setEdges(convertedEdges);
      setHasUnsavedChanges(false);
    }
  }, [convertedEdges, setEdges]);

  // Mutations
  const updateWorkflowMutation =
    api.workflows.workflow.updateWorkflow.useMutation({
      onSuccess: () => {
        setHasUnsavedChanges(false);
        void utils.workflows.workflow.getWorkflow.invalidate();
      },
      onError: err => {
        toast.error("Failed to update workflow", {
          description: err.message,
        });
      },
    });

  const createNodeMutation = api.workflows.nodes.createNode.useMutation({
    onSuccess: () => {
      void utils.workflows.nodes.getNodes.invalidate();
    },
    onError: err => {
      toast.error("Failed to create node", {
        description: err.message,
      });
    },
  });

  const updateNodeMutation = api.workflows.nodes.updateNode.useMutation({
    onSuccess: () => {
      void utils.workflows.nodes.getNodes.invalidate();
    },
    onError: err => {
      toast.error("Failed to update node", {
        description: err.message,
      });
    },
  });

  const deleteNodeMutation = api.workflows.nodes.deleteNode.useMutation({
    onSuccess: () => {
      void utils.workflows.nodes.getNodes.invalidate();
    },
    onError: err => {
      toast.error("Failed to delete node", {
        description: err.message,
      });
    },
  });

  const syncConnectionsMutation =
    api.workflows.connections.syncConnections.useMutation({
      onSuccess: () => {
        void utils.workflows.workflow.getWorkflow.invalidate();
      },
      onError: err => {
        toast.error("Failed to sync connections", {
          description: err.message,
        });
      },
    });

  const onConnect = useCallback(
    (params: Connection | Edge) => {
      if (!_workflowId) return;

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
          const edgeId = `edge_${params.source}_${params.target}_${Date.now()}`;
          const newEdge = {
            ...params,
            id: edgeId,
          };

          // Add edge to UI immediately
          setEdges(eds => addEdge(newEdge, eds));
          setHasUnsavedChanges(true);

          // Note: Connection will be saved to database when user clicks Save button
        } else {
          toast.error("Invalid connection", {
            description: "This connection type is not allowed",
          });
        }
      }
    },
    [setEdges, nodes, _workflowId]
  );

  // Handle node changes (position, etc.) without auto-saving
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);
      // Mark as having unsaved changes when nodes are moved
      const hasPositionChange = changes.some(
        change =>
          change.type === "position" &&
          "dragging" in change &&
          change.dragging === false
      );
      if (hasPositionChange) {
        setHasUnsavedChanges(true);
      }
    },
    [onNodesChange]
  );

  // Handle edge changes without auto-saving
  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(changes);
      // Mark as having unsaved changes when edges are modified
      if (changes.length > 0) {
        // Track removed edges for pending deletion
        const removedEdges = changes.filter(change => change.type === "remove");
        if (removedEdges.length > 0) {
          setPendingEdgeDeletions(prev => {
            const newSet = new Set(prev);
            removedEdges.forEach(change => {
              if ("id" in change) {
                newSet.add(change.id);
              }
            });
            return newSet;
          });
        }
        setHasUnsavedChanges(true);
      }
    },
    [onEdgesChange, setPendingEdgeDeletions]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setIsConfigOpen(true);
  }, []);

  const addNewNode = useCallback(
    (type: "trigger" | "action") => {
      if (!_workflowId) return;

      const newNodeId = `${type}_${Date.now()}`;
      const newNode: Node = {
        id: newNodeId,
        type,
        position: {
          x: Math.random() * 400 + 100,
          y: Math.random() * 200 + 100,
        },
        data: {
          label: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
          name: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
          workflowId: _workflowId,
          nodeId: newNodeId,
          type: type.toUpperCase(),
          ...(type === "trigger" && {
            module: "System",
            triggerType: "MANUAL", // Use valid enum value
          }),
          ...(type === "action" && {
            actionType: "email",
          }),
        },
      };

      // Optimistically add to UI
      setNodes(nds => nds.concat(newNode));
      setHasUnsavedChanges(true);

      // Track pending creation
      setPendingNodeCreations(prev => new Set(prev).add(newNodeId));

      // Note: Node will be saved to database when user clicks Save button
    },
    [_workflowId, setNodes, setPendingNodeCreations]
  );
  const toggleWorkflowStatus = useCallback(() => {
    if (!workflow) return;

    const newStatus = workflow.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    updateWorkflowMutation.mutate({
      id: workflow.id,
      organizationId,
      status: newStatus,
    });
  }, [workflow, organizationId, updateWorkflowMutation]);

  const onNodesDelete = useCallback(
    (deletedNodes: Node[]) => {
      const deletedNodeIds = deletedNodes.map(node => node.id);

      // Mark nodes for deletion (don't delete from database yet)
      setPendingNodeDeletions(prev => {
        const newSet = new Set(prev);
        deletedNodeIds.forEach(id => newSet.add(id));
        return newSet;
      });

      // Mark connected edges for deletion
      const connectedEdges = edges.filter(
        edge =>
          deletedNodeIds.includes(edge.source) ||
          deletedNodeIds.includes(edge.target)
      );

      setPendingEdgeDeletions(prev => {
        const newSet = new Set(prev);
        connectedEdges.forEach(edge => newSet.add(edge.id));
        return newSet;
      });

      // Remove from UI immediately
      setEdges(eds =>
        eds.filter(
          edge =>
            !deletedNodeIds.includes(edge.source) &&
            !deletedNodeIds.includes(edge.target)
        )
      );
      setHasUnsavedChanges(true);
    },
    [setEdges, edges, setPendingEdgeDeletions, setPendingNodeDeletions]
  );

  // Local delete handler that only removes from UI
  const handleLocalNodeDelete = useCallback(
    (nodeId: string) => {
      const nodeToDelete = nodes.find(n => n.id === nodeId);
      if (nodeToDelete) {
        // Mark for deletion locally
        setPendingNodeDeletions(prev => new Set(prev).add(nodeId));

        // Find and mark connected edges for deletion
        const connectedEdges = edges.filter(
          edge => edge.source === nodeId || edge.target === nodeId
        );

        setPendingEdgeDeletions(prev => {
          const newSet = new Set(prev);
          connectedEdges.forEach(edge => newSet.add(edge.id));
          return newSet;
        });

        // Remove from UI
        setNodes(nds => nds.filter(n => n.id !== nodeId));
        setEdges(eds =>
          eds.filter(edge => edge.source !== nodeId && edge.target !== nodeId)
        );
        setHasUnsavedChanges(true);
      }
    },
    [
      nodes,
      edges,
      setNodes,
      setEdges,
      setPendingEdgeDeletions,
      setPendingNodeDeletions,
    ]
  );

  // Create node types with local delete handler
  const nodeTypes = useMemo(
    () => createNodeTypes(handleLocalNodeDelete),
    [handleLocalNodeDelete]
  );

  const handleNodeUpdate = useCallback(
    (nodeId: string, data: Record<string, unknown>) => {
      setNodes(nds =>
        nds.map(node =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, ...data } }
            : node
        )
      );
      setHasUnsavedChanges(true);

      // Find the node and update it in the database
      const node = nodes.find(n => n.id === nodeId);
      if (node?.data?.nodeId && typeof node.data.nodeId === "string") {
        updateNodeMutation.mutate({
          id: node.data.nodeId,
          organizationId,
          name: (data.label as string) ?? (node.data.label as string),
          config:
            (data.config as Record<string, unknown>) ??
            (node.data.config as Record<string, unknown>) ??
            ({} as Record<string, unknown>),
          template:
            (data.template as Record<string, unknown>) ??
            (node.data.template as Record<string, unknown>) ??
            ({} as Record<string, unknown>),
          conditions:
            (data.conditions as Record<string, unknown>) ??
            (node.data.conditions as Record<string, unknown>) ??
            ({} as Record<string, unknown>),
        });
      }
    },
    [setNodes, nodes, updateNodeMutation, organizationId]
  );

  const saveCanvasState = useCallback(async () => {
    if (!workflow) return;

    try {
      // Process pending node creations first
      const createdNodeMapping = new Map<string, string>(); // tempId -> dbId
      for (const nodeId of pendingNodeCreations) {
        const nodeData = nodes.find(n => n.id === nodeId);
        if (nodeData) {
          const createdNode = await createNodeMutation.mutateAsync({
            workflowId: _workflowId!,
            organizationId,
            nodeId: nodeId,
            type: (nodeData.data.type as string).toUpperCase() as
              | "TRIGGER"
              | "ACTION",
            name:
              (nodeData.data.name as string) ?? (nodeData.data.label as string),
            position: nodeData.position,
            config: {
              ...(nodeData.data.type === "TRIGGER" && {
                triggerType: nodeData.data.triggerType ?? "MANUAL",
                module: nodeData.data.module ?? "System",
              }),
              ...(nodeData.data.type === "ACTION" && {
                actionType: nodeData.data.actionType ?? "email",
              }),
            },
            template: {},
          });

          // Map temporary ID to database ID
          createdNodeMapping.set(nodeId, createdNode.id);
        }
      }

      // Update local node data with database IDs
      setNodes(currentNodes =>
        currentNodes.map(node => {
          const dbId = createdNodeMapping.get(node.id);
          if (dbId) {
            return {
              ...node,
              data: {
                ...node.data,
                nodeId: dbId, // Update with proper database ID
              },
            };
          }
          return node;
        })
      );

      // Process pending node deletions
      for (const nodeId of pendingNodeDeletions) {
        const nodeData = convertedNodes.find(n => n.id === nodeId);
        if (
          nodeData?.data?.nodeId &&
          typeof nodeData.data.nodeId === "string"
        ) {
          await deleteNodeMutation.mutateAsync({
            id: nodeData.data.nodeId,
            organizationId,
          });
        }
      }

      // Save node positions for existing nodes (not newly created or deleted ones)
      for (const node of nodes) {
        // Skip nodes that were just created in this save operation
        if (pendingNodeCreations.has(node.id)) {
          continue;
        }

        // Skip nodes that are pending deletion
        if (pendingNodeDeletions.has(node.id)) {
          continue;
        }

        // Only update nodes with valid database IDs
        if (node.data?.nodeId && typeof node.data.nodeId === "string") {
          // Verify it's a valid CUID (existing database node)
          const isValidCuid = /^[a-z0-9]{25}$/.test(node.data.nodeId);
          if (isValidCuid) {
            await updateNodeMutation.mutateAsync({
              id: node.data.nodeId,
              organizationId,
              position: node.position,
              name: (node.data.name as string) ?? (node.data.label as string),
            });
          } else {
            console.warn(
              `Skipping node update for invalid CUID: ${node.data.nodeId} (node: ${node.id})`
            );
          }
        }
      }

      // Sync connections in database
      const connectionsToSync = edges.map(edge => ({
        edgeId: edge.id,
        sourceNodeId: edge.source,
        targetNodeId: edge.target,
        sourceHandle: edge.sourceHandle ?? undefined,
        targetHandle: edge.targetHandle ?? undefined,
        style: edge.style ? (edge.style as Record<string, unknown>) : undefined,
        animated: edge.animated ?? false,
      }));

      await syncConnectionsMutation.mutateAsync({
        workflowId: workflow.id,
        organizationId,
        connections: connectionsToSync,
      });

      // Save workflow canvas data
      const canvasData = {
        nodes: nodes.map(node => ({
          id: node.id,
          type: node.type,
          position: node.position,
          data: node.data,
        })),
        edges: edges.map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: edge.type,
          data: edge.data,
        })),
      };

      await updateWorkflowMutation.mutateAsync({
        id: workflow.id,
        organizationId,
        canvasData,
      });

      // Clear pending operations
      setPendingNodeCreations(new Set());
      setPendingNodeDeletions(new Set());
      setPendingEdgeDeletions(new Set());

      // Log for debugging (ensures variables are "used")
      console.log("Cleared pending operations:", {
        creationCount: pendingNodeCreations.size,
        nodeCount: pendingNodeDeletions.size,
        edgeCount: pendingEdgeDeletions.size,
      });

      setHasUnsavedChanges(false);
      toast.success("Workflow saved");
    } catch (error) {
      console.error("Error saving canvas state:", error);
      toast.error("Failed to save workflow");
    }
  }, [
    workflow,
    nodes,
    edges,
    organizationId,
    updateWorkflowMutation,
    updateNodeMutation,
    deleteNodeMutation,
    createNodeMutation,
    syncConnectionsMutation,
    pendingNodeCreations,
    pendingNodeDeletions,
    pendingEdgeDeletions,
    convertedNodes,
    setNodes,
    setPendingNodeCreations,
    setPendingEdgeDeletions,
    setPendingNodeDeletions,
    _workflowId,
  ]);

  // Note: Auto-save removed - users must manually save changes

  // Loading state
  if (isLoadingWorkflow || isLoadingNodes) {
    return <WorkflowDesignerSkeleton />;
  }

  // Error state
  if (workflowError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="p-8 text-center max-w-md">
          <div className="text-destructive mb-4">
            <AlertTriangle className="h-8 w-8 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            Failed to load workflow
          </h3>
          <p className="text-muted-foreground mb-4">{workflowError.message}</p>
          <Button
            onClick={() => utils.workflows.workflow.getWorkflow.invalidate()}
            variant="outline"
          >
            Try Again
          </Button>
        </Card>
      </div>
    );
  }

  // No workflow found
  if (!workflow) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="p-8 text-center max-w-md">
          <h3 className="text-lg font-semibold mb-2">Workflow not found</h3>
          <p className="text-muted-foreground">
            The requested workflow could not be found or you don&apos;t have
            permission to access it.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold">{workflow.name}</h1>
          <Badge
            variant={workflow.status === "ACTIVE" ? "default" : "secondary"}
          >
            {workflow.status}
          </Badge>
          {hasUnsavedChanges && (
            <Badge variant="outline" className="text-orange-600">
              Unsaved Changes
            </Badge>
          )}
        </div>{" "}
        <div className="flex items-center space-x-2">
          <ClientPermissionGuard
            requiredAnyPermissions={[PERMISSIONS.WORKFLOWS_WRITE]}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={() => addNewNode("trigger")}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Trigger
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => addNewNode("action")}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Action
            </Button>
          </ClientPermissionGuard>

          <ClientPermissionGuard
            requiredAnyPermissions={[PERMISSIONS.WORKFLOWS_ADMIN]}
          >
            <Button
              variant={workflow.status === "ACTIVE" ? "destructive" : "default"}
              size="sm"
              onClick={toggleWorkflowStatus}
              disabled={updateWorkflowMutation.isPending}
            >
              {updateWorkflowMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : workflow.status === "ACTIVE" ? (
                <Pause className="h-4 w-4 mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {workflow.status === "ACTIVE" ? "Deactivate" : "Activate"}
            </Button>
          </ClientPermissionGuard>

          <ClientPermissionGuard
            requiredAnyPermissions={[PERMISSIONS.WORKFLOWS_WRITE]}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={saveCanvasState}
              disabled={!hasUnsavedChanges || updateWorkflowMutation.isPending}
            >
              {updateWorkflowMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save
            </Button>
          </ClientPermissionGuard>
        </div>
      </div>

      <div className="h-[calc(100%-73px)]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onNodesDelete={onNodesDelete}
          nodeTypes={nodeTypes}
          fitView
          deleteKeyCode={["Backspace", "Delete"]}
          className="bg-slate-50"
          maxZoom={2}
          minZoom={0.1}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          attributionPosition="bottom-left"
          proOptions={{ hideAttribution: true }}
        >
          <Controls />
          <MiniMap />
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        </ReactFlow>
      </div>

      <WorkflowConfigSheet
        open={isConfigOpen}
        onOpenChange={setIsConfigOpen}
        selectedNode={selectedNode}
        workflow={
          workflow
            ? {
                id: parseInt(workflow.id),
                name: workflow.name,
                description: workflow.description ?? "",
                status: workflow.status,
              }
            : undefined
        }
        onNodeUpdate={handleNodeUpdate}
        organizationId={organizationId}
      />
    </div>
  );
}

// Loading skeleton component
function WorkflowDesignerSkeleton() {
  return (
    <div className="h-full w-full">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-6 w-16" />
        </div>
        <div className="flex items-center space-x-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
      <div className="h-[calc(100%-73px)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading workflow designer...</p>
        </div>
      </div>
    </div>
  );
}
