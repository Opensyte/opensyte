/**
 * Scheduler Engine
 *
 * Manages scheduled workflow executions with cron-based triggers.
 * Supports daily, weekly, monthly, and custom cron expressions.
 */

import { db } from "~/server/db";
import { type Prisma } from "@prisma/client";
import { executionLogger } from "./services/execution-logger";

export interface ScheduleConfig {
  workflowId: string;
  organizationId: string;
  cronExpression: string;
  timezone: string;
  enabled: boolean;
  payload?: Record<string, unknown>;
}

export interface ScheduleExecutionResult {
  scheduleId: string;
  workflowId: string;
  executionId?: string;
  success: boolean;
  executedAt: Date;
  nextRunAt: Date;
  error?: string;
}

export interface CronParseResult {
  isValid: boolean;
  nextRun?: Date;
  error?: string;
  description?: string;
}

/**
 * Scheduler Engine for managing workflow schedules
 */
export class SchedulerEngine {
  /**
   * Register a new schedule for a workflow
   */
  async registerSchedule(config: ScheduleConfig): Promise<string> {
    try {
      // Validate cron expression
      const parseResult = this.parseCronExpression(config.cronExpression);
      if (!parseResult.isValid) {
        throw new Error(`Invalid cron expression: ${parseResult.error}`);
      }

      // Calculate next run time
      const nextRunAt = this.calculateNextRun(
        config.cronExpression,
        config.timezone
      );

      // Create schedule record
      const schedule = await db.workflowSchedule.create({
        data: {
          workflowId: config.workflowId,
          organizationId: config.organizationId,
          cronExpression: config.cronExpression,
          timezone: config.timezone,
          enabled: config.enabled,
          nextRunAt,
          payload: config.payload as Prisma.InputJsonValue,
        },
      });

      await executionLogger.info({
        source: "scheduler-engine",
        message: "Schedule registered",
        metadata: {
          scheduleId: schedule.id,
          workflowId: config.workflowId,
          cronExpression: config.cronExpression,
          nextRunAt: nextRunAt.toISOString(),
        },
      });

      return schedule.id;
    } catch (error) {
      await executionLogger.error({
        source: "scheduler-engine",
        message: "Failed to register schedule",
        error: error instanceof Error ? error.message : String(error),
        metadata: { config },
      });
      throw error;
    }
  }

  /**
   * Update an existing schedule
   */
  async updateSchedule(
    scheduleId: string,
    updates: Partial<ScheduleConfig>
  ): Promise<void> {
    try {
      const updateData: Prisma.WorkflowScheduleUpdateInput = {};

      if (updates.cronExpression) {
        const parseResult = this.parseCronExpression(updates.cronExpression);
        if (!parseResult.isValid) {
          throw new Error(`Invalid cron expression: ${parseResult.error}`);
        }
        updateData.cronExpression = updates.cronExpression;
        updateData.nextRunAt = this.calculateNextRun(
          updates.cronExpression,
          updates.timezone ?? "UTC"
        );
      }

      if (updates.timezone !== undefined) {
        updateData.timezone = updates.timezone;
      }

      if (updates.enabled !== undefined) {
        updateData.enabled = updates.enabled;
      }

      if (updates.payload !== undefined) {
        updateData.payload = updates.payload as Prisma.InputJsonValue;
      }

      await db.workflowSchedule.update({
        where: { id: scheduleId },
        data: updateData,
      });

      await executionLogger.info({
        source: "scheduler-engine",
        message: "Schedule updated",
        metadata: { scheduleId, updates },
      });
    } catch (error) {
      await executionLogger.error({
        source: "scheduler-engine",
        message: "Failed to update schedule",
        error: error instanceof Error ? error.message : String(error),
        metadata: { scheduleId, updates },
      });
      throw error;
    }
  }

  /**
   * Delete a schedule
   */
  async deleteSchedule(scheduleId: string): Promise<void> {
    try {
      await db.workflowSchedule.delete({
        where: { id: scheduleId },
      });

      await executionLogger.info({
        source: "scheduler-engine",
        message: "Schedule deleted",
        metadata: { scheduleId },
      });
    } catch (error) {
      await executionLogger.error({
        source: "scheduler-engine",
        message: "Failed to delete schedule",
        error: error instanceof Error ? error.message : String(error),
        metadata: { scheduleId },
      });
      throw error;
    }
  }

  /**
   * Get all schedules for an organization
   */
  async getSchedules(organizationId: string) {
    return db.workflowSchedule.findMany({
      where: { organizationId },
      include: {
        workflow: {
          select: {
            id: true,
            name: true,
            description: true,
            isActive: true,
          },
        },
      },
      orderBy: { nextRunAt: "asc" },
    });
  }

