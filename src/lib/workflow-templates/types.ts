/**
 * Workflow Template Type Definitions
 */

import type { WorkflowTriggerType, WorkflowNodeType } from "@prisma/client";

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  triggers: WorkflowTriggerConfig[];
  nodes: WorkflowNodeConfig[];
  connections: WorkflowConnectionConfig[];
  variables?: VariableDefinition[];
}

export interface WorkflowTriggerConfig {
  type: WorkflowTriggerType;
  module?: string;
  entityType?: string;
  eventType?: string;
  conditions?: Record<string, unknown>;
}

export interface WorkflowNodeConfig {
  nodeId: string;
  type: WorkflowNodeType;
  name: string;
  executionOrder: number;
  config?: Record<string, unknown>;
  isOptional?: boolean;
  retryLimit?: number;
}

export interface WorkflowConnectionConfig {
  sourceNodeId: string;
  targetNodeId: string;
  executionOrder: number;
  conditions?: Record<string, unknown>;
}

export interface VariableDefinition {
  name: string;
  type: string;
  description?: string;
  defaultValue?: unknown;
}
