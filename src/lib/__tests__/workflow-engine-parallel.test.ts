/**
 * Unit tests for PARALLEL node execution in WorkflowExecutionEngine
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

describe("WorkflowExecutionEngine - PARALLEL Node", () => {
  let engine: WorkflowExecutionEngine;

  beforeEach(() => {
    engine = new WorkflowExecutionEngine();
    vi.clearAllMocks();
  });

  describe("Basic Parallel Execution", () => {
    it("should execute multiple nodes in parallel", async () => {
      const triggerData: WorkflowTriggerEvent = {
        module: "CRM",
        entityType: "Customer",
        eventType: "CUSTOMER_CREATED",
        organizationId: "org-1",
        payload: {
          email: "test@example.com",
        },
      };

      const workflow = {
        id: "workflow-1",
        name: "Test Workflow",
        nodes: [
          {
            id: "parallel-node",
            type: "PARALLEL" as const,
            config: {
              parallelNodeIds: ["node-1", "node-2", "node-3"],
              failureHandling: "fail_on_any",
            },
          },
          {
            id: "node-1",
            type: "TRIGGER" as const,
            config: {},
          },
          {
            id: "node-2",
            type: "TRIGGER" as const,
            config: {},
          },
          {
            id: "node-3",
            type: "TRIGGER" as const,
            config: {},
          },
        ],
        triggers: [],
        connections: [],
      };

      const result = await (engine as any).executeParallelNode(
        "exec-1",
        workflow.nodes[0],
        triggerData,
        workflow
      );

      expect(result.parallel).toBe(true);
      expect(result.parallelNodes).toBe(3);
      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBe(0);
    });

    it("should handle partial failures with fail_on_any strategy", async () => {
      const triggerData: WorkflowTriggerEvent = {
        module: "CRM",
        entityType: "Customer",
        eventType: "CUSTOMER_CREATED",
        organizationId: "org-1",
        payload: {},
      };

      const workflow = {
        id: "workflow-1",
        name: "Test Workflow",
        nodes: [
          {
            id: "parallel-node",
            type: "PARALLEL" as const,
            config: {
              parallelNodeIds: ["node-1", "node-2"],
              failureHandling: "fail_on_any",
            },
          },
          {
            id: "node-1",
            type: "TRIGGER" as const,
            config: {},
          },
          {
            id: "node-2",
            type: "TRIGGER" as const,
            config: {},
          },
        ],
        triggers: [],
        connections: [],
      };

      const result = await (engine as any).executeParallelNode(
        "exec-1",
        workflow.nodes[0],
        triggerData,
        workflow
      );

      expect(result.parallel).toBe(true);
      expect(result.parallelNodes).toBe(2);
    });

    it("should continue on failure with continue_on_failure strategy", async () => {
      const triggerData: WorkflowTriggerEvent = {
        module: "CRM",
        entityType: "Customer",
        eventType: "CUSTOMER_CREATED",
        organizationId: "org-1",
        payload: {},
      };

      const workflow = {
        id: "workflow-1",
        name: "Test Workflow",
        nodes: [
          {
            id: "parallel-node",
            type: "PARALLEL" as const,
            config: {
              parallelNodeIds: ["node-1", "node-2"],
              failureHandling: "continue_on_failure",
            },
          },
          {
            id: "node-1",
            type: "TRIGGER" as const,
            config: {},
          },
          {
            id: "node-2",
            type: "TRIGGER" as const,
            config: {},
          },
        ],
        triggers: [],
        connections: [],
      };

      const result = await (engine as any).executeParallelNode(
        "exec-1",
        workflow.nodes[0],
        triggerData,
        workflow
      );

      expect(result.parallel).toBe(true);
      expect(result.failed).toBe(false);
      expect(result.failureHandling).toBe("continue_on_failure");
    });
  });

  describe("Error Handling", () => {
    it("should handle missing parallel nodes configuration", async () => {
      const triggerData: WorkflowTriggerEvent = {
        module: "CRM",
        entityType: "Customer",
        eventType: "CUSTOMER_CREATED",
        organizationId: "org-1",
        payload: {},
      };

      const workflow = {
        id: "workflow-1",
        name: "Test Workflow",
        nodes: [
          {
            id: "parallel-node",
            type: "PARALLEL" as const,
            config: {
              parallelNodeIds: [],
            },
          },
        ],
        triggers: [],
        connections: [],
      };

      const result = await (engine as any).executeParallelNode(
        "exec-1",
        workflow.nodes[0],
        triggerData,
        workflow
      );

      expect(result.parallel).toBe(false);
      expect(result.reason).toBe("No parallel nodes configured");
    });

    it("should handle missing workflow context", async () => {
      const triggerData: WorkflowTriggerEvent = {
        module: "CRM",
        entityType: "Customer",
        eventType: "CUSTOMER_CREATED",
        organizationId: "org-1",
        payload: {},
      };

      const result = await (engine as any).executeParallelNode(
        "exec-1",
        {
          id: "parallel-node",
          type: "PARALLEL",
          config: {
            parallelNodeIds: ["node-1"],
          },
        },
        triggerData,
        undefined
      );

      expect(result.parallel).toBe(false);
      expect(result.reason).toBe("Workflow context not available");
    });

    it("should handle nonexistent parallel nodes", async () => {
      const triggerData: WorkflowTriggerEvent = {
        module: "CRM",
        entityType: "Customer",
        eventType: "CUSTOMER_CREATED",
        organizationId: "org-1",
        payload: {},
      };

      const workflow = {
        id: "workflow-1",
        name: "Test Workflow",
        nodes: [
          {
            id: "parallel-node",
            type: "PARALLEL" as const,
            config: {
              parallelNodeIds: ["nonexistent-1", "nonexistent-2"],
            },
          },
        ],
        triggers: [],
        connections: [],
      };

      const result = await (engine as any).executeParallelNode(
        "exec-1",
        workflow.nodes[0],
        triggerData,
        workflow
      );

      expect(result.parallel).toBe(false);
      expect(result.reason).toBe("No parallel nodes found");
    });
  });
});
