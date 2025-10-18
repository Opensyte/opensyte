/**
 * Workflow Event Dispatcher
 *
 * Central system for dispatching domain events to matching workflows
 * and triggering their execution.
 */

import { db } from "~/server/db";
import {
  WorkflowExecutionEngine,
  type WorkflowTriggerEvent,
} from "./workflow-engine";
import { executionLogger } from "./services/execution-logger";
import {
  prebuiltWorkflowExecutor,
  type PrebuiltWorkflowExecutionSummary,
} from "~/workflows/prebuilt/executor";
import type {
  WorkflowTriggerType,
  WorkflowTrigger as PrismaWorkflowTrigger,
} from "@prisma/client";

export interface DispatchResult {
  triggeredWorkflows: number;
  executionResults: Array<{
    workflowId: string;
    workflowName: string;
    executionId: string;
    success: boolean;
    error?: string;
  }>;
  prebuiltExecutions: PrebuiltWorkflowExecutionSummary[];
}

export class WorkflowDispatcher {
  private executionEngine = new WorkflowExecutionEngine();

  /**
   * Main dispatch method - finds and triggers matching workflows
   */
  async dispatch(event: WorkflowTriggerEvent): Promise<DispatchResult> {
    let prebuiltExecutions: PrebuiltWorkflowExecutionSummary[] = [];

    try {
      try {
        prebuiltExecutions = await prebuiltWorkflowExecutor.execute(event);
      } catch (prebuiltError) {
        console.error("Prebuilt workflow execution failed:", prebuiltError);
        prebuiltExecutions = [];
      }

      // Find matching workflows
      const matchingWorkflows = await this.findMatchingWorkflows(event);

      // Log trigger matching results
      await executionLogger.logTriggerMatching(
        event.organizationId,
        `${event.module}.${event.entityType}.${event.eventType}`,
        event.payload,
        matchingWorkflows.map(({ workflow }) => ({
          workflowId: workflow.id,
          workflowName: workflow.name,
        }))
      );

      if (matchingWorkflows.length === 0) {
        return {
          triggeredWorkflows: 0,
          executionResults: [],
          prebuiltExecutions,
        };
      }

      // Execute workflows concurrently
      const executionPromises = matchingWorkflows.map(
        async ({ workflow, trigger }) => {
          try {
            const result = await this.executionEngine.executeWorkflow(
              workflow.id,
              event,
              trigger.id
            );

            // Update trigger statistics
            await this.updateTriggerStats(trigger.id);

            return {
              workflowId: workflow.id,
              workflowName: workflow.name,
              executionId: result.executionId,
              success: result.success,
              error: result.error,
            };
          } catch (error) {
            console.error(`Failed to execute workflow ${workflow.id}:`, error);
            return {
              workflowId: workflow.id,
              workflowName: workflow.name,
              executionId: "",
              success: false,
              error: error instanceof Error ? error.message : "Unknown error",
            };
          }
        }
      );

      const executionResults = await Promise.allSettled(executionPromises);

      const results = executionResults.map(result =>
        result.status === "fulfilled"
          ? result.value
          : {
              workflowId: "",
              workflowName: "Unknown",
              executionId: "",
              success: false,
              error: "Promise rejected",
            }
      );

      return {
        triggeredWorkflows: matchingWorkflows.length,
        executionResults: results,
        prebuiltExecutions,
      };
    } catch (error) {
      console.error("Workflow dispatch failed:", error);
      return {
        triggeredWorkflows: 0,
        executionResults: [],
        prebuiltExecutions,
      };
    }
  }

