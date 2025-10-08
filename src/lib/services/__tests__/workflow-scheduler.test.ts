import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkflowScheduleRecord } from "../workflow-scheduler";
import { WorkflowScheduler } from "../workflow-scheduler";

const schedulerMock = vi.hoisted(() => {
  type InternalRecord = WorkflowScheduleRecord & {
    createdAt: Date;
    updatedAt: Date;
  };

  const schedules = new Map<string, InternalRecord>();
  const byNode = new Map<string, string>();
  let idCounter = 0;

  const cloneUpdate = (data: Record<string, unknown>) => {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value instanceof Date) {
        result[key] = new Date(value);
      } else if (value && typeof value === "object" && !Array.isArray(value)) {
        result[key] = { ...value };
      } else {
        result[key] = value;
      }
    }
    return result;
  };

  const cloneRecord = (record: InternalRecord): WorkflowScheduleRecord => ({
    id: record.id,
    workflowId: record.workflowId,
    nodeId: record.nodeId,
    cron: record.cron,
    frequency: record.frequency,
    timezone: record.timezone,
    startAt: record.startAt ? new Date(record.startAt) : null,
    endAt: record.endAt ? new Date(record.endAt) : null,
    isActive: record.isActive,
    lastRunAt: record.lastRunAt ? new Date(record.lastRunAt) : null,
    nextRunAt: record.nextRunAt ? new Date(record.nextRunAt) : null,
    metadata: record.metadata ? { ...record.metadata } : null,
  });

  const workflowSchedule = {
    async upsert(args: {
      where: { nodeId: string };
      update: Record<string, unknown>;
      create: Record<string, unknown>;
    }): Promise<WorkflowScheduleRecord> {
      const existingId = byNode.get(args.where.nodeId);
      if (existingId) {
        const existing = schedules.get(existingId);
        if (!existing) {
          throw new Error("Schedule not found for node");
        }
        const updated: InternalRecord = {
          ...existing,
          ...cloneUpdate(args.update),
          updatedAt: new Date(),
        };
        schedules.set(existingId, updated);
        return cloneRecord(updated);
      }

      const id = `sched_${++idCounter}`;
      const workflowId =
        typeof args.create.workflowId === "string"
          ? args.create.workflowId
          : "wf";
      const nodeId =
        typeof args.create.nodeId === "string"
          ? args.create.nodeId
          : args.where.nodeId;

      const record: InternalRecord = {
        id,
        workflowId,
        nodeId,
        cron: (args.create.cron as string | null) ?? null,
        frequency: (args.create.frequency as string | null) ?? null,
        timezone: (args.create.timezone as string | null) ?? "UTC",
        startAt: args.create.startAt
          ? new Date(args.create.startAt as string | number | Date)
          : null,
        endAt: args.create.endAt
          ? new Date(args.create.endAt as string | number | Date)
          : null,
        isActive: Boolean(args.create.isActive ?? true),
        lastRunAt: args.create.lastRunAt
          ? new Date(args.create.lastRunAt as string | number | Date)
          : null,
        nextRunAt: args.create.nextRunAt
          ? new Date(args.create.nextRunAt as string | number | Date)
          : null,
        metadata:
          (args.create.metadata as Record<string, unknown> | null) ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      schedules.set(id, record);
      byNode.set(nodeId, id);
      return cloneRecord(record);
    },

    async findMany(args: {
      where: {
        isActive?: boolean;
        nextRunAt?: { lte?: Date };
        OR?: Array<{ endAt: null } | { endAt: { gte: Date } }>;
      };
      take?: number;
    }): Promise<WorkflowScheduleRecord[]> {
      const now = args.where.nextRunAt?.lte ?? new Date();
      const limit = args.take ?? schedules.size;
      const result: WorkflowScheduleRecord[] = [];
      for (const schedule of schedules.values()) {
        if (result.length >= limit) {
          break;
        }
        if (args.where.isActive === true && !schedule.isActive) {
          continue;
        }
        if (schedule.nextRunAt && schedule.nextRunAt <= now) {
          if (schedule.endAt && schedule.endAt < now) {
            continue;
          }
          result.push(cloneRecord(schedule));
        }
      }
      result.sort((a, b) => {
        const aTime = a.nextRunAt?.getTime() ?? 0;
        const bTime = b.nextRunAt?.getTime() ?? 0;
        return aTime - bTime;
      });
      return result;
    },

    async findUnique(args: {
      where: { id: string };
    }): Promise<WorkflowScheduleRecord | null> {
      const record = schedules.get(args.where.id);
      return record ? cloneRecord(record) : null;
    },

    async update(args: {
      where: { id: string };
      data: Record<string, unknown>;
    }): Promise<WorkflowScheduleRecord> {
      const record = schedules.get(args.where.id);
      if (!record) {
        throw new Error("Schedule not found");
      }
      const updated: InternalRecord = {
        ...record,
        ...cloneUpdate(args.data),
        updatedAt: new Date(),
      };
      schedules.set(args.where.id, updated);
      return cloneRecord(updated);
    },
  };

  return {
    workflowSchedule,
    reset() {
      schedules.clear();
      byNode.clear();
      idCounter = 0;
    },
  };
});

