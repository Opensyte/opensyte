import cronParser from "cron-parser";
import {
  addDays,
  addHours,
  addMinutes,
  addMonths,
  addWeeks,
  isAfter,
  isBefore,
  max as maxDate,
  startOfMinute,
} from "date-fns";
import type { Prisma, PrismaClient } from "@prisma/client";
import { db } from "~/server/db";
import { executionLogger } from "./execution-logger";
import type { ScheduleNodeConfig } from "~/types/workflow-types";

export type WorkflowScheduleRecord = {
  id: string;
  workflowId: string;
  nodeId: string;
  cron: string | null;
  frequency: string | null;
  timezone: string | null;
  startAt: Date | null;
  endAt: Date | null;
  isActive: boolean;
  lastRunAt: Date | null;
  nextRunAt: Date | null;
  metadata: Record<string, unknown> | null;
};

type SchedulerDiagnostics = {
  timestamp: Date;
  level: "info" | "warn" | "error";
  message: string;
  scheduleId?: string;
  workflowId?: string;
  nodeId?: string;
  details?: Record<string, unknown>;
};

type MetadataRecord = {
  retryCount?: number;
  lastError?: string;
  lastErrorAt?: string;
  [key: string]: unknown;
};

type ScheduleConfig = {
  cron: string | null;
  frequency: string | null;
  timezone: string;
  startAt: Date | null;
  endAt: Date | null;
  isActive: boolean;
};

type ScheduleOverrideInput =
  | ScheduleNodeConfig
  | (Partial<ScheduleConfig> & { metadata?: Record<string, unknown> | null });

type OverrideFlags = {
  cron?: true;
  frequency?: true;
  timezone?: true;
  startAt?: true;
  endAt?: true;
  isActive?: true;
  metadata?: true;
};

type WorkflowScheduleDelegate = PrismaClient["workflowSchedule"];
type RawWorkflowSchedule = Awaited<
  ReturnType<WorkflowScheduleDelegate["create"]>
>;

const DEFAULT_BACKOFF_SECONDS = 60;
const MAX_BACKOFF_SECONDS = 60 * 60 * 24;

export class WorkflowScheduler {
  private readonly diagnostics: SchedulerDiagnostics[] = [];

  constructor(private readonly currentTime: () => Date = () => new Date()) {
    if (!db.workflowSchedule) {
      throw new Error(
        "WorkflowSchedule model is not available in Prisma client"
      );
    }
  }

  private get delegate(): WorkflowScheduleDelegate {
    const delegate = db.workflowSchedule;
    if (!delegate) {
      throw new Error("Workflow schedule delegate is not initialized");
    }
    return delegate;
  }

  public getDiagnostics(): SchedulerDiagnostics[] {
    return [...this.diagnostics];
  }

  public clearDiagnostics(): void {
    this.diagnostics.length = 0;
  }

  public async upsertSchedule(
    workflowId: string,
    nodeId: string,
    config: ScheduleNodeConfig
  ): Promise<WorkflowScheduleRecord> {
    const normalized = this.normalizeOverride(config);
    const scheduleConfig: ScheduleConfig = {
      cron: normalized.values.cron ?? null,
      frequency: normalized.values.frequency ?? null,
      timezone: normalized.values.timezone ?? "UTC",
      startAt: normalized.flags.startAt
        ? (normalized.values.startAt ?? null)
        : null,
      endAt: normalized.flags.endAt ? (normalized.values.endAt ?? null) : null,
      isActive: normalized.values.isActive ?? true,
    };

    const metadataRecord = this.prepareMetadata(normalized.metadata, {
      retryCount: 0,
    });
    const metadataValue = this.serializeMetadata(metadataRecord);
    const nextRunAt = this.calculateNextRun(scheduleConfig);

    const updateData: Prisma.WorkflowScheduleUncheckedUpdateInput = {
      cron: scheduleConfig.cron,
      frequency: scheduleConfig.frequency,
      timezone: scheduleConfig.timezone,
      startAt: scheduleConfig.startAt,
      endAt: scheduleConfig.endAt,
      isActive: scheduleConfig.isActive,
      nextRunAt,
      metadata: metadataValue,
    };

    const createData: Prisma.WorkflowScheduleUncheckedCreateInput = {
      workflowId,
      nodeId,
      cron: scheduleConfig.cron,
      frequency: scheduleConfig.frequency,
      timezone: scheduleConfig.timezone,
      startAt: scheduleConfig.startAt,
      endAt: scheduleConfig.endAt,
      isActive: scheduleConfig.isActive,
      nextRunAt,
      metadata: metadataValue,
    };

    const schedule = await this.delegate.upsert({
      where: { nodeId },
      update: updateData,
      create: createData,
    });

    const record = this.mapRecord(schedule);
    this.emitDiagnostic("info", "Schedule upserted", record, {
      nextRunAt: record.nextRunAt?.toISOString(),
    });
    return record;
  }

