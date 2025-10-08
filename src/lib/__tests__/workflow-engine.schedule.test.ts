import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Prisma, WorkflowNode } from "@prisma/client";
import { WorkflowExecutionEngine } from "../workflow-engine";
import type { ScheduleNodeConfig } from "~/types/workflow-types";
import type { WorkflowScheduleRecord } from "../services/workflow-scheduler";
import { WorkflowScheduler } from "../services/workflow-scheduler";

vi.mock("../services/email-service", () => ({
  EmailService: vi.fn().mockImplementation(() => ({
    sendEmail: vi.fn(),
  })),
}));

vi.mock("../services/sms-service", () => ({
  SmsService: vi.fn().mockImplementation(() => ({
    sendSms: vi.fn(),
  })),
}));

vi.mock("../services/variable-resolver", () => ({
  VariableResolver: vi.fn().mockImplementation(() => ({
    resolve: vi.fn(),
  })),
}));

vi.mock("../services/execution-logger", () => ({
  executionLogger: {
    info: vi.fn().mockResolvedValue(undefined),
    warn: vi.fn().mockResolvedValue(undefined),
    error: vi.fn().mockResolvedValue(undefined),
    fatal: vi.fn().mockResolvedValue(undefined),
    logExecutionStarted: vi.fn().mockResolvedValue(undefined),
    logExecutionCompleted: vi.fn().mockResolvedValue(undefined),
    logExecutionFailed: vi.fn().mockResolvedValue(undefined),
    logNodeStarted: vi.fn().mockResolvedValue(undefined),
    logNodeCompleted: vi.fn().mockResolvedValue(undefined),
    logTriggerMatching: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../server/db", () => ({
  db: {},
}));

describe("WorkflowExecutionEngine schedule metadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("merges trigger context into schedule metadata and runtime context", async () => {
    const scheduleRecord: WorkflowScheduleRecord = {
      id: "sched-1",
      workflowId: "wf-1",
      nodeId: "node-1",
      cron: "0 8 * * 1",
      frequency: null,
      timezone: "UTC",
      startAt: null,
      endAt: null,
      isActive: true,
      lastRunAt: null,
      nextRunAt: new Date("2025-01-06T08:00:00.000Z"),
      metadata: { persisted: true },
    };

    const upsertSpy = vi
      .spyOn(WorkflowScheduler.prototype, "upsertSchedule")
      .mockResolvedValue(scheduleRecord);
    const engine = new WorkflowExecutionEngine();

    const scheduleConfig: ScheduleNodeConfig = {
      cron: "0 8 * * 1",
      metadata: { payload: { existing: true } },
      resultKey: "schedule_metadata",
    };

    const runtimeContext = {
      shared: Object.create(null) as Record<string, unknown>,
      nodeOutputs: Object.create(null) as Record<string, unknown>,
    };

    const triggerData = {
      module: "CRM",
      entityType: "contact",
      eventType: "created",
      organizationId: "org_1",
      payload: { contactId: "contact_1" },
      userId: "user_1",
      triggeredAt: new Date("2025-01-01T00:00:00.000Z"),
    };

    const node: WorkflowNode = {
      id: "prisma-node-id",
      workflowId: "wf-1",
      nodeId: "node-1",
      type: "SCHEDULE",
      name: "Schedule Node",
      description: null,
      position: { x: 0, y: 0 } as Prisma.JsonValue,
      config: null,
      template: null,
      executionOrder: 1,
      isOptional: false,
      retryLimit: 3,
      timeout: null,
      conditions: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      const result = await (
        engine as unknown as {
          executeScheduleNode: (
            workflowId: string,
            workflowNode: WorkflowNode,
            scheduleCfg: ScheduleNodeConfig,
            runtime: typeof runtimeContext,
            trigger: typeof triggerData
          ) => Promise<{ output: Record<string, unknown> }>;
        }
      ).executeScheduleNode(
        "wf-1",
        node,
        scheduleConfig,
        runtimeContext,
        triggerData
      );

      expect(upsertSpy).toHaveBeenCalledTimes(1);
      const passedConfig = upsertSpy.mock.calls[0]![2];
      expect(passedConfig.metadata).toMatchObject({
        organizationId: "org_1",
        module: "CRM",
        entityType: "contact",
        eventType: "created",
        userId: "user_1",
        payload: { existing: true },
      });

      expect(scheduleConfig.metadata).toMatchObject({
        organizationId: "org_1",
        module: "CRM",
        entityType: "contact",
        eventType: "created",
        userId: "user_1",
        payload: { existing: true },
      });

      const sharedSchedule = runtimeContext.shared
        .schedule_metadata as WorkflowScheduleRecord;
      expect(sharedSchedule).toEqual(scheduleRecord);

      expect(result.output).toMatchObject({
        scheduled: true,
        scheduleId: "sched-1",
        cron: "0 8 * * 1",
        timezone: "UTC",
        isActive: true,
        nextRunAt: scheduleRecord.nextRunAt,
      });
    } finally {
      upsertSpy.mockRestore();
    }
  });
});