vi.mock("cron-parser", () => {
  const parseExpression = (
    expression: string,
    options?: { currentDate?: Date | string | number; tz?: string }
  ) => {
    const parts = expression.trim().split(/\s+/);
    const minute = Number(parts[0] ?? 0);
    const hour = Number(parts[1] ?? 0);

    return {
      next() {
        const base = options?.currentDate
          ? new Date(options.currentDate)
          : new Date();
        const next = new Date(base);
        next.setUTCMilliseconds(0);
        next.setUTCSeconds(0);
        next.setUTCMinutes(Number.isFinite(minute) ? minute : 0);
        next.setUTCHours(Number.isFinite(hour) ? hour : 0);
        if (next.getTime() < base.getTime()) {
          next.setUTCDate(next.getUTCDate() + 1);
        }
        return {
          toDate: () => new Date(next.getTime()),
        };
      },
    };
  };

  return {
    parseExpression,
    default: { parseExpression },
  };
});

vi.mock("~/server/db", () => ({
  db: { workflowSchedule: schedulerMock.workflowSchedule },
}));

vi.mock("../execution-logger", () => ({
  executionLogger: {
    info: vi.fn().mockResolvedValue(undefined),
    warn: vi.fn().mockResolvedValue(undefined),
    error: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("WorkflowScheduler", () => {
  beforeEach(() => {
    schedulerMock.reset();
  });

  it("calculates next run for cron expressions", async () => {
    const base = new Date("2025-01-05T09:15:00.000Z");
    const scheduler = new WorkflowScheduler(() => base);

    const record = await scheduler.upsertSchedule("wf-1", "node-1", {
      cron: "0 10 * * *",
      timezone: "UTC",
      metadata: { organizationId: "org-1" },
    });

    // Debug diagnostics during development
    expect(record.nextRunAt?.toISOString()).toBe("2025-01-05T10:00:00.000Z");
    expect(record.metadata).toMatchObject({ organizationId: "org-1" });
  });

  it("returns due schedules ordered by next run", async () => {
    const base = new Date("2025-01-05T09:00:00.000Z");
    const scheduler = new WorkflowScheduler(() => base);

    await scheduler.upsertSchedule("wf-1", "node-1", {
      cron: "0 9 * * *",
      timezone: "UTC",
    });
    await scheduler.upsertSchedule("wf-2", "node-2", {
      cron: "0 9 * * *",
      timezone: "UTC",
    });

    const due = await scheduler.fetchDueSchedules(5);
    expect(due).toHaveLength(2);
    const [first, second] = due as [
      WorkflowScheduleRecord,
      WorkflowScheduleRecord,
    ];
    expect(first.nextRunAt).toBeInstanceOf(Date);
    expect(second.nextRunAt).toBeInstanceOf(Date);
    expect(first.nextRunAt!.getTime()).toBeLessThanOrEqual(
      second.nextRunAt!.getTime()
    );
  });

  it("advances next run after successful execution", async () => {
    const base = new Date("2025-01-05T09:30:00.000Z");
    const scheduler = new WorkflowScheduler(() => base);

    const record = await scheduler.upsertSchedule("wf-1", "node-1", {
      cron: "0 9 * * *",
      timezone: "UTC",
    });

    const executedAt = new Date("2025-01-05T09:00:00.000Z");
    const updated = await scheduler.markRunSuccess(record.id, executedAt);

    expect(updated.lastRunAt?.toISOString()).toBe(executedAt.toISOString());
    expect(updated.nextRunAt?.toISOString()).toBe("2025-01-06T09:00:00.000Z");
  });

  it("applies exponential backoff on failures", async () => {
    const base = new Date("2025-01-05T09:00:00.000Z");
    const scheduler = new WorkflowScheduler(() => base);

    const record = await scheduler.upsertSchedule("wf-1", "node-1", {
      cron: "0 9 * * *",
      timezone: "UTC",
    });

    const failed = await scheduler.markRunFailure(record.id, new Error("test"));
    expect(failed.metadata).toMatchObject({ retryCount: 1 });
    expect(failed.nextRunAt?.toISOString()).toBe("2025-01-05T09:01:00.000Z");
  });
});