  public async fetchDueSchedules(
    limit = 10
  ): Promise<WorkflowScheduleRecord[]> {
    const now = this.currentTime();

    const schedules = await this.delegate.findMany({
      where: {
        isActive: true,
        nextRunAt: {
          lte: now,
        },
        OR: [
          { endAt: null },
          {
            endAt: {
              gte: now,
            },
          },
        ],
      },
      orderBy: { nextRunAt: "asc" },
      take: limit,
    });

    const records = schedules.map(schedule => this.mapRecord(schedule));
    records.forEach(record =>
      this.emitDiagnostic("info", "Schedule retrieved for execution", record)
    );
    return records;
  }

  public async markRunSuccess(
    scheduleId: string,
    executedAt: Date,
    overrides?: ScheduleOverrideInput
  ): Promise<WorkflowScheduleRecord> {
    const schedule = await this.delegate.findUnique({
      where: { id: scheduleId },
    });
    if (!schedule) {
      throw new Error(`Schedule ${scheduleId} not found`);
    }

    const override = this.normalizeOverride(overrides);
    const baseConfig = this.scheduleToConfig(schedule);
    const mergedConfig = this.applyOverrides(baseConfig, override.values);

    const metadataRecord = this.prepareMetadata(override.metadata, {
      retryCount: 0,
    });
    const metadataValue = this.serializeMetadata(metadataRecord);
    const nextRunAt = this.calculateNextRun(mergedConfig, executedAt);

    const updateData: Prisma.WorkflowScheduleUncheckedUpdateInput = {
      lastRunAt: executedAt,
      nextRunAt,
      metadata: metadataValue,
    };

    if (override.flags.cron) {
      updateData.cron = override.values.cron ?? null;
    }
    if (override.flags.frequency) {
      updateData.frequency = override.values.frequency ?? null;
    }
    if (override.flags.timezone) {
      updateData.timezone = override.values.timezone ?? baseConfig.timezone;
    }
    if (override.flags.startAt) {
      updateData.startAt = override.values.startAt ?? null;
    }
    if (override.flags.endAt) {
      updateData.endAt = override.values.endAt ?? null;
    }
    if (override.flags.isActive) {
      updateData.isActive = override.values.isActive ?? false;
    } else if (!nextRunAt) {
      updateData.isActive = false;
    }

    const updated = await this.delegate.update({
      where: { id: scheduleId },
      data: updateData,
    });

    const record = this.mapRecord(updated);
    this.emitDiagnostic("info", "Schedule run marked successful", record, {
      executedAt: executedAt.toISOString(),
      nextRunAt: record.nextRunAt?.toISOString(),
    });
    return record;
  }

  public async markRunFailure(
    scheduleId: string,
    error: unknown
  ): Promise<WorkflowScheduleRecord> {
    const schedule = await this.delegate.findUnique({
      where: { id: scheduleId },
    });
    if (!schedule) {
      throw new Error(`Schedule ${scheduleId} not found`);
    }

    const metadata = this.prepareMetadata(schedule.metadata ?? null);
    const retryCount = (metadata.retryCount ?? 0) + 1;
    const failureMessage =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : "Unknown error";

    metadata.retryCount = retryCount;
    metadata.lastError = failureMessage;
    metadata.lastErrorAt = this.currentTime().toISOString();

    const backoffSeconds = this.calculateBackoffSeconds(retryCount);
    const nextRunAt = new Date(
      this.currentTime().getTime() + backoffSeconds * 1000
    );
    const metadataValue = this.serializeMetadata(metadata);

    const updated = await this.delegate.update({
      where: { id: scheduleId },
      data: {
        nextRunAt,
        metadata: metadataValue,
      },
    });

    const record = this.mapRecord(updated);
    this.emitDiagnostic("warn", "Schedule run failed", record, {
      error: failureMessage,
      retryCount,
      nextRunAt: record.nextRunAt?.toISOString(),
    });
    return record;
  }

