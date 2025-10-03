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

// ==============================
// Advanced Node Type Configurations
// ==============================

export type ConditionOperator =
  | "equals"
  | "not_equals"
  | "greater_than"
  | "less_than"
  | "greater_than_or_equal"
  | "less_than_or_equal"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with"
  | "is_empty"
  | "is_not_empty";

export interface ConditionConfig {
  field: string;
  operator: ConditionOperator;
  value: unknown;
}

export interface ConditionNodeConfig {
  conditions: ConditionConfig[];
  logicalOperator?: "AND" | "OR";
  trueBranch?: string; // Node ID to execute if condition is true
  falseBranch?: string; // Node ID to execute if condition is false
}

export interface LoopNodeConfig {
  dataSource: string; // Field path to array data (e.g., "payload.items")
  itemVariable?: string; // Variable name for current item (default: "item")
  maxIterations?: number; // Maximum number of iterations
  breakCondition?: ConditionConfig; // Condition to break loop early
  loopBodyNodeId?: string; // Node ID to execute for each iteration
}

export type ParallelFailureHandling =
  | "fail_on_any" // Fail if any parallel node fails
  | "fail_on_all" // Fail only if all parallel nodes fail
  | "continue_on_failure"; // Never fail, continue regardless

export interface ParallelNodeConfig {
  parallelNodeIds: string[]; // Array of node IDs to execute in parallel
  failureHandling?: ParallelFailureHandling; // How to handle failures (default: "fail_on_any")
  timeout?: number; // Optional timeout in milliseconds for all parallel executions
}

export type DataTransformOperation =
  | "map" // Transform each item in array
  | "filter" // Filter items in array
  | "reduce" // Reduce array to single value
  | "query" // Query/search array with filters
  | "aggregate" // Aggregate data (sum, avg, count, etc.)
  | "extract"; // Extract specific fields from object

export type AggregationType = "count" | "sum" | "avg" | "min" | "max";

export interface DataTransformNodeConfig {
  operation: DataTransformOperation;
  source?: string; // Field path to source data (default: payload)
  transformation?: string; // Transformation expression or template
  outputVariable?: string; // Variable name to store result

  // For reduce operation
  initialValue?: unknown;

  // For query operation
  queryFilters?: Record<string, unknown>;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  limit?: number;

  // For aggregate operation
  aggregation?: AggregationType;
  aggregateField?: string;

  // For extract operation
  extractFields?: string[];
}

export interface ApprovalNodeConfig {
  approverIds: string[]; // Array of user IDs who can approve
  requireAllApprovers?: boolean; // Require all approvers or just one (default: false)
  expirationHours?: number; // Hours until approval expires
  notifyApprovers?: boolean; // Send notification to approvers (default: true)
  approvalMessage?: string; // Custom message for approvers
}

export interface CreateRecordNodeConfig {
  model: string; // Model name (Customer, Project, Task, Invoice, etc.)
  fieldMappings: Record<string, unknown>; // Field name to value/variable mappings
  outputVariable?: string; // Variable name to store created record ID
}

export interface UpdateRecordNodeConfig {
  model: string; // Model name (Customer, Project, Task, Invoice, etc.)
  recordId: string | unknown; // Record ID or variable reference
  fieldMappings: Record<string, unknown>; // Field name to value/variable mappings
  conditions?: ConditionConfig[]; // Optional conditions for conditional updates
}
