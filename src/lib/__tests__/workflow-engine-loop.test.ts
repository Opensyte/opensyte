/**
 * Unit tests for LOOP node execution in WorkflowExecutionEngine
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

describe("WorkflowExecutionEngine - LOOP Node", () => {
  let engine: WorkflowExecutionEngine;

  beforeEach(() => {
    engine = new WorkflowExecutionEngine();
    vi.clearAllMocks();
  });

  describe("Basic Loop Execution", () => {
    it("should iterate over an array of items", async () => {
      const triggerData: WorkflowTriggerEvent = {
        module: "Projects",
        entityType: "Task",
        eventType: "TASK_CREATED",
        organizationId: "org-1",
        payload: {
          tasks: [
            { id: "task-1", name: "Task 1" },
            { id: "task-2", name: "Task 2" },
            { id: "task-3", name: "Task 3" },
          ],
        },
      };

      const workflow = {
        id: "workflow-1",
        name: "Test Workflow",
        nodes: [
          {
            id: "loop-node",
            type: "LOOP" as const,
            config: {
              dataSource: "payload.tasks",
              itemVariable: "currentTask",
              loopBodyNodeId: "body-node",
            },
          },
          {
            id: "body-node",
            type: "ACTION" as const,
            config: {},
          },
        ],
        triggers: [],
        connections: [],
      };

      const result = await (engine as any).executeLoopNode(
        "exec-1",
        workflow.nodes[0],
        triggerData,
        workflow
      );

      expect(result.looped).toBe(true);
      expect(result.iterations).toBe(3);
      expect(result.itemsProcessed).toBe(3);
      expect(result.results).toHaveLength(3);
    });

    it("should respect maxIterations limit", async () => {
      const triggerData: WorkflowTriggerEvent = {
        module: "Projects",
        entityType: "Task",
        eventType: "TASK_CREATED",
        organizationId: "org-1",
        payload: {
          tasks: [
            { id: "task-1" },
            { id: "task-2" },
            { id: "task-3" },
            { id: "task-4" },
            { id: "task-5" },
          ],
        },
      };

      const workflow = {
        id: "workflow-1",
        name: "Test Workflow",
        nodes: [
          {
            id: "loop-node",
            type: "LOOP" as const,
            config: {
              dataSource: "payload.tasks",
              itemVariable: "currentTask",
              maxIterations: 3,
              loopBodyNodeId: "body-node",
            },
          },
          {
            id: "body-node",
            type: "ACTION" as const,
            config: {},
          },
        ],
        triggers: [],
        connections: [],
      };

      const result = await (engine as any).executeLoopNode(
        "exec-1",
        workflow.nodes[0],
        triggerData,
        workflow
      );

      expect(result.looped).toBe(true);
      expect(result.iterations).toBe(3);
      expect(result.itemsProcessed).toBe(3);
    });

    it("should handle empty arrays", async () => {
      const triggerData: WorkflowTriggerEvent = {
        module: "Projects",
        entityType: "Task",
        eventType: "TASK_CREATED",
        organizationId: "org-1",
        payload: {
          tasks: [],
        },
      };

      const workflow = {
        id: "workflow-1",
        name: "Test Workflow",
        nodes: [
          {
            id: "loop-node",
            type: "LOOP" as const,
            config: {
              dataSource: "payload.tasks",
              itemVariable: "currentTask",
              loopBodyNodeId: "body-node",
            },
          },
        ],
        triggers: [],
        connections: [],
      };

      const result = await (engine as any).executeLoopNode(
        "exec-1",
        workflow.nodes[0],
        triggerData,
        workflow
      );

      expect(result.looped).toBe(true);
      expect(result.iterations).toBe(0);
      expect(result.itemsProcessed).toBe(0);
    });
  });

  describe("Break Conditions", () => {
    it("should break loop when break condition is met", async () => {
      const triggerData: WorkflowTriggerEvent = {
        module: "Projects",
        entityType: "Task",
        eventType: "TASK_CREATED",
        organizationId: "org-1",
        payload: {
          tasks: [
            { id: "task-1", priority: "low" },
            { id: "task-2", priority: "medium" },
            { id: "task-3", priority: "high" },
            { id: "task-4", priority: "low" },
          ],
        },
      };

      const workflow = {
        id: "workflow-1",
        name: "Test Workflow",
        nodes: [
          {
            id: "loop-node",
            type: "LOOP" as const,
            config: {
              dataSource: "payload.tasks",
              itemVariable: "currentTask",
              breakCondition: {
                field: "payload.currentTask.priority",
                operator: "equals",
                value: "high",
              },
              loopBodyNodeId: "body-node",
            },
          },
          {
            id: "body-node",
            type: "ACTION" as const,
            config: {},
          },
        ],
        triggers: [],
        connections: [],
      };

      const result = await (engine as any).executeLoopNode(
        "exec-1",
        workflow.nodes[0],
        triggerData,
        workflow
      );

      expect(result.looped).toBe(true);
      expect(result.breakEarly).toBe(true);
      expect(result.iterations).toBe(3); // Should stop at the high priority task
    });
  });

  describe("Loop Context", () => {
    it("should provide loop index and count in context", async () => {
      const triggerData: WorkflowTriggerEvent = {
        module: "Projects",
        entityType: "Task",
        eventType: "TASK_CREATED",
        organizationId: "org-1",
        payload: {
          items: ["a", "b", "c"],
        },
      };

      const workflow = {
        id: "workflow-1",
        name: "Test Workflow",
        nodes: [
          {
            id: "loop-node",
            type: "LOOP" as const,
            config: {
              dataSource: "payload.items",
              itemVariable: "item",
              loopBodyNodeId: "body-node",
            },
          },
          {
            id: "body-node",
            type: "ACTION" as const,
            config: {},
          },
        ],
        triggers: [],
        connections: [],
      };

      const result = await (engine as any).executeLoopNode(
        "exec-1",
        workflow.nodes[0],
        triggerData,
        workflow
      );

      expect(result.looped).toBe(true);
      expect(result.results).toHaveLength(3);
      expect(result.results[0].iteration).toBe(1);
      expect(result.results[1].iteration).toBe(2);
      expect(result.results[2].iteration).toBe(3);
    });
  });

  describe("Error Handling", () => {
    it("should handle missing data source", async () => {
      const triggerData: WorkflowTriggerEvent = {
        module: "Projects",
        entityType: "Task",
        eventType: "TASK_CREATED",
        organizationId: "org-1",
        payload: {},
      };

      const workflow = {
        id: "workflow-1",
        name: "Test Workflow",
        nodes: [
          {
            id: "loop-node",
            type: "LOOP" as const,
            config: {
              dataSource: "payload.nonexistent",
              itemVariable: "item",
              loopBodyNodeId: "body-node",
            },
          },
        ],
        triggers: [],
        connections: [],
      };

      const result = await (engine as any).executeLoopNode(
        "exec-1",
        workflow.nodes[0],
        triggerData,
        workflow
      );

      expect(result.looped).toBe(false);
      expect(result.reason).toBe("Data source is not an array");
    });

    it("should handle non-array data source", async () => {
      const triggerData: WorkflowTriggerEvent = {
        module: "Projects",
        entityType: "Task",
        eventType: "TASK_CREATED",
        organizationId: "org-1",
        payload: {
          tasks: "not an array",
        },
      };

      const workflow = {
        id: "workflow-1",
        name: "Test Workflow",
        nodes: [
          {
            id: "loop-node",
            type: "LOOP" as const,
            config: {
              dataSource: "payload.tasks",
              itemVariable: "item",
              loopBodyNodeId: "body-node",
            },
          },
        ],
        triggers: [],
        connections: [],
      };

      const result = await (engine as any).executeLoopNode(
        "exec-1",
        workflow.nodes[0],
        triggerData,
        workflow
      );

      expect(result.looped).toBe(false);
      expect(result.reason).toBe("Data source is not an array");
    });

    it("should handle missing loop body node", async () => {
      const triggerData: WorkflowTriggerEvent = {
        module: "Projects",
        entityType: "Task",
        eventType: "TASK_CREATED",
        organizationId: "org-1",
        payload: {
          tasks: [{ id: "task-1" }],
        },
      };

      const workflow = {
        id: "workflow-1",
        name: "Test Workflow",
        nodes: [
          {
            id: "loop-node",
            type: "LOOP" as const,
            config: {
              dataSource: "payload.tasks",
              itemVariable: "item",
              loopBodyNodeId: "nonexistent-node",
            },
          },
        ],
        triggers: [],
        connections: [],
      };

      const result = await (engine as any).executeLoopNode(
        "exec-1",
        workflow.nodes[0],
        triggerData,
        workflow
      );

      expect(result.looped).toBe(true);
      expect(result.results[0].result.executed).toBe(false);
      expect(result.results[0].result.reason).toBe("Loop body node not found");
    });
  });
});