  public async setActiveState(
    scheduleId: string,
    isActive: boolean
  ): Promise<WorkflowScheduleRecord> {
    const updated = await this.delegate.update({
      where: { id: scheduleId },
      data: { isActive },
    });

    const record = this.mapRecord(updated);
    this.emitDiagnostic("info", "Schedule active state updated", record, {
      isActive,
    });
    return record;
  }

  private scheduleToConfig(schedule: RawWorkflowSchedule): ScheduleConfig {
    return {
      cron: schedule.cron,
      frequency: schedule.frequency,
      timezone: schedule.timezone ?? "UTC",
      startAt: schedule.startAt,
      endAt: schedule.endAt,
      isActive: schedule.isActive,
    };
  }

  private applyOverrides(
    base: ScheduleConfig,
    overrides: Partial<ScheduleConfig>
  ): ScheduleConfig {
    return {
      cron: overrides.cron ?? base.cron,
      frequency: overrides.frequency ?? base.frequency,
      timezone: overrides.timezone ?? base.timezone,
      startAt: overrides.startAt ?? base.startAt,
      endAt: overrides.endAt ?? base.endAt,
      isActive: overrides.isActive ?? base.isActive,
    };
  }

  private normalizeOverride(input?: ScheduleOverrideInput): {
    values: Partial<ScheduleConfig>;
    metadata: Record<string, unknown> | null;
    flags: OverrideFlags;
  } {
    const values: Partial<ScheduleConfig> = {};
    const flags: OverrideFlags = {};
    let metadata: Record<string, unknown> | null = null;

    if (!input) {
      return { values, metadata, flags };
    }

    if ("cron" in input) {
      flags.cron = true;
      values.cron =
        typeof input.cron === "string" && input.cron.trim().length > 0
          ? input.cron.trim()
          : null;
    }

    if ("frequency" in input) {
      flags.frequency = true;
      values.frequency =
        typeof input.frequency === "string" && input.frequency.trim().length > 0
          ? input.frequency.trim()
          : null;
    }

    const timezoneValue = (input as { timezone?: unknown }).timezone;
    if (timezoneValue !== undefined) {
      flags.timezone = true;
      if (
        typeof timezoneValue === "string" &&
        timezoneValue.trim().length > 0
      ) {
        values.timezone = timezoneValue.trim();
      } else {
        values.timezone = "UTC";
      }
    }

    const startValue = (input as { startAt?: unknown }).startAt;
    if (startValue !== undefined) {
      flags.startAt = true;
      values.startAt = this.parseDate(startValue);
    }

    const endValue = (input as { endAt?: unknown }).endAt;
    if (endValue !== undefined) {
      flags.endAt = true;
      values.endAt = this.parseDate(endValue);
    }

    const isActiveValue = (input as { isActive?: unknown }).isActive;
    if (isActiveValue !== undefined) {
      flags.isActive = true;
      values.isActive = Boolean(isActiveValue);
    }

    if ("metadata" in input) {
      flags.metadata = true;
      metadata = this.toRecord((input as { metadata?: unknown }).metadata);
    }

    return { values, metadata, flags };
  }

  private calculateNextRun(
    config: ScheduleConfig,
    fromDate?: Date
  ): Date | null {
    const referenceBase = fromDate ?? this.currentTime();
    const reference = startOfMinute(referenceBase);

    if (config.startAt && isAfter(config.startAt, reference)) {
      return config.startAt;
    }

    if (config.endAt && isBefore(config.endAt, reference)) {
      return null;
    }

    if (config.cron) {
      try {
        const interval = cronParser.parseExpression(config.cron, {
          currentDate: reference,
          tz: config.timezone,
        });
        const next = interval.next().toDate();
        if (config.endAt && isAfter(next, config.endAt)) {
          return null;
        }
        return next;
      } catch (error) {
        this.emitDiagnostic(
          "error",
          "Failed to calculate next cron run",
          undefined,
          {
            cron: config.cron,
            error: error instanceof Error ? error.message : String(error),
          }
        );
        return null;
      }
    }

    if (config.frequency) {
      const normalized = config.frequency.toUpperCase();
      let candidate: Date;
      switch (normalized) {
        case "HOURLY":
          candidate = addHours(reference, 1);
          break;
        case "DAILY":
          candidate = addDays(reference, 1);
          break;
        case "WEEKLY":
          candidate = addWeeks(reference, 1);
          break;
        case "MONTHLY":
          candidate = addMonths(reference, 1);
          break;
        case "YEARLY":
          candidate = addMonths(reference, 12);
          break;
        default:
          this.emitDiagnostic(
            "warn",
            "Unknown frequency, defaulting to daily",
            undefined,
            {
              frequency: config.frequency,
            }
          );
          candidate = addDays(reference, 1);
          break;
      }

      if (config.endAt && isAfter(candidate, config.endAt)) {
        return null;
      }

      return config.startAt ? maxDate([candidate, config.startAt]) : candidate;
    }

    return addMinutes(reference, 5);
  }

