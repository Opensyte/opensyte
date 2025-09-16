/**
 * Workflow Engine Type Definitions
 */

import type { Prisma, WorkflowNodeType } from "@prisma/client";

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  name?: string | null;
  executionOrder?: number | null;
  retryLimit?: number | null;
  isOptional?: boolean | null;
  nodeId?: string; // React Flow node ID
  config?: Prisma.JsonValue | WorkflowNodeConfig | null;
  emailAction?: EmailActionConfig | null;
  smsAction?: SmsActionConfig | null;
  sourceConnections: WorkflowConnection[];
  targetConnections?: WorkflowConnection[];
}

export interface WorkflowConnection {
  id: string;
  targetNodeId: string;
  executionOrder?: number | null;
  conditions?: unknown;
}

export interface WorkflowNodeConfig {
  delayMs?: number;
  [key: string]: unknown;
}

export interface EmailActionConfig {
  id: string;
  subject: string;
  htmlBody?: string | null;
  textBody?: string | null;
  fromName?: string | null;
  fromEmail?: string | null;
  replyTo?: string | null;
  [key: string]: unknown;
}

export interface SmsActionConfig {
  id: string;
  message: string;
  fromNumber?: string | null;
  [key: string]: unknown;
}

export interface WorkflowStructure {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  triggers: WorkflowTrigger[];
}

export interface WorkflowTrigger {
  id: string;
  conditions?: TriggerConditions;
}

export interface TriggerConditions {
  field?: string;
  operator?: string;
  value?: unknown;
  or?: TriggerConditions[];
  [key: string]: unknown;
}

// Utility type for safer payload access
export interface PayloadWithOptionalFields {
  [key: string]: unknown;
  email?: string;
  phone?: string;
  user?: {
    email?: string;
    phone?: string;
    [key: string]: unknown;
  };
  customer?: {
    email?: string;
    phone?: string;
    [key: string]: unknown;
  };
  employee?: {
    email?: string;
    phone?: string;
    [key: string]: unknown;
  };
}
