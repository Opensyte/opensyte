import "~/env.js";
import { db } from "~/server/db";
import {
  WorkflowScheduler,
  type WorkflowScheduleRecord,
} from "~/lib/services/workflow-scheduler";
import {
  WorkflowExecutionEngine,
  type WorkflowTriggerEvent,
} from "~/lib/workflow-engine";
import type { ScheduleNodeConfig } from "~/types/workflow-types";

const scheduler = new WorkflowScheduler();
const engine = new WorkflowExecutionEngine();

const pollIntervalMs = readNumericEnv(
  process.env.WORKFLOW_SCHEDULER_POLL_INTERVAL_MS,
  60_000
);
const batchSize = readNumericEnv(process.env.WORKFLOW_SCHEDULER_BATCH_SIZE, 25);

let isProcessing = false;
let isShuttingDown = false;
let intervalHandle: NodeJS.Timeout | undefined;
let currentTick: Promise<void> | null = null;

start().catch(error => {
  console.error("[workflow-scheduler] Failed to start", error);
  process.exit(1);
});

async function start(): Promise<void> {
  console.info(
    `[workflow-scheduler] Worker started (interval=${pollIntervalMs}ms, batch=${batchSize})`
  );
  intervalHandle = setInterval(() => {
    void tick();
  }, pollIntervalMs);
  await tick();

  const shutdown = async (signal: NodeJS.Signals) => {
    if (isShuttingDown) {
      return;
    }
    isShuttingDown = true;
    if (intervalHandle) {
      clearInterval(intervalHandle);
    }
    if (currentTick) {
      try {
        await currentTick;
      } catch (error) {
        console.error(
          "[workflow-scheduler] Tick failed during shutdown",
          error
        );
      }
    }
    await db.$disconnect();
    console.info(`[workflow-scheduler] Graceful shutdown on ${signal}`);
    process.exit(0);
  };

  process.on("SIGINT", signal => {
    void shutdown(signal);
  });
  process.on("SIGTERM", signal => {
    void shutdown(signal);
  });
}

async function tick(): Promise<void> {
  if (isShuttingDown || isProcessing) {
    return;
  }

  isProcessing = true;
  currentTick = (async () => {
    try {
      const schedules = await scheduler.fetchDueSchedules(batchSize);
      if (schedules.length === 0) {
        return;
      }

      for (const schedule of schedules) {
        if (isShuttingDown) {
          break;
        }
        await handleSchedule(schedule);
      }
    } catch (error) {
      console.error("[workflow-scheduler] Tick failed", error);
    }
  })();

  try {
    await currentTick;
  } finally {
    isProcessing = false;
    currentTick = null;
  }
}

async function handleSchedule(schedule: WorkflowScheduleRecord): Promise<void> {
  const workflow = await db.workflow.findUnique({
    where: { id: schedule.workflowId },
    select: {
      id: true,
      name: true,
      organizationId: true,
      status: true,
      category: true,
    },
  });

  if (!workflow) {
    console.warn(
      `[workflow-scheduler] Workflow ${schedule.workflowId} missing, disabling schedule ${schedule.id}`
    );
    await scheduler.setActiveState(schedule.id, false);
    return;
  }

  if (workflow.status !== "ACTIVE") {
    await markFailure(schedule, `Workflow ${workflow.id} is not active`);
    return;
  }

  const metadata = extractMetadata(schedule.metadata);
  const organizationId = metadata.organizationId ?? workflow.organizationId;

  if (!organizationId) {
    await markFailure(schedule, "Missing organizationId for schedule run");
    return;
  }

  const { event, triggerId } = buildTriggerEvent(
    workflow.id,
    schedule,
    metadata,
    organizationId,
    workflow.category
  );

  try {
    const result = await engine.executeWorkflow(workflow.id, event, triggerId);

    if (!result.success) {
      throw new Error(
        `Workflow ${workflow.id} finished with status ${result.status}`
      );
    }

    const overrides = buildSuccessOverrides(metadata);
    await scheduler.markRunSuccess(schedule.id, new Date(), overrides);
    console.info(
      `[workflow-scheduler] Workflow ${workflow.id} executed for schedule ${schedule.id}`
    );
  } catch (error) {
    console.error(
      `[workflow-scheduler] Execution failed for schedule ${schedule.id}`,
      error
    );
    await markFailure(schedule, error);
  }
}

