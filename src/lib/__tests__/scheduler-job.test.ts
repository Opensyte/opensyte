/**
 * Unit tests for SchedulerJob
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SchedulerJob } from "../scheduler-job";

describe("SchedulerJob", () => {
  let job: SchedulerJob;

  beforeEach(() => {
    job = new SchedulerJob({
      intervalMs: 1000, // 1 second for testing
      maxConcurrentExecutions: 2,
      retryAttempts: 2,
      retryDelayMs: 100,
    });
  });

  afterEach(async () => {
    await job.stop();
  });

  describe("initialization", () => {
    it("should create a scheduler job instance", () => {
      expect(job).toBeDefined();
      expect(job).toBeInstanceOf(SchedulerJob);
    });

    it("should have default stats", () => {
      const stats = job.getStats();
      expect(stats.totalExecutions).toBe(0);
      expect(stats.successfulExecutions).toBe(0);
      expect(stats.failedExecutions).toBe(0);
      expect(stats.averageDuration).toBe(0);
    });
  });

  describe("getStatus", () => {
    it("should return job status", () => {
      const status = job.getStatus();
      expect(status).toHaveProperty("isRunning");
      expect(status).toHaveProperty("queueSize");
      expect(status).toHaveProperty("stats");
      expect(status.isRunning).toBe(false);
    });
  });

  describe("resetStats", () => {
    it("should reset statistics", () => {
      job.resetStats();
      const stats = job.getStats();
      expect(stats.totalExecutions).toBe(0);
      expect(stats.successfulExecutions).toBe(0);
      expect(stats.failedExecutions).toBe(0);
    });
  });

  describe("start and stop", () => {
    it("should start the job", async () => {
      await job.start();
      const status = job.getStatus();
      expect(status.isRunning).toBe(true);
    });

    it("should stop the job", async () => {
      await job.start();
      await job.stop();
      const status = job.getStatus();
      expect(status.isRunning).toBe(false);
    });

    it("should not start if already running", async () => {
      await job.start();
      await job.start(); // Should not throw
      const status = job.getStatus();
      expect(status.isRunning).toBe(true);
    });
  });
});
