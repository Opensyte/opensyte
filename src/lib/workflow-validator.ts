/**
 * Workflow Validator
 *
 * Validates workflow configurations before execution
 */

import type { WorkflowNodeType } from "@prisma/client";

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  nodeId?: string;
  message: string;
  field?: string;
}

export interface ValidationWarning {
  nodeId?: string;
  message: string;
  suggestion?: string;
}

export interface WorkflowValidationNode {
  id: string;
  type: WorkflowNodeType;
  name?: string | null;
  config?: unknown;
}

export interface WorkflowValidationConnection {
  sourceNodeId: string;
  targetNodeId: string;
}

export class WorkflowValidator {
  /**
   * Validate a complete workflow
   */
  validateWorkflow(
    nodes: WorkflowValidationNode[],
    connections: WorkflowValidationConnection[]
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check for empty workflow
    if (nodes.length === 0) {
      errors.push({
        message: "Workflow must have at least one node",
      });
      return { valid: false, errors, warnings };
    }

    // Validate each node
    for (const node of nodes) {
      const nodeValidation = this.validateNode(node);
      errors.push(...nodeValidation.errors);
      warnings.push(...nodeValidation.warnings);
    }

    // Validate connections
    const connectionValidation = this.validateConnections(nodes, connections);
    errors.push(...connectionValidation.errors);
    warnings.push(...connectionValidation.warnings);

    // Check for orphaned nodes
    const orphanedNodes = this.findOrphanedNodes(nodes, connections);
    for (const nodeId of orphanedNodes) {
      warnings.push({
        nodeId,
        message: "Node is not connected to any other nodes",
        suggestion: "Connect this node or remove it from the workflow",
      });
    }

    // Check for circular dependencies
    const circularDeps = this.detectCircularDependencies(nodes, connections);
    if (circularDeps.length > 0) {
      errors.push({
        message: `Circular dependency detected: ${circularDeps.join(" -> ")}`,
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate a single node
   */
  private validateNode(node: WorkflowValidationNode): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check node name
    if (!node.name || node.name.trim() === "") {
      warnings.push({
        nodeId: node.id,
        message: "Node has no name",
        suggestion: "Add a descriptive name to help identify this node",
      });
    }

    // Validate node-specific configuration
    switch (node.type) {
      case "CONDITION":
        this.validateConditionNode(node, errors, warnings);
        break;
      case "LOOP":
        this.validateLoopNode(node, errors, warnings);
        break;
      case "PARALLEL":
        this.validateParallelNode(node, errors, warnings);
        break;
      case "DATA_TRANSFORM":
        this.validateDataTransformNode(node, errors, warnings);
        break;
      case "APPROVAL":
        this.validateApprovalNode(node, errors, warnings);
        break;
      case "CREATE_RECORD":
        this.validateCreateRecordNode(node, errors, warnings);
        break;
      case "UPDATE_RECORD":
        this.validateUpdateRecordNode(node, errors, warnings);
        break;
      case "EMAIL":
        this.validateEmailNode(node, errors, warnings);
        break;
      case "SMS":
        this.validateSmsNode(node, errors, warnings);
        break;
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate condition node
   */
  private validateConditionNode(
    node: WorkflowValidationNode,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const config = node.config as { conditions?: unknown[] } | null;

    if (!config?.conditions || config.conditions.length === 0) {
      errors.push({
        nodeId: node.id,
        message: "Condition node must have at least one condition",
        field: "conditions",
      });
    }
  }

  /**
   * Validate loop node
   */
  private validateLoopNode(
    node: WorkflowValidationNode,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const config = node.config as {
      dataSource?: string;
      maxIterations?: number;
    } | null;

    if (!config?.dataSource) {
      errors.push({
        nodeId: node.id,
        message: "Loop node must have a data source",
        field: "dataSource",
      });
    }

    if (config?.maxIterations && config.maxIterations > 1000) {
      warnings.push({
        nodeId: node.id,
        message: "Loop has a very high max iterations limit",
        suggestion: "Consider reducing max iterations to improve performance",
      });
    }
  }

  /**
   * Validate parallel node
   */
  private validateParallelNode(
    node: WorkflowValidationNode,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const config = node.config as { parallelNodeIds?: string[] } | null;

    if (!config?.parallelNodeIds || config.parallelNodeIds.length === 0) {
      errors.push({
        nodeId: node.id,
        message: "Parallel node must have at least one parallel node",
        field: "parallelNodeIds",
      });
    }

    if (config?.parallelNodeIds && config.parallelNodeIds.length > 10) {
      warnings.push({
        nodeId: node.id,
        message: "Parallel node has many parallel executions",
        suggestion: "Consider splitting into multiple parallel nodes",
      });
    }
  }

  /**
   * Validate data transform node
   */
  private validateDataTransformNode(
    node: WorkflowValidationNode,
    errors: ValidationError[],
    _warnings: ValidationWarning[]
  ): void {
    const config = node.config as { operation?: string } | null;

    if (!config?.operation) {
      errors.push({
        nodeId: node.id,
        message: "Data transform node must have an operation",
        field: "operation",
      });
    }
  }

  /**
   * Validate approval node
   */
  private validateApprovalNode(
    node: WorkflowValidationNode,
    errors: ValidationError[],
    _warnings: ValidationWarning[]
  ): void {
    const config = node.config as { approverIds?: string[] } | null;

    if (!config?.approverIds || config.approverIds.length === 0) {
      errors.push({
        nodeId: node.id,
        message: "Approval node must have at least one approver",
        field: "approverIds",
      });
    }
  }

  /**
   * Validate create record node
   */
  private validateCreateRecordNode(
    node: WorkflowValidationNode,
    errors: ValidationError[],
    _warnings: ValidationWarning[]
  ): void {
    const config = node.config as {
      model?: string;
      fieldMappings?: Record<string, unknown>;
    } | null;

    if (!config?.model) {
      errors.push({
        nodeId: node.id,
        message: "Create record node must have a model",
        field: "model",
      });
    }

    if (
      !config?.fieldMappings ||
      Object.keys(config.fieldMappings).length === 0
    ) {
      errors.push({
        nodeId: node.id,
        message: "Create record node must have field mappings",
        field: "fieldMappings",
      });
    }
  }

  /**
   * Validate update record node
   */
  private validateUpdateRecordNode(
    node: WorkflowValidationNode,
    errors: ValidationError[],
    _warnings: ValidationWarning[]
  ): void {
    const config = node.config as {
      model?: string;
      recordId?: string;
      fieldMappings?: Record<string, unknown>;
    } | null;

    if (!config?.model) {
      errors.push({
        nodeId: node.id,
        message: "Update record node must have a model",
        field: "model",
      });
    }

    if (!config?.recordId) {
      errors.push({
        nodeId: node.id,
        message: "Update record node must have a record ID",
        field: "recordId",
      });
    }

    if (
      !config?.fieldMappings ||
      Object.keys(config.fieldMappings).length === 0
    ) {
      errors.push({
        nodeId: node.id,
        message: "Update record node must have field mappings",
        field: "fieldMappings",
      });
    }
  }

  /**
   * Validate email node
   */
  private validateEmailNode(
    node: WorkflowValidationNode,
    errors: ValidationError[],
    _warnings: ValidationWarning[]
  ): void {
    const config = node.config as {
      subject?: string;
      htmlBody?: string;
    } | null;

    if (!config?.subject) {
      errors.push({
        nodeId: node.id,
        message: "Email node must have a subject",
        field: "subject",
      });
    }

    if (!config?.htmlBody) {
      errors.push({
        nodeId: node.id,
        message: "Email node must have a body",
        field: "htmlBody",
      });
    }
  }

  /**
   * Validate SMS node
   */
  private validateSmsNode(
    node: WorkflowValidationNode,
    errors: ValidationError[],
    _warnings: ValidationWarning[]
  ): void {
    const config = node.config as { message?: string } | null;

    if (!config?.message) {
      errors.push({
        nodeId: node.id,
        message: "SMS node must have a message",
        field: "message",
      });
    }
  }

  /**
   * Validate connections
   */
  private validateConnections(
    nodes: WorkflowValidationNode[],
    connections: WorkflowValidationConnection[]
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const nodeIds = new Set(nodes.map(n => n.id));

    for (const connection of connections) {
      // Check if source node exists
      if (!nodeIds.has(connection.sourceNodeId)) {
        errors.push({
          message: `Connection references non-existent source node: ${connection.sourceNodeId}`,
        });
      }

      // Check if target node exists
      if (!nodeIds.has(connection.targetNodeId)) {
        errors.push({
          message: `Connection references non-existent target node: ${connection.targetNodeId}`,
        });
      }

      // Check for self-loops
      if (connection.sourceNodeId === connection.targetNodeId) {
        errors.push({
          nodeId: connection.sourceNodeId,
          message: "Node cannot connect to itself",
        });
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Find orphaned nodes (nodes with no connections)
   */
  private findOrphanedNodes(
    nodes: WorkflowValidationNode[],
    connections: WorkflowValidationConnection[]
  ): string[] {
    const connectedNodes = new Set<string>();

    for (const connection of connections) {
      connectedNodes.add(connection.sourceNodeId);
      connectedNodes.add(connection.targetNodeId);
    }

    // Trigger nodes don't need incoming connections
    const triggerNodes = nodes.filter(n => n.type === "TRIGGER").map(n => n.id);

    return nodes
      .filter(n => !connectedNodes.has(n.id) && !triggerNodes.includes(n.id))
      .map(n => n.id);
  }

  /**
   * Detect circular dependencies
   */
  private detectCircularDependencies(
    nodes: WorkflowValidationNode[],
    connections: WorkflowValidationConnection[]
  ): string[] {
    const graph = new Map<string, string[]>();

    // Build adjacency list
    for (const node of nodes) {
      graph.set(node.id, []);
    }

    for (const connection of connections) {
      const targets = graph.get(connection.sourceNodeId);
      if (targets) {
        targets.push(connection.targetNodeId);
      }
    }

    // DFS to detect cycles
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const hasCycle = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      const neighbors = graph.get(nodeId) ?? [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (hasCycle(neighbor)) {
            return true;
          }
        } else if (recursionStack.has(neighbor)) {
          // Found cycle
          const cycleStart = path.indexOf(neighbor);
          path.splice(0, cycleStart);
          return true;
        }
      }

      recursionStack.delete(nodeId);
      path.pop();
      return false;
    };

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        if (hasCycle(node.id)) {
          return path;
        }
      }
    }

    return [];
  }
}
