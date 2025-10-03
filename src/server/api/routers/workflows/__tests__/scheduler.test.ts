/**
 * Integration tests for Scheduler Router
 */

import { describe, it, expect } from "vitest";
import { schedulerRouter } from "../scheduler";

describe("Scheduler Router", () => {
  describe("createSchedule", () => {
    it("should be defined", () => {
      expect(schedulerRouter.createSchedule).toBeDefined();
    });
  });

  describe("updateSchedule", () => {
    it("should be defined", () => {
      expect(schedulerRouter.updateSchedule).toBeDefined();
    });
  });

  describe("deleteSchedule", () => {
    it("should be defined", () => {
      expect(schedulerRouter.deleteSchedule).toBeDefined();
    });
  });

  describe("getSchedules", () => {
    it("should be defined", () => {
      expect(schedulerRouter.getSchedules).toBeDefined();
    });
  });

  describe("getScheduleById", () => {
    it("should be defined", () => {
      expect(schedulerRouter.getScheduleById).toBeDefined();
    });
  });

  describe("getScheduleHistory", () => {
    it("should be defined", () => {
      expect(schedulerRouter.getScheduleHistory).toBeDefined();
    });
  });

  describe("validateCronExpression", () => {
    it("should be defined", () => {
      expect(schedulerRouter.validateCronExpression).toBeDefined();
    });
  });

  describe("triggerSchedule", () => {
    it("should be defined", () => {
      expect(schedulerRouter.triggerSchedule).toBeDefined();
    });
  });
});
