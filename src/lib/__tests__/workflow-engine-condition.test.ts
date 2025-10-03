/**
 * Unit tests for CONDITION node execution in WorkflowExecutionEngine
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { WorkflowExecutionEngine } from "../workflow-engine";
import type { WorkflowTriggerEvent } from "../workflow-engine";

// Mock the database
vi.mock("~/server/db", () => ({
  db: {
    workflowExecution: {
      create: vi.fn().mockResolvedValue({ id: "exec-1" }),
      updateMany: vi.fn().mockResolvedValue({}),
    },
    workflow: {
      findFirst: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
    nodeExecution: {
      create: vi.fn().mockResolvedValue({ id: "node-exec-1" }),
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({}),
    },
  },
}));

// Mock services
vi.mock("../services/email-service", () => ({
  EmailService: vi.fn().mockImplementation(() => ({
    sendEmail: vi.fn().mockResolvedValue({ success: true }),
  })),
}));

vi.mock("../services/sms-service", () => ({
  SmsService: vi.fn().mockImplementation(() => ({
    sendSms: vi.fn().mockResolvedValue({ success: true }),
  })),
}));

vi.mock("../services/variable-resolver", () => ({
  VariableResolver: vi.fn().mockImplementation(() => ({
    resolveVariables: vi.fn((value: string) => Promise.resolve(value)),
  })),
}));

vi.mock("../services/execution-logger", () => ({
  executionLogger: {
    logExecutionStarted: vi.fn().mockResolvedValue(undefined),
    logExecutionCompleted: vi.fn().mockResolvedValue(undefined),
    logExecutionFailed: vi.fn().mockResolvedValue(undefined),
    logNodeStarted: vi.fn().mockResolvedValue(undefined),
    logNodeCompleted: vi.fn().mockResolvedValue(undefined),
    logNodeFailed: vi.fn().mockResolvedValue(undefined),
    logActionExecution: vi.fn().mockResolvedValue(undefined),
    error: vi.fn().mockResolvedValue(undefined),
    warn: vi.fn().mockResolvedValue(undefined),
    fatal: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("WorkflowExecutionEngine - CONDITION Node", () => {
  let engine: WorkflowExecutionEngine;

  beforeEach(() => {
    engine = new WorkflowExecutionEngine();
    vi.clearAllMocks();
  });

  describe("Condition Evaluation", () => {
    it("should evaluate equals operator correctly", async () => {
      const triggerData: WorkflowTriggerEvent = {
        module: "CRM",
        entityType: "Deal",
        eventType: "DEAL_STATUS_CHANGED",
        organizationId: "org-1",
        payload: {
          status: "CLOSED_WON",
        },
      };

      // Access private method through type assertion
      const result = await (engine as any).evaluateCondition(
        {
          field: "payload.status",
          operator: "equals",
          value: "CLOSED_WON",
        },
        triggerData
      );

      expect(result.result).toBe(true);
      expect(result.actualValue).toBe("CLOSED_WON");
    });

    it("should evaluate not_equals operator correctly", async () => {
      const triggerData: WorkflowTriggerEvent = {
        module: "CRM",
        entityType: "Deal",
        eventType: "DEAL_STATUS_CHANGED",
        organizationId: "org-1",
        payload: {
          status: "OPEN",
        },
      };

      const result = await (engine as any).evaluateCondition(
        {
          field: "payload.status",
          operator: "not_equals",
          value: "CLOSED_WON",
        },
        triggerData
      );

      expect(result.result).toBe(true);
      expect(result.actualValue).toBe("OPEN");
    });

    it("should evaluate greater_than operator for numbers", async () => {
      const triggerData: WorkflowTriggerEvent = {
        module: "Finance",
        entityType: "Invoice",
        eventType: "INVOICE_CREATED",
        organizationId: "org-1",
        payload: {
          amount: 1000,
        },
      };

      const result = await (engine as any).evaluateCondition(
        {
          field: "payload.amount",
          operator: "greater_than",
          value: 500,
        },
        triggerData
      );

      expect(result.result).toBe(true);
      expect(result.actualValue).toBe(1000);
    });

    it("should evaluate less_than operator for numbers", async () => {
      const triggerData: WorkflowTriggerEvent = {
        module: "Finance",
        entityType: "Invoice",
        eventType: "INVOICE_CREATED",
        organizationId: "org-1",
        payload: {
          amount: 300,
        },
      };

      const result = await (engine as any).evaluateCondition(
        {
          field: "payload.amount",
          operator: "less_than",
          value: 500,
        },
        triggerData
      );

      expect(result.result).toBe(true);
      expect(result.actualValue).toBe(300);
    });

    it("should evaluate contains operator for strings", async () => {
      const triggerData: WorkflowTriggerEvent = {
        module: "CRM",
        entityType: "Customer",
        eventType: "CUSTOMER_CREATED",
        organizationId: "org-1",
        payload: {
          email: "john@example.com",
        },
      };

      const result = await (engine as any).evaluateCondition(
        {
          field: "payload.email",
          operator: "contains",
          value: "@example.com",
        },
        triggerData
      );

      expect(result.result).toBe(true);
      expect(result.actualValue).toBe("john@example.com");
    });

    it("should evaluate contains operator for arrays", async () => {
      const triggerData: WorkflowTriggerEvent = {
        module: "Projects",
        entityType: "Task",
        eventType: "TASK_CREATED",
        organizationId: "org-1",
        payload: {
          tags: ["urgent", "bug", "frontend"],
        },
      };

      const result = await (engine as any).evaluateCondition(
        {
          field: "payload.tags",
          operator: "contains",
          value: "urgent",
        },
        triggerData
      );

      expect(result.result).toBe(true);
    });

    it("should evaluate is_empty operator", async () => {
      const triggerData: WorkflowTriggerEvent = {
        module: "CRM",
        entityType: "Customer",
        eventType: "CUSTOMER_CREATED",
        organizationId: "org-1",
        payload: {
          notes: "",
        },
      };

      const result = await (engine as any).evaluateCondition(
        {
          field: "payload.notes",
          operator: "is_empty",
          value: null,
        },
        triggerData
      );

      expect(result.result).toBe(true);
    });

    it("should evaluate is_not_empty operator", async () => {
      const triggerData: WorkflowTriggerEvent = {
        module: "CRM",
        entityType: "Customer",
        eventType: "CUSTOMER_CREATED",
        organizationId: "org-1",
        payload: {
          notes: "Some notes",
        },
      };

      const result = await (engine as any).evaluateCondition(
        {
          field: "payload.notes",
          operator: "is_not_empty",
          value: null,
        },
        triggerData
      );

      expect(result.result).toBe(true);
    });

    it("should evaluate starts_with operator", async () => {
      const triggerData: WorkflowTriggerEvent = {
        module: "CRM",
        entityType: "Customer",
        eventType: "CUSTOMER_CREATED",
        organizationId: "org-1",
        payload: {
          name: "John Doe",
        },
      };

      const result = await (engine as any).evaluateCondition(
        {
          field: "payload.name",
          operator: "starts_with",
          value: "John",
        },
        triggerData
      );

      expect(result.result).toBe(true);
    });

    it("should evaluate ends_with operator", async () => {
      const triggerData: WorkflowTriggerEvent = {
        module: "CRM",
        entityType: "Customer",
        eventType: "CUSTOMER_CREATED",
        organizationId: "org-1",
        payload: {
          email: "john@example.com",
        },
      };

      const result = await (engine as any).evaluateCondition(
        {
          field: "payload.email",
          operator: "ends_with",
          value: ".com",
        },
        triggerData
      );

      expect(result.result).toBe(true);
    });
  });

  describe("Logical Operators", () => {
    it("should evaluate AND logic correctly when all conditions are true", async () => {
      const triggerData: WorkflowTriggerEvent = {
        module: "CRM",
        entityType: "Deal",
        eventType: "DEAL_STATUS_CHANGED",
        organizationId: "org-1",
        payload: {
          status: "CLOSED_WON",
          amount: 1000,
        },
      };

      const result = await (engine as any).executeConditionNode(
        {
          id: "node-1",
          type: "CONDITION",
          config: {
            conditions: [
              {
                field: "payload.status",
                operator: "equals",
                value: "CLOSED_WON",
              },
              {
                field: "payload.amount",
                operator: "greater_than",
                value: 500,
              },
            ],
            logicalOperator: "AND",
            trueBranch: "node-2",
            falseBranch: "node-3",
          },
        },
        triggerData
      );

      expect(result.evaluated).toBe(true);
      expect(result.result).toBe(true);
      expect(result.logicalOperator).toBe("AND");
    });

    it("should evaluate AND logic correctly when one condition is false", async () => {
      const triggerData: WorkflowTriggerEvent = {
        module: "CRM",
        entityType: "Deal",
        eventType: "DEAL_STATUS_CHANGED",
        organizationId: "org-1",
        payload: {
          status: "CLOSED_WON",
          amount: 300,
        },
      };

      const result = await (engine as any).executeConditionNode(
        {
          id: "node-1",
          type: "CONDITION",
          config: {
            conditions: [
              {
                field: "payload.status",
                operator: "equals",
                value: "CLOSED_WON",
              },
              {
                field: "payload.amount",
                operator: "greater_than",
                value: 500,
              },
            ],
            logicalOperator: "AND",
            trueBranch: "node-2",
            falseBranch: "node-3",
          },
        },
        triggerData
      );

      expect(result.evaluated).toBe(true);
      expect(result.result).toBe(false);
    });

    it("should evaluate OR logic correctly when at least one condition is true", async () => {
      const triggerData: WorkflowTriggerEvent = {
        module: "CRM",
        entityType: "Deal",
        eventType: "DEAL_STATUS_CHANGED",
        organizationId: "org-1",
        payload: {
          status: "OPEN",
          amount: 1000,
        },
      };

      const result = await (engine as any).executeConditionNode(
        {
          id: "node-1",
          type: "CONDITION",
          config: {
            conditions: [
              {
                field: "payload.status",
                operator: "equals",
                value: "CLOSED_WON",
              },
              {
                field: "payload.amount",
                operator: "greater_than",
                value: 500,
              },
            ],
            logicalOperator: "OR",
            trueBranch: "node-2",
            falseBranch: "node-3",
          },
        },
        triggerData
      );

      expect(result.evaluated).toBe(true);
      expect(result.result).toBe(true);
      expect(result.logicalOperator).toBe("OR");
    });

    it("should evaluate OR logic correctly when all conditions are false", async () => {
      const triggerData: WorkflowTriggerEvent = {
        module: "CRM",
        entityType: "Deal",
        eventType: "DEAL_STATUS_CHANGED",
        organizationId: "org-1",
        payload: {
          status: "OPEN",
          amount: 300,
        },
      };

      const result = await (engine as any).executeConditionNode(
        {
          id: "node-1",
          type: "CONDITION",
          config: {
            conditions: [
              {
                field: "payload.status",
                operator: "equals",
                value: "CLOSED_WON",
              },
              {
                field: "payload.amount",
                operator: "greater_than",
                value: 500,
              },
            ],
            logicalOperator: "OR",
            trueBranch: "node-2",
            falseBranch: "node-3",
          },
        },
        triggerData
      );

      expect(result.evaluated).toBe(true);
      expect(result.result).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    it("should handle missing conditions gracefully", async () => {
      const triggerData: WorkflowTriggerEvent = {
        module: "CRM",
        entityType: "Deal",
        eventType: "DEAL_STATUS_CHANGED",
        organizationId: "org-1",
        payload: {},
      };

      const result = await (engine as any).executeConditionNode(
        {
          id: "node-1",
          type: "CONDITION",
          config: {
            conditions: [],
          },
        },
        triggerData
      );

      expect(result.evaluated).toBe(false);
      expect(result.result).toBe(false);
      expect(result.reason).toBe("No conditions configured");
    });

    it("should handle undefined field values", async () => {
      const triggerData: WorkflowTriggerEvent = {
        module: "CRM",
        entityType: "Deal",
        eventType: "DEAL_STATUS_CHANGED",
        organizationId: "org-1",
        payload: {},
      };

      const result = await (engine as any).evaluateCondition(
        {
          field: "payload.nonexistent",
          operator: "equals",
          value: "test",
        },
        triggerData
      );

      expect(result.result).toBe(false);
      expect(result.actualValue).toBeUndefined();
    });

    it("should handle nested field access", async () => {
      const triggerData: WorkflowTriggerEvent = {
        module: "CRM",
        entityType: "Deal",
        eventType: "DEAL_STATUS_CHANGED",
        organizationId: "org-1",
        payload: {
          customer: {
            email: "john@example.com",
          },
        },
      };

      const result = await (engine as any).evaluateCondition(
        {
          field: "payload.customer.email",
          operator: "contains",
          value: "@example.com",
        },
        triggerData
      );

      expect(result.result).toBe(true);
      expect(result.actualValue).toBe("john@example.com");
    });

    it("should default to AND operator when not specified", async () => {
      const triggerData: WorkflowTriggerEvent = {
        module: "CRM",
        entityType: "Deal",
        eventType: "DEAL_STATUS_CHANGED",
        organizationId: "org-1",
        payload: {
          status: "CLOSED_WON",
          amount: 1000,
        },
      };

      const result = await (engine as any).executeConditionNode(
        {
          id: "node-1",
          type: "CONDITION",
          config: {
            conditions: [
              {
                field: "payload.status",
                operator: "equals",
                value: "CLOSED_WON",
              },
              {
                field: "payload.amount",
                operator: "greater_than",
                value: 500,
              },
            ],
            // logicalOperator not specified
            trueBranch: "node-2",
            falseBranch: "node-3",
          },
        },
        triggerData
      );

      expect(result.evaluated).toBe(true);
      expect(result.result).toBe(true);
      expect(result.logicalOperator).toBe("AND");
    });
  });
});