  /**
   * Get schedule by ID
   */
  async getScheduleById(scheduleId: string) {
    return db.workflowSchedule.findUnique({
      where: { id: scheduleId },
      include: {
        workflow: true,
      },
    });
  }

  /**
   * Parse and validate cron expression
   */
  parseCronExpression(cronExpression: string): CronParseResult {
    try {
      // Basic cron format validation: minute hour day month weekday
      const parts = cronExpression.trim().split(/\s+/);

      if (parts.length !== 5) {
        return {
          isValid: false,
          error:
            "Cron expression must have 5 fields: minute hour day month weekday",
        };
      }

      const [minute, hour, day, month, weekday] = parts;

      // Validate each field
      if (!this.validateCronField(minute!, 0, 59, true)) {
        return { isValid: false, error: "Invalid minute field" };
      }
      if (!this.validateCronField(hour!, 0, 23, true)) {
        return { isValid: false, error: "Invalid hour field" };
      }
      if (!this.validateCronField(day!, 1, 31, true)) {
        return { isValid: false, error: "Invalid day field" };
      }
      if (!this.validateCronField(month!, 1, 12, true)) {
        return { isValid: false, error: "Invalid month field" };
      }
      if (!this.validateCronField(weekday!, 0, 6, true)) {
        return { isValid: false, error: "Invalid weekday field" };
      }

      const description = this.describeCronExpression(cronExpression);
      const nextRun = this.calculateNextRun(cronExpression, "UTC");

      return {
        isValid: true,
        nextRun,
        description,
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Validate a single cron field
   */
  private validateCronField(
    field: string,
    min: number,
    max: number,
    allowSpecial: boolean
  ): boolean {
    // Allow wildcards
    if (field === "*") return true;

    // Allow step values (e.g., */5)
    if (field.includes("/")) {
      const [range, step] = field.split("/");
      if (range === "*" && step) {
        const stepNum = parseInt(step, 10);
        return !isNaN(stepNum) && stepNum > 0 && stepNum <= max;
      }
      return false;
    }

    // Allow ranges (e.g., 1-5)
    if (field.includes("-")) {
      const [start, end] = field.split("-");
      const startNum = parseInt(start!, 10);
      const endNum = parseInt(end!, 10);
      return (
        !isNaN(startNum) &&
        !isNaN(endNum) &&
        startNum >= min &&
        endNum <= max &&
        startNum < endNum
      );
    }

    // Allow lists (e.g., 1,3,5)
    if (field.includes(",")) {
      const values = field.split(",");
      return values.every(v => {
        const num = parseInt(v, 10);
        return !isNaN(num) && num >= min && num <= max;
      });
    }

    // Single value
    const num = parseInt(field, 10);
    return !isNaN(num) && num >= min && num <= max;
  }

  /**
   * Generate human-readable description of cron expression
   */
  private describeCronExpression(cronExpression: string): string {
    const parts = cronExpression.split(/\s+/);
    const [minute, hour, day, month, weekday] = parts;

    // Daily at specific time
    if (
      minute !== "*" &&
      hour !== "*" &&
      day === "*" &&
      month === "*" &&
      weekday === "*"
    ) {
      return `Daily at ${hour}:${minute?.padStart(2, "0")}`;
    }

    // Every hour
    if (
      minute !== "*" &&
      hour === "*" &&
      day === "*" &&
      month === "*" &&
      weekday === "*"
    ) {
      return `Every hour at minute ${minute}`;
    }

    // Weekly on specific day
    if (
      minute !== "*" &&
      hour !== "*" &&
      day === "*" &&
      month === "*" &&
      weekday !== "*"
    ) {
      const days = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      const dayName = days[parseInt(weekday!, 10)] ?? weekday;
      return `Weekly on ${dayName} at ${hour}:${minute?.padStart(2, "0")}`;
    }

    // Monthly on specific day
    if (
      minute !== "*" &&
      hour !== "*" &&
      day !== "*" &&
      month === "*" &&
      weekday === "*"
    ) {
      return `Monthly on day ${day} at ${hour}:${minute?.padStart(2, "0")}`;
    }

    return `Custom: ${cronExpression}`;
  }

  /**
   * Calculate next run time based on cron expression
   */
  calculateNextRun(cronExpression: string, timezone: string): Date {
    const now = new Date();
    const parts = cronExpression.split(/\s+/);
    const [minuteStr, hourStr, dayStr, monthStr, weekdayStr] = parts;

    // For simplicity, calculate next run based on current time
    // In production, use a library like node-cron or cron-parser
    const next = new Date(now);

    // Handle simple daily schedules (e.g., "0 9 * * *" = daily at 9:00 AM)
    if (
      dayStr === "*" &&
      monthStr === "*" &&
      weekdayStr === "*" &&
      minuteStr !== "*" &&
      hourStr !== "*"
    ) {
      const targetHour = parseInt(hourStr, 10);
      const targetMinute = parseInt(minuteStr, 10);

      next.setHours(targetHour, targetMinute, 0, 0);

      // If time has passed today, schedule for tomorrow
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }

      return next;
    }

    // Handle hourly schedules (e.g., "30 * * * *" = every hour at :30)
    if (
      hourStr === "*" &&
      dayStr === "*" &&
      monthStr === "*" &&
      weekdayStr === "*" &&
      minuteStr !== "*"
    ) {
      const targetMinute = parseInt(minuteStr, 10);
      next.setMinutes(targetMinute, 0, 0);

      // If time has passed this hour, schedule for next hour
      if (next <= now) {
        next.setHours(next.getHours() + 1);
      }

      return next;
    }

    // Handle weekly schedules (e.g., "0 9 * * 1" = Mondays at 9:00 AM)
    if (
      dayStr === "*" &&
      monthStr === "*" &&
      weekdayStr !== "*" &&
      minuteStr !== "*" &&
      hourStr !== "*"
    ) {
      const targetWeekday = parseInt(weekdayStr, 10);
      const targetHour = parseInt(hourStr, 10);
      const targetMinute = parseInt(minuteStr, 10);

      next.setHours(targetHour, targetMinute, 0, 0);

      // Calculate days until target weekday
      const currentWeekday = next.getDay();
      let daysUntilTarget = targetWeekday - currentWeekday;

      if (daysUntilTarget < 0 || (daysUntilTarget === 0 && next <= now)) {
        daysUntilTarget += 7;
      }

      next.setDate(next.getDate() + daysUntilTarget);
      return next;
    }

    // Handle monthly schedules (e.g., "0 9 1 * *" = 1st of month at 9:00 AM)
    if (
      dayStr !== "*" &&
      monthStr === "*" &&
      weekdayStr === "*" &&
      minuteStr !== "*" &&
      hourStr !== "*"
    ) {
      const targetDay = parseInt(dayStr, 10);
      const targetHour = parseInt(hourStr, 10);
      const targetMinute = parseInt(minuteStr, 10);

      next.setDate(targetDay);
      next.setHours(targetHour, targetMinute, 0, 0);

      // If date has passed this month, schedule for next month
      if (next <= now) {
        next.setMonth(next.getMonth() + 1);
      }

      return next;
    }

    // Default: schedule for next hour
    next.setHours(next.getHours() + 1, 0, 0, 0);
    return next;
  }

  /**
   * Check if a schedule should run now
   */
  shouldRunNow(schedule: {
    nextRunAt: Date | null;
    enabled: boolean;
  }): boolean {
    if (!schedule.enabled || !schedule.nextRunAt) {
      return false;
    }

    const now = new Date();
    return schedule.nextRunAt <= now;
  }

  /**
   * Execute all scheduled workflows that are due
   */
  async executeScheduledWorkflows(): Promise<ScheduleExecutionResult[]> {
    try {
      // Find all enabled schedules that are due to run
      const dueSchedules = await db.workflowSchedule.findMany({
        where: {
          enabled: true,
          nextRunAt: {
            lte: new Date(),
          },
        },
        include: {
          workflow: true,
        },
      });

      await executionLogger.info({
        source: "scheduler-engine",
        message: "Processing scheduled workflows",
        metadata: {
          count: dueSchedules.length,
          schedules: dueSchedules.map(s => ({
            id: s.id,
            workflowId: s.workflowId,
            workflowName: s.workflow.name,
          })),
        },
      });

      const results: ScheduleExecutionResult[] = [];

      // Execute each schedule
      for (const schedule of dueSchedules) {
        const result = await this.executeSchedule(schedule);
        results.push(result);
      }

      return results;
    } catch (error) {
      await executionLogger.error({
        source: "scheduler-engine",
        message: "Failed to execute scheduled workflows",
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Execute a single schedule
   */
  private async executeSchedule(
    schedule: Awaited<
      ReturnType<typeof db.workflowSchedule.findMany>
    >[number] & {
      workflow: NonNullable<
        Awaited<ReturnType<typeof db.workflowSchedule.findUnique>>
      >["workflow"];
    }
  ): Promise<ScheduleExecutionResult> {
    const startTime = Date.now();

    try {
      // Import WorkflowExecutionEngine dynamically to avoid circular dependencies
      const { WorkflowExecutionEngine } = await import("./workflow-engine");
      const engine = new WorkflowExecutionEngine();

      // Create trigger event for scheduled execution
      const triggerEvent = {
        module: "scheduler",
        entityType: "schedule",
        eventType: "scheduled_execution",
        organizationId: schedule.organizationId,
        payload: (schedule.payload as Record<string, unknown>) ?? {},
        triggeredAt: new Date(),
      };

      // Execute the workflow
      const executionResult = await engine.executeWorkflow(
        schedule.workflowId,
        triggerEvent
      );

      // Calculate next run time
      const nextRunAt = this.calculateNextRun(
        schedule.cronExpression,
        schedule.timezone
      );

      // Update schedule with last run and next run times
      await db.workflowSchedule.update({
        where: { id: schedule.id },
        data: {
          lastRunAt: new Date(),
          nextRunAt,
        },
      });

      await executionLogger.info({
        source: "scheduler-engine",
        message: "Schedule executed successfully",
        metadata: {
          scheduleId: schedule.id,
          workflowId: schedule.workflowId,
          executionId: executionResult.executionId,
          duration: Date.now() - startTime,
          nextRunAt: nextRunAt.toISOString(),
        },
      });

      return {
        scheduleId: schedule.id,
        workflowId: schedule.workflowId,
        executionId: executionResult.executionId,
        success: executionResult.success,
        executedAt: new Date(),
        nextRunAt,
      };
    } catch (error) {
      // Calculate next run time even on failure
      const nextRunAt = this.calculateNextRun(
        schedule.cronExpression,
        schedule.timezone
      );

      // Update schedule
      await db.workflowSchedule.update({
        where: { id: schedule.id },
        data: {
          lastRunAt: new Date(),
          nextRunAt,
        },
      });

      await executionLogger.error({
        source: "scheduler-engine",
        message: "Schedule execution failed",
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          scheduleId: schedule.id,
          workflowId: schedule.workflowId,
          duration: Date.now() - startTime,
        },
      });

      return {
        scheduleId: schedule.id,
        workflowId: schedule.workflowId,
        success: false,
        executedAt: new Date(),
        nextRunAt,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Process daily schedules (convenience method)
   */
  async processDailySchedules(): Promise<ScheduleExecutionResult[]> {
    const schedules = await db.workflowSchedule.findMany({
      where: {
        enabled: true,
        cronExpression: {
          contains: "* * *", // Daily pattern
        },
        nextRunAt: {
          lte: new Date(),
        },
      },
      include: {
        workflow: true,
      },
    });

    const results: ScheduleExecutionResult[] = [];
    for (const schedule of schedules) {
      const result = await this.executeSchedule(schedule);
      results.push(result);
    }

    return results;
  }

  /**
   * Process weekly schedules (convenience method)
   */
  async processWeeklySchedules(): Promise<ScheduleExecutionResult[]> {
    const schedules = await db.workflowSchedule.findMany({
      where: {
        enabled: true,
        nextRunAt: {
          lte: new Date(),
        },
      },
      include: {
        workflow: true,
      },
    });

    // Filter for weekly schedules (has specific weekday)
    const weeklySchedules = schedules.filter(s => {
      const parts = s.cronExpression.split(/\s+/);
      return parts[4] !== "*"; // Weekday is specified
    });

    const results: ScheduleExecutionResult[] = [];
    for (const schedule of weeklySchedules) {
      const result = await this.executeSchedule(schedule);
      results.push(result);
    }

    return results;
  }

  /**
   * Process monthly schedules (convenience method)
   */
  async processMonthlySchedules(): Promise<ScheduleExecutionResult[]> {
    const schedules = await db.workflowSchedule.findMany({
      where: {
        enabled: true,
        nextRunAt: {
          lte: new Date(),
        },
      },
      include: {
        workflow: true,
      },
    });

    // Filter for monthly schedules (has specific day of month)
    const monthlySchedules = schedules.filter(s => {
      const parts = s.cronExpression.split(/\s+/);
      return parts[2] !== "*" && parts[4] === "*"; // Day is specified, weekday is not
    });

    const results: ScheduleExecutionResult[] = [];
    for (const schedule of monthlySchedules) {
      const result = await this.executeSchedule(schedule);
      results.push(result);
    }

    return results;
  }

  /**
   * Handle schedule conflicts and overlaps
   * Prevents multiple executions of the same schedule
   */
  async checkScheduleConflicts(
    workflowId: string,
    organizationId: string
  ): Promise<boolean> {
    const existingSchedules = await db.workflowSchedule.findMany({
      where: {
        workflowId,
        organizationId,
        enabled: true,
      },
    });

    return existingSchedules.length > 0;
  }
}