async function markFailure(
  schedule: WorkflowScheduleRecord,
  error: unknown
): Promise<void> {
  try {
    await scheduler.markRunFailure(schedule.id, error);
  } catch (markError) {
    console.error(
      `[workflow-scheduler] Failed to record failure for schedule ${schedule.id}`,
      markError
    );
  }
}

type SchedulerMetadata = {
  raw: Record<string, unknown> | null;
  organizationId?: string;
  module?: string;
  entityType?: string;
  eventType?: string;
  userId?: string;
  triggerId?: string;
  payload?: Record<string, unknown>;
  onSuccess?: Partial<ScheduleNodeConfig> & {
    metadata?: Record<string, unknown> | null;
  };
};

function extractMetadata(
  input: Record<string, unknown> | null
): SchedulerMetadata {
  if (!input) {
    return { raw: null };
  }

  const cleaned = { ...input };
  delete cleaned.retryCount;
  delete cleaned.lastError;
  delete cleaned.lastErrorAt;

  const payloadRecord = toRecord(cleaned.payload);
  if (payloadRecord) {
    cleaned.payload = payloadRecord;
  } else {
    delete cleaned.payload;
  }

  const onSuccessRecord = toRecord(cleaned.onSuccess);
  if (onSuccessRecord) {
    cleaned.onSuccess = onSuccessRecord;
  } else {
    delete cleaned.onSuccess;
  }

  const raw = Object.keys(cleaned).length > 0 ? cleaned : null;

  return {
    raw,
    organizationId:
      typeof cleaned.organizationId === "string"
        ? cleaned.organizationId
        : undefined,
    module:
      typeof cleaned.module === "string" && cleaned.module.trim().length > 0
        ? cleaned.module.trim()
        : undefined,
    entityType:
      typeof cleaned.entityType === "string" &&
      cleaned.entityType.trim().length > 0
        ? cleaned.entityType.trim()
        : undefined,
    eventType:
      typeof cleaned.eventType === "string" &&
      cleaned.eventType.trim().length > 0
        ? cleaned.eventType.trim()
        : undefined,
    userId:
      typeof cleaned.userId === "string" && cleaned.userId.trim().length > 0
        ? cleaned.userId.trim()
        : undefined,
    triggerId:
      typeof cleaned.triggerId === "string" &&
      cleaned.triggerId.trim().length > 0
        ? cleaned.triggerId.trim()
        : undefined,
    payload: payloadRecord ?? undefined,
    onSuccess: onSuccessRecord
      ? (onSuccessRecord as SchedulerMetadata["onSuccess"])
      : undefined,
  };
}

function buildTriggerEvent(
  workflowId: string,
  schedule: WorkflowScheduleRecord,
  metadata: SchedulerMetadata,
  organizationId: string,
  workflowCategory?: string | null
): { event: WorkflowTriggerEvent; triggerId?: string } {
  const moduleValue = normalizeString(
    metadata.module ?? workflowCategory ?? "system"
  );
  const entityValue = normalizeString(metadata.entityType ?? "schedule");
  const eventValue = normalizeString(metadata.eventType ?? "run");

  const payload = {
    ...(metadata.payload ?? {}),
    scheduleId: schedule.id,
    workflowId,
    nodeId: schedule.nodeId,
    scheduleMetadata: metadata.raw ?? {},
  };

  const event: WorkflowTriggerEvent = {
    module: moduleValue,
    entityType: entityValue,
    eventType: eventValue,
    organizationId,
    payload,
    userId: metadata.userId,
    triggeredAt: new Date(),
  };

  return { event, triggerId: metadata.triggerId };
}

function buildSuccessOverrides(
  metadata: SchedulerMetadata
): Partial<ScheduleNodeConfig> | undefined {
  const overrides: Record<string, unknown> = {};

  if (metadata.onSuccess) {
    Object.assign(overrides, metadata.onSuccess);
  }

  if (metadata.raw) {
    overrides.metadata = metadata.raw;
  }

  return Object.keys(overrides).length > 0
    ? (overrides as Partial<ScheduleNodeConfig>)
    : undefined;
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function normalizeString(value: string): string {
  return value.trim().length > 0 ? value.trim() : value;
}

function readNumericEnv(value: string | undefined, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}