  private calculateBackoffSeconds(retryCount: number): number {
    const exponential = DEFAULT_BACKOFF_SECONDS * 2 ** (retryCount - 1);
    const capped = Math.min(exponential, MAX_BACKOFF_SECONDS);
    return Math.max(DEFAULT_BACKOFF_SECONDS, capped);
  }

  private mapRecord(schedule: RawWorkflowSchedule): WorkflowScheduleRecord {
    return {
      id: schedule.id,
      workflowId: schedule.workflowId,
      nodeId: schedule.nodeId,
      cron: schedule.cron,
      frequency: schedule.frequency,
      timezone: schedule.timezone,
      startAt: schedule.startAt,
      endAt: schedule.endAt,
      isActive: schedule.isActive,
      lastRunAt: schedule.lastRunAt,
      nextRunAt: schedule.nextRunAt,
      metadata: this.normalizeMetadata(schedule.metadata ?? null),
    };
  }

  private prepareMetadata(
    metadata: unknown,
    defaults: MetadataRecord = {}
  ): MetadataRecord {
    const normalized = this.normalizeMetadata(metadata) ?? {};
    const merged: MetadataRecord = {
      ...normalized,
      ...defaults,
    };

    if (
      typeof merged.retryCount !== "number" ||
      Number.isNaN(merged.retryCount)
    ) {
      merged.retryCount = defaults.retryCount ?? 0;
    }

    return merged;
  }

  private serializeMetadata(
    metadata: MetadataRecord | null
  ): Prisma.InputJsonValue | undefined {
    if (!metadata) {
      return undefined;
    }

    const entries = Object.entries(metadata).filter(
      ([, value]) => value !== undefined
    );
    if (entries.length === 0) {
      return undefined;
    }

    return entries.reduce<Prisma.JsonObject>((accumulator, [key, value]) => {
      accumulator[key] = value as Prisma.JsonValue;
      return accumulator;
    }, {});
  }

  private normalizeMetadata(metadata: unknown): MetadataRecord | null {
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
      return null;
    }

    const record = metadata as Record<string, unknown>;
    const normalized: MetadataRecord = { ...record };

    if (
      typeof normalized.retryCount !== "number" ||
      !Number.isFinite(normalized.retryCount)
    ) {
      delete normalized.retryCount;
    }

    if (typeof normalized.lastError !== "string") {
      delete normalized.lastError;
    }

    if (typeof normalized.lastErrorAt !== "string") {
      delete normalized.lastErrorAt;
    }

    return Object.keys(normalized).length > 0 ? normalized : null;
  }

  private emitDiagnostic(
    level: "info" | "warn" | "error",
    message: string,
    schedule?: WorkflowScheduleRecord,
    details?: Record<string, unknown>
  ): void {
    const diagnostic: SchedulerDiagnostics = {
      timestamp: this.currentTime(),
      level,
      message,
      scheduleId: schedule?.id,
      workflowId: schedule?.workflowId,
      nodeId: schedule?.nodeId,
      details,
    };

    this.diagnostics.push(diagnostic);

    const payload = {
      ...details,
      scheduleId: schedule?.id,
      workflowId: schedule?.workflowId,
      nodeId: schedule?.nodeId,
    };

    const context = {
      workflowExecutionId: `scheduler:${schedule?.workflowId ?? "system"}`,
      nodeId: schedule?.nodeId,
      source: "workflow-scheduler",
      category: "scheduler",
    } as const;

    const logPromise = (() => {
      switch (level) {
        case "warn":
          return executionLogger.warn(context, message, payload);
        case "error":
          return executionLogger.error(context, message, undefined, payload);
        default:
          return executionLogger.info(context, message, payload);
      }
    })();

    void logPromise.catch(logError => {
      console.error("Failed to log workflow scheduler event", logError);
    });
  }

  private parseDate(value: unknown): Date | null {
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }

    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    return null;
  }

  private toRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }
    return value as Record<string, unknown>;
  }
}
