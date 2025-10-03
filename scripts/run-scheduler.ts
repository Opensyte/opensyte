#!/usr/bin/env bun

/**
 * Scheduler Job Runner Script
 *
 * Run this script to start the scheduler background job:
 * bun run scripts/run-scheduler.ts
 */

import { startSchedulerJob, stopSchedulerJob } from "../src/lib/scheduler-job";

async function main() {
  console.log("🚀 Starting OpenSyte Scheduler Job...");

  // Configuration from environment variables
  const config = {
    intervalMs: parseInt(process.env.SCHEDULER_INTERVAL_MS ?? "60000", 10),
    maxConcurrentExecutions: parseInt(
      process.env.SCHEDULER_MAX_CONCURRENT ?? "5",
      10
    ),
    retryAttempts: parseInt(process.env.SCHEDULER_RETRY_ATTEMPTS ?? "3", 10),
    retryDelayMs: parseInt(process.env.SCHEDULER_RETRY_DELAY_MS ?? "5000", 10),
  };

  console.log("Configuration:", config);

  try {
    const job = await startSchedulerJob(config);

    console.log("✅ Scheduler job started successfully");
    console.log("Press Ctrl+C to stop");

    // Handle graceful shutdown
    process.on("SIGINT", async () => {
      console.log("\n🛑 Stopping scheduler job...");
      await stopSchedulerJob();
      console.log("✅ Scheduler job stopped");
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      console.log("\n🛑 Stopping scheduler job...");
      await stopSchedulerJob();
      console.log("✅ Scheduler job stopped");
      process.exit(0);
    });

    // Log stats every 5 minutes
    setInterval(
      () => {
        const stats = job.getStats();
        console.log("\n📊 Scheduler Stats:", {
          totalExecutions: stats.totalExecutions,
          successfulExecutions: stats.successfulExecutions,
          failedExecutions: stats.failedExecutions,
          averageDuration: `${stats.averageDuration.toFixed(2)}ms`,
          lastRunAt: stats.lastRunAt.toISOString(),
        });
      },
      5 * 60 * 1000
    );
  } catch (error) {
    console.error("❌ Failed to start scheduler job:", error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error("❌ Unhandled error:", error);
  process.exit(1);
});