  /**
   * Find workflows that match the trigger event
   */
  private async findMatchingWorkflows(event: WorkflowTriggerEvent) {
    // Convert event to trigger type
    const triggerType = this.eventToTriggerType(event);

    // Find active workflows with matching triggers (prefer enum type; otherwise include all active triggers for in-code matching)
    const workflows = await db.workflow.findMany({
      where: {
        organizationId: event.organizationId,
        status: "ACTIVE",
        triggers: {
          some: triggerType
            ? { type: triggerType, isActive: true }
            : { isActive: true },
        },
      },
      include: {
        triggers: {
          where: triggerType
            ? { type: triggerType, isActive: true }
            : { isActive: true },
        },
      },
    });

    // Filter workflows by trigger conditions, preferring most specific matches (module+entity+event)
    const matchingWorkflows: Array<{
      workflow: (typeof workflows)[0];
      trigger: (typeof workflows)[0]["triggers"][0];
    }> = [];

    for (const workflow of workflows) {
      const candidates: Array<{
        trigger: (typeof workflow.triggers)[0];
        score: number;
      }> = [];

      for (const trigger of workflow.triggers) {
        // Case-insensitive module/entity/event matching
        const moduleMatches =
          !!trigger.module &&
          this.normalizeModule(trigger.module) ===
            this.normalizeModule(event.module);
        if (!moduleMatches) continue;

        const triggerEntityNorm = trigger.entityType
          ? this.normalizeEntity(trigger.entityType, trigger.module)
          : undefined;
        const eventEntityNorm = this.normalizeEntity(
          event.entityType,
          event.module
        );
        const entityExact =
          !!triggerEntityNorm && triggerEntityNorm === eventEntityNorm;

        const triggerEventNorm = trigger.eventType?.toLowerCase();
        const eventExact =
          !!triggerEventNorm &&
          triggerEventNorm === event.eventType.toLowerCase();
        const eventWildcard = !trigger.eventType;

        // Require at least module and event to be compatible (exact or wildcard)
        if (!(eventExact || eventWildcard)) continue;

        // Score specificity: exact entity +2, exact event +2. Wildcards add 0.
        const score = (entityExact ? 2 : 0) + (eventExact ? 2 : 0);

        candidates.push({ trigger, score });
      }

      if (candidates.length === 0) continue;

      const maxScore = Math.max(...candidates.map(c => c.score));
      const topCandidates = candidates.filter(c => c.score === maxScore);

      for (const c of topCandidates) {
        if (await this.evaluateTriggerConditions(c.trigger, event)) {
          matchingWorkflows.push({ workflow, trigger: c.trigger });
        }
      }
    }

    return matchingWorkflows;
  }

  /**
   * Normalize module names to canonical keys
   */
  private normalizeModule(module: string): string {
    const m = module.trim().toLowerCase();
    if (m === "crm") return "CRM";
    if (m === "hr" || m === "human resources") return "HR";
    if (m === "finance" || m === "fin" || m === "finances") return "FINANCE";
    if (
      m === "projects" ||
      m === "project" ||
      m === "pm" ||
      m === "project management"
    )
      return "PROJECTS";
    return module.toUpperCase();
  }

  /**
   * Normalize entity types and apply module-specific aliases
   */
  private normalizeEntity(entity: string, module?: string): string {
    const e = entity.trim().toLowerCase();
    const mod = module ? this.normalizeModule(module) : undefined;
    if (mod === "CRM") {
      if (e === "customer" || e === "contact") return "contact";
      if (e === "deal" || e === "opportunity") return "deal";
    }
    if (mod === "HR") {
      if (e === "timeoff" || e === "time_off" || e === "time-off")
        return "timeoff";
      if (e === "employee") return "employee";
    }
    if (mod === "FINANCE") {
      if (e === "invoice") return "invoice";
      if (e === "expense") return "expense";
      if (e === "payment") return "payment";
    }
    if (mod === "PROJECTS") {
      if (e === "project") return "project";
      if (e === "task") return "task";
    }
    return e;
  }

