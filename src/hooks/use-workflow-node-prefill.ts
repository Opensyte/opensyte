"use client";

import { useEffect, useMemo, useState } from "react";
import type { WorkflowCanvasNode } from "./use-workflow-canvas";
import { api, type RouterOutputs } from "~/trpc/react";

export type WorkflowNodeRecord =
  RouterOutputs["workflows"]["nodes"]["getNodes"][number];

interface UseWorkflowNodePrefillOptions {
  workflowId?: string;
  organizationId?: string;
  node: WorkflowCanvasNode;
}

const getMatchingNode = (
  nodes: WorkflowNodeRecord[] | undefined,
  node: WorkflowCanvasNode
): WorkflowNodeRecord | null => {
  if (!nodes) return null;
  const candidateId = node.data.nodeId ?? node.id;
  const dbId = node.data.dbId;

  return (
    nodes.find(existing => {
      if (existing.nodeId === candidateId) {
        return true;
      }
      if (dbId && existing.id === dbId) {
        return true;
      }
      return false;
    }) ?? null
  );
};

export function useWorkflowNodePrefill({
  workflowId,
  organizationId,
  node,
}: UseWorkflowNodePrefillOptions) {
  const utils = api.useUtils();
  const [serverNode, setServerNode] = useState<WorkflowNodeRecord | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (!workflowId || !organizationId) {
      setServerNode(null);
      return;
    }

    const input = { workflowId, organizationId } as const;
    const cachedNodes = utils.workflows.nodes.getNodes.getData(input);
    setServerNode(getMatchingNode(cachedNodes, node));

    let isMounted = true;
    setIsFetching(true);

    utils.workflows.nodes.getNodes
      .fetch(input)
      .then(nodes => {
        if (!isMounted) return;
        const match = getMatchingNode(nodes, node);
        setServerNode(match ?? null);
      })
      .catch(error => {
        if (!isMounted) return;
        console.error("Failed to fetch workflow node for prefill", error);
      })
      .finally(() => {
        if (!isMounted) return;
        setIsFetching(false);
      });

    return () => {
      isMounted = false;
    };
  }, [workflowId, organizationId, node, utils]);

  const config = useMemo(() => {
    const candidate =
      (serverNode?.config as Record<string, unknown> | null | undefined) ??
      (node.data.config as Record<string, unknown> | null | undefined);

    if (
      candidate &&
      typeof candidate === "object" &&
      !Array.isArray(candidate)
    ) {
      return candidate;
    }

    return {};
  }, [serverNode, node.data.config]);

  const name =
    serverNode?.name ?? node.data.name ?? node.data.label ?? "Untitled node";

  return {
    serverNode,
    config,
    name,
    isLoading: !serverNode && isFetching,
    isFetching,
  };
}
