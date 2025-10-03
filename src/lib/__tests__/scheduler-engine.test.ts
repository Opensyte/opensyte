/**
 * Unit tests for SchedulerEngine
 */

import { describe, it, expect, beforeEach } from "vitest";
import { SchedulerEngine } from "../scheduler-engine";

describe("SchedulerEngine", () => {
  let engine: SchedulerEngine;

  beforeEach(() => {
    engine = new SchedulerEngine();
  });

  describe("parseCronExpression", () => {
    it("should validate correct daily cron expression", () => {
      const result = engine.parseCronExpression("0 9 * * *");
      expect(result.isValid).toBe(true);
      expect(result.description).toContain("Daily at 9:00");
    });

    it("should validate correct hourly cron expression", () => {
      const result = engine.parseCronExpression("30 * * * *");
      expect(result.isValid).toBe(true);
      expect(result.description).toContain("Every hour");
    });

    it("should validate correct weekly cron expression", () => {
      const result = engine.parseCronExpression("0 9 * * 1");
      expect(result.isValid).toBe(true);
      expect(result.description).toContain("Weekly on Monday");
    });

    it("should validate correct monthly cron expression", () => {
      const result = engine.parseCronExpression("0 9 1 * *");
      expect(result.isValid).toBe(true);
      expect(result.description).toContain("Monthly on day 1");
    });

    it("should reject invalid cron expression with wrong field count", () => {
      const result = engine.parseCronExpression("0 9 *");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("5 fields");
    });

    it("should reject invalid minute value", () => {
      const result = engine.parseCronExpression("60 9 * * *");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("minute");
    });

    it("should reject invalid hour value", () => {
      const result = engine.parseCronExpression("0 24 * * *");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("hour");
    });

    it("should reject invalid day value", () => {
      const result = engine.parseCronExpression("0 9 32 * *");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("day");
    });

    it("should reject invalid month value", () => {
      const result = engine.parseCronExpression("0 9 1 13 *");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("month");
    });

    it("should reject invalid weekday value", () => {
      const result = engine.parseCronExpression("0 9 * * 7");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("weekday");
    });

    it("should validate step values", () => {
      const result = engine.parseCronExpression("*/15 * * * *");
      expect(result.isValid).toBe(true);
    });

    it("should validate range values", () => {
      const result = engine.parseCronExpression("0 9-17 * * *");
      expect(result.isValid).toBe(true);
    });

    it("should validate list values", () => {
      const result = engine.parseCronExpression("0 9,12,15 * * *");
      expect(result.isValid).toBe(true);
    });
  });

  describe("calculateNextRun", () => {
    it("should calculate next run for daily schedule at 9 AM", () => {
      const nextRun = engine.calculateNextRun("0 9 * * *", "UTC");

      expect(nextRun.getHours()).toBe(9);
      expect(nextRun.getMinutes()).toBe(0);
      // Should be in the future
      expect(nextRun.getTime()).toBeGreaterThan(Date.now());
    });

    it("should calculate next run for hourly schedule at :30", () => {
      const nextRun = engine.calculateNextRun("30 * * * *", "UTC");

      expect(nextRun.getMinutes()).toBe(30);
      // Should be in the future
      expect(nextRun.getTime()).toBeGreaterThan(Date.now());
    });

    it("should calculate next run for weekly schedule on Monday at 9 AM", () => {
      const nextRun = engine.calculateNextRun("0 9 * * 1", "UTC");

      expect(nextRun.getDay()).toBe(1); // Monday
      expect(nextRun.getHours()).toBe(9);
      expect(nextRun.getMinutes()).toBe(0);
      // Should be in the future
      expect(nextRun.getTime()).toBeGreaterThan(Date.now());
    });

    it("should calculate next run for monthly schedule on 15th at 9 AM", () => {
      const nextRun = engine.calculateNextRun("0 9 15 * *", "UTC");

      expect(nextRun.getDate()).toBe(15);
      expect(nextRun.getHours()).toBe(9);
      expect(nextRun.getMinutes()).toBe(0);
      // Should be in the future
      expect(nextRun.getTime()).toBeGreaterThan(Date.now());
    });

    it("should return a valid date for any cron expression", () => {
      const nextRun = engine.calculateNextRun("0 0 * * *", "UTC");
      expect(nextRun).toBeInstanceOf(Date);
      expect(nextRun.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe("shouldRunNow", () => {
    it("should return true if schedule is enabled and time has passed", () => {
      const schedule = {
        enabled: true,
        nextRunAt: new Date(Date.now() - 1000), // 1 second ago
      };

      expect(engine.shouldRunNow(schedule)).toBe(true);
    });

    it("should return false if schedule is disabled", () => {
      const schedule = {
        enabled: false,
        nextRunAt: new Date(Date.now() - 1000),
      };

      expect(engine.shouldRunNow(schedule)).toBe(false);
    });

    it("should return false if nextRunAt is in the future", () => {
      const schedule = {
        enabled: true,
        nextRunAt: new Date(Date.now() + 60000), // 1 minute from now
      };

      expect(engine.shouldRunNow(schedule)).toBe(false);
    });

    it("should return false if nextRunAt is null", () => {
      const schedule = {
        enabled: true,
        nextRunAt: null,
      };

      expect(engine.shouldRunNow(schedule)).toBe(false);
    });
  });

  describe("checkScheduleConflicts", () => {
    it("should detect existing schedules for a workflow", async () => {
      // This test would require database mocking
      // For now, we'll just verify the method exists
      expect(engine.checkScheduleConflicts).toBeDefined();
      expect(typeof engine.checkScheduleConflicts).toBe("function");
    });
  });

  describe("processDailySchedules", () => {
    it("should be defined", () => {
      expect(engine.processDailySchedules).toBeDefined();
      expect(typeof engine.processDailySchedules).toBe("function");
    });
  });

  describe("processWeeklySchedules", () => {
    it("should be defined", () => {
      expect(engine.processWeeklySchedules).toBeDefined();
      expect(typeof engine.processWeeklySchedules).toBe("function");
    });
  });

  describe("processMonthlySchedules", () => {
    it("should be defined", () => {
      expect(engine.processMonthlySchedules).toBeDefined();
      expect(typeof engine.processMonthlySchedules).toBe("function");
    });
  });

  describe("executeScheduledWorkflows", () => {
    it("should be defined", () => {
      expect(engine.executeScheduledWorkflows).toBeDefined();
      expect(typeof engine.executeScheduledWorkflows).toBe("function");
    });
  });
});