  /**
   * Convert event to trigger type enum
   */
  private eventToTriggerType(
    event: WorkflowTriggerEvent
  ): WorkflowTriggerType | null {
    const moduleKey = event.module.toUpperCase();
    const entityKey = event.entityType.toUpperCase();
    const eventKey = event.eventType.toUpperCase();

    // Mapping from event to trigger type
    const triggerMap: Record<string, WorkflowTriggerType> = {
      // CRM triggers
      "CRM.CONTACT.CREATED": "CONTACT_CREATED",
      "CRM.CONTACT.UPDATED": "CONTACT_UPDATED",
      "CRM.CUSTOMER.CREATED": "CONTACT_CREATED", // Customer is treated as contact
      "CRM.CUSTOMER.UPDATED": "CONTACT_UPDATED",
      "CRM.DEAL.CREATED": "DEAL_CREATED",
      "CRM.DEAL.STATUS_CHANGED": "DEAL_STATUS_CHANGED",

      // HR triggers
      "HR.EMPLOYEE.CREATED": "EMPLOYEE_CREATED",
      "HR.EMPLOYEE.UPDATED": "EMPLOYEE_UPDATED",
      "HR.EMPLOYEE.STATUS_CHANGED": "EMPLOYEE_STATUS_CHANGED",
      "HR.TIMEOFF.REQUESTED": "TIME_OFF_REQUESTED",
      "HR.TIMEOFF.CREATED": "TIME_OFF_REQUESTED",

      // Finance triggers
      "FINANCE.INVOICE.CREATED": "INVOICE_CREATED",
      "FINANCE.INVOICE.STATUS_CHANGED": "INVOICE_STATUS_CHANGED",
      "FINANCE.EXPENSE.CREATED": "EXPENSE_CREATED",
      "FINANCE.PAYMENT.STATUS_CHANGED": "PAYMENT_STATUS_CHANGED",

      // Project triggers
      "PROJECTS.PROJECT.CREATED": "PROJECT_CREATED",
      "PROJECTS.PROJECT.UPDATED": "PROJECT_UPDATED",
      "PROJECTS.TASK.CREATED": "TASK_CREATED",
      "PROJECTS.TASK.STATUS_CHANGED": "TASK_STATUS_CHANGED",
    };

    const key = `${moduleKey}.${entityKey}.${eventKey}`;
    return triggerMap[key] ?? null;
  }

  /**
   * Evaluate trigger conditions against event data
   */
  private async evaluateTriggerConditions(
    trigger: PrismaWorkflowTrigger,
    event: WorkflowTriggerEvent
  ): Promise<boolean> {
    if (!trigger.conditions) {
      return true; // No conditions means always match
    }

    try {
      if (!trigger.conditions) {
        return true;
      }
      return this.evaluateConditions(trigger.conditions, event.payload);
    } catch (error) {
      console.error("Error evaluating trigger conditions:", error);
      return false; // Fail safe - don't trigger on condition errors
    }
  }

  /**
   * Simple condition evaluation engine
   */
  private evaluateConditions(
    conditions: unknown,
    payload: Record<string, unknown>
  ): boolean {
    if (!conditions || typeof conditions !== "object") {
      return true;
    }

    // Handle array of conditions (AND logic)
    if (Array.isArray(conditions)) {
      return conditions.every(condition =>
        this.evaluateConditions(condition, payload)
      );
    }

    // Handle OR logic
    if (
      typeof conditions === "object" &&
      conditions !== null &&
      "or" in conditions
    ) {
      const orConditions = (conditions as { or: unknown }).or;
      if (Array.isArray(orConditions)) {
        return orConditions.some((condition: unknown) =>
          this.evaluateConditions(condition, payload)
        );
      }
    }

    // Handle single condition
    if (typeof conditions !== "object" || conditions === null) {
      return true;
    }

    const condObj = conditions as Record<string, unknown>;
    const { field, operator, value } = condObj;

    if (typeof field !== "string" || typeof operator !== "string") {
      return true;
    }

    const fieldValue = this.getFieldValue(field, payload);

    switch (operator) {
      case "equals":
      case "eq":
        return fieldValue === value;
      case "not_equals":
      case "ne":
        return fieldValue !== value;
      case "greater_than":
      case "gt":
        return (
          typeof fieldValue === "number" &&
          typeof value === "number" &&
          fieldValue > value
        );
      case "less_than":
      case "lt":
        return (
          typeof fieldValue === "number" &&
          typeof value === "number" &&
          fieldValue < value
        );
      case "contains":
        return (
          typeof fieldValue === "string" &&
          typeof value === "string" &&
          fieldValue.includes(value)
        );
      case "starts_with":
        return (
          typeof fieldValue === "string" &&
          typeof value === "string" &&
          fieldValue.startsWith(value)
        );
      case "ends_with":
        return (
          typeof fieldValue === "string" &&
          typeof value === "string" &&
          fieldValue.endsWith(value)
        );
      case "in":
        return Array.isArray(value) && value.includes(fieldValue);
      case "not_in":
        return Array.isArray(value) && !value.includes(fieldValue);
      case "is_empty":
        return (
          !fieldValue ||
          fieldValue === "" ||
          (Array.isArray(fieldValue) && fieldValue.length === 0)
        );
      case "is_not_empty":
        return Boolean(
          fieldValue &&
            fieldValue !== "" &&
            (!Array.isArray(fieldValue) || fieldValue.length > 0)
        );
      default:
        console.warn(`Unknown condition operator: ${operator}`);
        return true;
    }
  }

