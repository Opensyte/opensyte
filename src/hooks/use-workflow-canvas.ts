import { useCallback, useEffect, useRef, useState } from "react";
import {
  type Node,
  type Edge,
  addEdge,
  type Connection,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import type { WorkflowNodeType } from "@prisma/client";

type ReactFlowNodeType =
  | "trigger"
  | "action"
  | "delay"
  | "loop"
  | "query"
  | "filter"
  | "schedule";

const workflowToReactFlowTypeMap: Partial<
  Record<WorkflowNodeType, ReactFlowNodeType>
> = {
  TRIGGER: "trigger",
  ACTION: "action",
  DELAY: "delay",
  LOOP: "loop",
  QUERY: "query",
  FILTER: "filter",
  SCHEDULE: "schedule",
};

const toReactFlowType = (type: WorkflowNodeType): ReactFlowNodeType => {
  return workflowToReactFlowTypeMap[type] ?? "action";
};

export interface WorkflowCanvasNode extends Node {
  data: {
    dbId?: string; // Primary key in DB: WorkflowNode.id
    nodeId: string;
    type: WorkflowNodeType;
    name: string;
    description?: string;
    config?: Record<string, unknown>;
    template?: Record<string, unknown>;
    executionOrder?: number;
    isOptional?: boolean;
    retryLimit?: number;
    timeout?: number;
    conditions?: Record<string, unknown>;
    // Additional UI-specific properties
    label?: string;
    triggerType?: string;
    actionType?: string;
    module?: string;
    resultKey?: string;
    cron?: string;
    delayMs?: number;
    dataSource?: string;
    sourceKey?: string;
    itemVariable?: string;
    indexVariable?: string;
    maxIterations?: number;
    emptyPathHandle?: string;
    model?: string;
    filters?: Array<Record<string, unknown>>;
    orderBy?: Array<Record<string, unknown>>;
    limit?: number;
    offset?: number;
    fallbackKey?: string;
    logicalOperator?: string;
    frequency?: string;
    timezone?: string;
    startAt?: string;
    endAt?: string;
    isActive?: boolean;
    metadata?: Record<string, unknown>;
  };
}

export interface WorkflowCanvasEdge extends Edge {
  data?: {
    edgeId: string;
    executionOrder?: number;
    conditions?: Record<string, unknown>;
  };
}

interface UseWorkflowCanvasProps {
  workflowId: string;
  organizationId: string;
  autoSaveDelay?: number; // Default 1000ms
}

export function useWorkflowCanvas({
  workflowId,
  organizationId,
  autoSaveDelay: _autoSaveDelay = 1000,
}: UseWorkflowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowCanvasNode>(
    []
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<WorkflowCanvasEdge>(
    []
  );
  const [selectedNode, setSelectedNode] = useState<WorkflowCanvasNode | null>(
    null
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<number>(Date.now());
  const [isLocalLoading, setIsLocalLoading] = useState(false);

  const utils = api.useUtils();
  const manualSaveRef = useRef(false);

  // Queries for initial data
  const {
    data: workflowNodes,
    isLoading: isLoadingNodes,
    error: nodesError,
  } = api.workflows.nodes.getNodes.useQuery(
    { workflowId, organizationId },
    {
      enabled: !!workflowId && !!organizationId,
      staleTime: 30000, // 30 seconds
      refetchOnWindowFocus: false,
    }
  );

  const {
    data: workflowConnections,
    isLoading: isLoadingConnections,
    error: connectionsError,
  } = api.workflows.connections.getConnections.useQuery(
    { workflowId, organizationId },
    {
      enabled: !!workflowId && !!organizationId,
      staleTime: 30000, // 30 seconds
      refetchOnWindowFocus: false,
    }
  );

  // Mutations
  const syncCanvasMutation = api.workflows.workflow.syncCanvas.useMutation({
    onSuccess: data => {
      setHasUnsavedChanges(false);
      setLastSaveTime(Date.now());

      // Update caches with returned data
      utils.workflows.nodes.getNodes.setData(
        { workflowId, organizationId },
        data.nodes
      );

      // Transform connections back to the expected format
      const transformedConnections = data.connections.map(conn => ({
        id: conn.id,
        workflowId: conn.workflowId,
        edgeId: conn.edgeId,
        sourceNodeId: conn.sourceNodeId,
        targetNodeId: conn.targetNodeId,
        executionOrder: conn.executionOrder,
        sourceHandle: conn.sourceHandle,
        targetHandle: conn.targetHandle,
        label: conn.label,
        conditions: conn.conditions,
        style: conn.style,
        animated: conn.animated,
        createdAt: conn.createdAt,
        updatedAt: conn.updatedAt,
      }));

      utils.workflows.connections.getConnections.setData(
        { workflowId, organizationId },
        transformedConnections
      );

      if (manualSaveRef.current) {
        toast.success("Workflow saved successfully");
      }
    },
    onError: error => {
      console.error("Failed to sync canvas:", error);
      toast.error("Failed to save workflow", {
        description: error.message,
      });
    },
  });

  const upsertNodeMutation = api.workflows.nodes.upsertNode.useMutation({
    onError: error => {
      console.error("Failed to upsert node:", error);
      toast.error("Failed to save node", {
        description: error.message,
      });
    },
  });

  // Transform server data to React Flow format
  const transformServerNodesToReactFlow = useCallback(
    (serverNodes: typeof workflowNodes): WorkflowCanvasNode[] => {
      if (!serverNodes) return [];

      return serverNodes.map(node => ({
        id: node.nodeId,
        type: toReactFlowType(node.type),
        position: node.position as { x: number; y: number },
        data: (() => {
          const config = (node.config as Record<string, unknown>) ?? {};
          const derived: Partial<WorkflowCanvasNode["data"]> = {};

          switch (node.type) {
            case "DELAY": {
              const delayMs = config.delayMs;
              if (typeof delayMs === "number") {
                derived.delayMs = delayMs;
              }
              if (typeof config.resultKey === "string") {
                derived.resultKey = config.resultKey;
              }
              break;
            }
            case "LOOP": {
              if (typeof config.dataSource === "string") {
                derived.dataSource = config.dataSource;
              }
              if (typeof config.sourceKey === "string") {
                derived.sourceKey = config.sourceKey;
              }
              if (typeof config.itemVariable === "string") {
                derived.itemVariable = config.itemVariable;
              }
              if (typeof config.indexVariable === "string") {
                derived.indexVariable = config.indexVariable;
              }
              if (typeof config.maxIterations === "number") {
                derived.maxIterations = config.maxIterations;
              }
              if (typeof config.resultKey === "string") {
                derived.resultKey = config.resultKey;
              }
              if (typeof config.emptyPathHandle === "string") {
                derived.emptyPathHandle = config.emptyPathHandle;
              }
              break;
            }
            case "QUERY": {
              if (typeof config.model === "string") {
                derived.model = config.model;
              }
              if (Array.isArray(config.filters)) {
                derived.filters = config.filters as Array<
                  Record<string, unknown>
                >;
              }
              if (Array.isArray(config.orderBy)) {
                derived.orderBy = config.orderBy as Array<
                  Record<string, unknown>
                >;
              }
              if (typeof config.limit === "number") {
                derived.limit = config.limit;
              }
              if (typeof config.offset === "number") {
                derived.offset = config.offset;
              }
              if (typeof config.resultKey === "string") {
                derived.resultKey = config.resultKey;
              }
              if (typeof config.fallbackKey === "string") {
                derived.fallbackKey = config.fallbackKey;
              }
              break;
            }
            case "FILTER": {
              if (typeof config.sourceKey === "string") {
                derived.sourceKey = config.sourceKey;
              }
              if (Array.isArray(config.conditions)) {
                derived.filters = config.conditions as Array<
                  Record<string, unknown>
                >;
              }
              if (typeof config.logicalOperator === "string") {
                derived.logicalOperator = config.logicalOperator;
              }
              if (typeof config.resultKey === "string") {
                derived.resultKey = config.resultKey;
              }
              if (typeof config.fallbackKey === "string") {
                derived.fallbackKey = config.fallbackKey;
              }
              break;
            }
            case "SCHEDULE": {
              if (typeof config.cron === "string") {
                derived.cron = config.cron;
              }
              if (typeof config.frequency === "string") {
                derived.frequency = config.frequency;
              }
              if (typeof config.timezone === "string") {
                derived.timezone = config.timezone;
              }
              if (typeof config.startAt === "string") {
                derived.startAt = config.startAt;
              }
              if (typeof config.endAt === "string") {
                derived.endAt = config.endAt;
              }
              if (typeof config.isActive === "boolean") {
                derived.isActive = config.isActive;
              }
              if (typeof config.resultKey === "string") {
                derived.resultKey = config.resultKey;
              }
              if (config.metadata && typeof config.metadata === "object") {
                derived.metadata = config.metadata as Record<string, unknown>;
              }
              break;
            }
            default: {
              if (typeof config.resultKey === "string") {
                derived.resultKey = config.resultKey;
              }
            }
          }

          return {
            dbId: node.id,
            nodeId: node.nodeId,
            type: node.type,
            name: node.name,
            description: node.description ?? undefined,
            config,
            template: (node.template as Record<string, unknown>) ?? {},
            executionOrder: node.executionOrder ?? undefined,
            isOptional: node.isOptional,
            retryLimit: node.retryLimit,
            timeout: node.timeout ?? undefined,
            conditions: (node.conditions as Record<string, unknown>) ?? {},
            label: node.name,
            ...derived,
          };
        })(),
      }));
    },
    []
  );

  const transformServerConnectionsToReactFlow = useCallback(
    (serverConnections: typeof workflowConnections): WorkflowCanvasEdge[] => {
      if (!serverConnections) return [];

      // Map DB WorkflowNode.id -> React Flow nodeId
      const dbIdToRfId = new Map<string, string>();
      if (workflowNodes) {
        for (const n of workflowNodes) {
          dbIdToRfId.set(n.id, n.nodeId);
        }
      }

      const edges: WorkflowCanvasEdge[] = [];
      for (const conn of serverConnections) {
        const sourceRfId = dbIdToRfId.get(conn.sourceNodeId);
        const targetRfId = dbIdToRfId.get(conn.targetNodeId);
        if (!sourceRfId || !targetRfId) {
          // Skip connections that reference nodes not present locally
          // These will be reconciled after next nodes fetch/save
          continue;
        }

        edges.push({
          id: conn.edgeId ?? conn.id,
          source: sourceRfId,
          target: targetRfId,
          sourceHandle: conn.sourceHandle ?? undefined,
          targetHandle: conn.targetHandle ?? undefined,
          label: conn.label ?? undefined,
          style: (conn.style as Record<string, unknown>) ?? {},
          animated: conn.animated,
          data: {
            edgeId: conn.edgeId ?? conn.id,
            executionOrder: conn.executionOrder,
            conditions: (conn.conditions as Record<string, unknown>) ?? {},
          },
        });
      }

      return edges;
    },
    [workflowNodes]
  );

  // Transform React Flow data to server format
  const transformReactFlowNodesToServer = useCallback(
    (reactFlowNodes: WorkflowCanvasNode[]) => {
      return reactFlowNodes.map(node => ({
        nodeId: node.data.nodeId ?? node.id,
        type: node.data.type,
        name: node.data.name ?? node.data.label ?? "Untitled Node",
        description: node.data.description,
        position: node.position,
        config: node.data.config ?? {},
        template: node.data.template ?? {},
        executionOrder: node.data.executionOrder,
        isOptional: node.data.isOptional ?? false,
        retryLimit: node.data.retryLimit ?? 3,
        timeout: node.data.timeout,
        conditions: node.data.conditions ?? {},
      }));
    },
    []
  );

  const transformReactFlowConnectionsToServer = useCallback(
    (reactFlowEdges: WorkflowCanvasEdge[]) => {
      return reactFlowEdges.map(edge => ({
        edgeId: edge.data?.edgeId ?? edge.id,
        sourceNodeId: edge.source,
        targetNodeId: edge.target,
        sourceHandle: edge.sourceHandle ?? undefined,
        targetHandle: edge.targetHandle ?? undefined,
        label: edge.label as string | undefined,
        conditions: edge.data?.conditions ?? {},
        style: (edge.style as Record<string, unknown>) ?? {},
        animated: edge.animated ?? false,
        executionOrder: edge.data?.executionOrder ?? 1,
      }));
    },
    []
  );

  // Initialize nodes/edges only once on first load
  const hasHydratedRef = useRef(false);
  useEffect(() => {
    if (!hasHydratedRef.current && workflowNodes && workflowConnections) {
      const transformedNodes = transformServerNodesToReactFlow(workflowNodes);
      const transformedEdges =
        transformServerConnectionsToReactFlow(workflowConnections);

      setNodes(transformedNodes);
      setEdges(transformedEdges);
      setHasUnsavedChanges(false);
      hasHydratedRef.current = true;
    }
  }, [
    workflowNodes,
    workflowConnections,
    transformServerNodesToReactFlow,
    transformServerConnectionsToReactFlow,
    setNodes,
    setEdges,
  ]);

  // Enhanced node change handler that marks as dirty
  const handleNodesChange = useCallback(
    (changes: Parameters<typeof onNodesChange>[0]) => {
      onNodesChange(changes);
      setHasUnsavedChanges(true);
    },
    [onNodesChange]
  );

  // Enhanced edge change handler that marks as dirty
  const handleEdgesChange = useCallback(
    (changes: Parameters<typeof onEdgesChange>[0]) => {
      onEdgesChange(changes);
      setHasUnsavedChanges(true);
    },
    [onEdgesChange]
  );

  // Connection handler
  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdge: WorkflowCanvasEdge = {
        ...connection,
        id: `${connection.source}-${connection.target}-${Date.now()}`,
        data: {
          edgeId: `${connection.source}-${connection.target}-${Date.now()}`,
          executionOrder: 1,
          conditions: {},
        },
      };

      setEdges(eds => addEdge(newEdge, eds));
      setHasUnsavedChanges(true);
    },
    [setEdges]
  );

  // Manual save function
  const saveCanvas = useCallback(
    async (manual?: boolean) => {
      if (!workflowId || syncCanvasMutation.isPending) return;

      manualSaveRef.current = Boolean(manual);
      if (manual) setIsLocalLoading(true);

      try {
        const serverNodes = transformReactFlowNodesToServer(nodes);
        const serverConnections = transformReactFlowConnectionsToServer(edges);

        await syncCanvasMutation.mutateAsync({
          organizationId,
          workflowId,
          nodes: serverNodes,
          connections: serverConnections,
        });
      } catch (error) {
        console.error("Save canvas error:", error);
      } finally {
        if (manual) setIsLocalLoading(false);
        manualSaveRef.current = false;
      }
    },
    [
      workflowId,
      organizationId,
      nodes,
      edges,
      syncCanvasMutation,
      transformReactFlowNodesToServer,
      transformReactFlowConnectionsToServer,
    ]
  );

  // Ensure node exists before external operations (for config sheet)
  const ensureNodeExists = useCallback(
    async (nodeId: string): Promise<string> => {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) throw new Error("Node not found");

      try {
        const result = await upsertNodeMutation.mutateAsync({
          organizationId,
          workflowId,
          nodeId: node.data.nodeId ?? node.id,
          type: node.data.type,
          name: node.data.name ?? node.data.label ?? "Untitled Node",
          description: node.data.description,
          position: node.position,
          config: node.data.config ?? {},
          template: node.data.template ?? {},
          executionOrder: node.data.executionOrder,
          isOptional: node.data.isOptional ?? false,
          retryLimit: node.data.retryLimit ?? 3,
          timeout: node.data.timeout,
          conditions: node.data.conditions ?? {},
        });

        // Update the local node with the database ID
        setNodes(nds =>
          nds.map(n =>
            n.id === nodeId ? { ...n, data: { ...n.data, dbId: result.id } } : n
          )
        );

        return result.id;
      } catch (error) {
        console.error("Failed to ensure node exists:", error);
        throw error;
      }
    },
    [nodes, organizationId, workflowId, upsertNodeMutation, setNodes]
  );

  // Node selection handler
  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: WorkflowCanvasNode) => {
      setSelectedNode(node);
    },
    []
  );

  // Add node function
  const addNode = useCallback(
    (
      nodeData: Partial<WorkflowCanvasNode["data"]>,
      position: { x: number; y: number }
    ) => {
      const nodeId = `node-${Date.now()}`;
      const newNode: WorkflowCanvasNode = {
        id: nodeId,
        type: nodeData.type ? toReactFlowType(nodeData.type) : "action",
        position,
        data: {
          nodeId,
          type: nodeData.type ?? "ACTION",
          name: nodeData.name ?? "New Node",
          description: nodeData.description,
          config: nodeData.config ?? {},
          template: nodeData.template ?? {},
          executionOrder: nodeData.executionOrder,
          isOptional: nodeData.isOptional ?? false,
          retryLimit: nodeData.retryLimit ?? 3,
          timeout: nodeData.timeout,
          conditions: nodeData.conditions ?? {},
          label: nodeData.name ?? "New Node",
          ...nodeData,
        },
      };

      setNodes(nds => [...nds, newNode]);
      setHasUnsavedChanges(true);
      return newNode;
    },
    [setNodes]
  );

  // Update node function
  const updateNode = useCallback(
    (nodeId: string, updates: Partial<WorkflowCanvasNode["data"]>) => {
      setNodes(nds =>
        nds.map(node =>
          node.id === nodeId
            ? {
                ...node,
                data: { ...node.data, ...updates },
                type: updates.type ? toReactFlowType(updates.type) : node.type,
              }
            : node
        )
      );
      setHasUnsavedChanges(true);
    },
    [setNodes]
  );

  // Delete node function
  const deleteNode = useCallback(
    (nodeId: string) => {
      setNodes(nds => nds.filter(n => n.id !== nodeId));
      setEdges(eds =>
        eds.filter(e => e.source !== nodeId && e.target !== nodeId)
      );
      setHasUnsavedChanges(true);

      if (selectedNode?.id === nodeId) {
        setSelectedNode(null);
      }
    },
    [setNodes, setEdges, selectedNode]
  );

  const isLoading = isLoadingNodes || isLoadingConnections;
  const isSaving =
    isLocalLoading || (manualSaveRef.current && syncCanvasMutation.isPending);
  const error = nodesError ?? connectionsError;

  return {
    // State
    nodes,
    edges,
    selectedNode,
    hasUnsavedChanges,
    isLoading,
    error,
    lastSaveTime,

    // Handlers
    onNodesChange: handleNodesChange,
    onEdgesChange: handleEdgesChange,
    onConnect,
    onNodeClick: handleNodeClick,

    // Actions
    saveCanvas,
    isSaving,
    ensureNodeExists,
    addNode,
    updateNode,
    deleteNode,
    setSelectedNode,

    // State setters (for advanced use cases)
    setNodes,
    setEdges,
  };
}