  /**
   * Get field value from payload using dot notation
   */
  private getFieldValue(
    field: string,
    payload: Record<string, unknown>
  ): unknown {
    if (!field.includes(".")) {
      return payload[field];
    }

    const parts = field.split(".");
    let value: unknown = payload;

    for (const part of parts) {
      if (typeof value === "object" && value !== null && part in value) {
        value = (value as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Update trigger statistics
   */
  private async updateTriggerStats(triggerId: string): Promise<void> {
    try {
      await db.workflowTrigger.update({
        where: { id: triggerId },
        data: {
          lastTriggered: new Date(),
          triggerCount: { increment: 1 },
        },
      });
    } catch (error) {
      console.error("Failed to update trigger stats:", error);
    }
  }
}

// Singleton instance for the dispatcher
export const workflowDispatcher = new WorkflowDispatcher();

// Helper functions for tRPC integration
/* eslint-disable-next-line @typescript-eslint/no-namespace */
export namespace WorkflowEvents {
  /**
   * Dispatch CRM events
   */
  export const dispatchCrmEvent = async (
    eventType: "created" | "updated" | "status_changed",
    entityType: "contact" | "customer" | "deal",
    organizationId: string,
    payload: Record<string, unknown>,
    userId?: string
  ) => {
    return await workflowDispatcher.dispatch({
      module: "CRM",
      entityType,
      eventType,
      organizationId,
      payload,
      userId,
      triggeredAt: new Date(),
    });
  };

  /**
   * Dispatch HR events
   */
  export const dispatchHrEvent = async (
    eventType: "created" | "updated" | "status_changed" | "requested",
    entityType: "employee" | "timeoff",
    organizationId: string,
    payload: Record<string, unknown>,
    userId?: string
  ) => {
    return await workflowDispatcher.dispatch({
      module: "HR",
      entityType,
      eventType,
      organizationId,
      payload,
      userId,
      triggeredAt: new Date(),
    });
  };

  /**
   * Dispatch Finance events
   */
  export const dispatchFinanceEvent = async (
    eventType: "created" | "updated" | "status_changed",
    entityType: "invoice" | "expense" | "payment",
    organizationId: string,
    payload: Record<string, unknown>,
    userId?: string
  ) => {
    return await workflowDispatcher.dispatch({
      module: "FINANCE",
      entityType,
      eventType,
      organizationId,
      payload,
      userId,
      triggeredAt: new Date(),
    });
  };

  /**
   * Dispatch Project events
   */
  export const dispatchProjectEvent = async (
    eventType: "created" | "updated" | "status_changed",
    entityType: "project" | "task",
    organizationId: string,
    payload: Record<string, unknown>,
    userId?: string
  ) => {
    return await workflowDispatcher.dispatch({
      module: "PROJECTS",
      entityType,
      eventType,
      organizationId,
      payload,
      userId,
      triggeredAt: new Date(),
    });
  };
}
