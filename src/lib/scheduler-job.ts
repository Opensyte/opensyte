/**
 * Scheduler Background Job
 *
 * Runs scheduled workflows at specified intervals.
 * This can be executed as a cron job or background worker.
 */

import { SchedulerEngine } from "./scheduler-engine";
import { executionLogger } from "./services/execution-logger";

export interface SchedulerJobConfig {
  intervalMs: number; // How often to check for due schedules (default: 60000 = 1 minute)
  maxConcurrentExecutions: number; // Max workflows to execute concurrently (default: 5)
  retryAttempts: number; // Number of retry attempts on failure (default: 3)
  retryDelayMs: number; // Delay between retries (default: 5000 = 5 seconds)
}

export interface JobExecutionStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageDuration: number;
  lastRunAt: Date;
}

/**
 * Scheduler Job Runner
 */
export class SchedulerJob {
  private engine: SchedulerEngine;
  private config: SchedulerJobConfig;
  private isRunning = false;
  private intervalId?: NodeJS.Timeout;
  private stats: JobExecutionStats = {
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    averageDuration: 0,
    lastRunAt: new Date(),
  };
  private executionQueue: Set<string> = new Set();

  constructor(config?: Partial<SchedulerJobConfig>) {
    this.engine = new SchedulerEngine();
    this.config = {
      intervalMs: config?.intervalMs ?? 60000, // 1 minute
      maxConcurrentExecutions: config?.maxConcurrentExecutions ?? 5,
      retryAttempts: config?.retryAttempts ?? 3,
      retryDelayMs: config?.retryDelayMs ?? 5000, // 5 seconds
    };
  }

  /**
   * Start the scheduler job
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      await executionLogger.warn({
        source: "scheduler-job",
        message: "Scheduler job is already running",
      });
      return;
    }

    this.isRunning = true;

    await executionLogger.info({
      source: "scheduler-job",
      message: "Starting scheduler job",
      metadata: {
        intervalMs: this.config.intervalMs,
        maxConcurrentExecutions: this.config.maxConcurrentExecutions,
      },
    });

    // Run immediately on start
    await this.runScheduledWorkflows();

    // Set up interval for periodic execution
    this.intervalId = setInterval(() => {
      void this.runScheduledWorkflows();
    }, this.config.intervalMs);
  }

  /**
   * Stop the scheduler job
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    // Wait for any in-progress executions to complete
    while (this.executionQueue.size > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    await executionLogger.info({
      source: "scheduler-job",
      message: "Scheduler job stopped",
      metadata: {
        stats: this.stats,
      },
    });
  }

  /**
   * Run scheduled workflows
   */
  private async runScheduledWorkflows(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    const startTime = Date.now();

    try {
      await executionLogger.info({
        source: "scheduler-job",
        message: "Checking for scheduled workflows",
      });

      // Check if we're at max concurrent executions
      if (this.executionQueue.size >= this.config.maxConcurrentExecutions) {
        await executionLogger.warn({
          source: "scheduler-job",
          message: "Max concurrent executions reached, skipping this run",
          metadata: {
            queueSize: this.executionQueue.size,
            maxConcurrent: this.config.maxConcurrentExecutions,
          },
        });
        return;
      }

      // Execute scheduled workflows
      const results = await this.executeWithRetry(
        () => this.engine.executeScheduledWorkflows(),
        this.config.retryAttempts
      );

      // Update stats
      this.stats.totalExecutions += results.length;
      this.stats.successfulExecutions += results.filter(r => r.success).length;
      this.stats.failedExecutions += results.filter(r => !r.success).length;
      this.stats.lastRunAt = new Date();

      const duration = Date.now() - startTime;
      this.stats.averageDuration =
        (this.stats.averageDuration *
          (this.stats.totalExecutions - results.length) +
          duration) /
        this.stats.totalExecutions;

      await executionLogger.info({
        source: "scheduler-job",
        message: "Scheduled workflows executed",
        metadata: {
          count: results.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
          duration,
        },
      });

      // Log any failures
      for (const result of results.filter(r => !r.success)) {
        await executionLogger.error({
          source: "scheduler-job",
          message: "Scheduled workflow execution failed",
          error: result.error ?? "Unknown error",
          metadata: {
            scheduleId: result.scheduleId,
            workflowId: result.workflowId,
          },
        });
      }
    } catch (error) {
      await executionLogger.error({
        source: "scheduler-job",
        message: "Failed to run scheduled workflows",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Execute a function with retry logic
   */
  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    maxAttempts: number
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxAttempts) {
          await executionLogger.warn({
            source: "scheduler-job",
            message: `Execution failed, retrying (attempt ${attempt}/${maxAttempts})`,
            error: lastError.message,
          });

          // Wait before retrying
          await new Promise(resolve =>
            setTimeout(resolve, this.config.retryDelayMs)
          );
        }
      }
    }

    throw lastError ?? new Error("Execution failed after all retry attempts");
  }

  /**
   * Get current job statistics
   */
  getStats(): JobExecutionStats {
    return { ...this.stats };
  }

  /**
   * Get job status
   */
  getStatus(): {
    isRunning: boolean;
    queueSize: number;
    stats: JobExecutionStats;
  } {
    return {
      isRunning: this.isRunning,
      queueSize: this.executionQueue.size,
      stats: this.getStats(),
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageDuration: 0,
      lastRunAt: new Date(),
    };
  }
}

// Singleton instance for the scheduler job
let schedulerJobInstance: SchedulerJob | null = null;

/**
 * Get or create the scheduler job instance
 */
export function getSchedulerJob(
  config?: Partial<SchedulerJobConfig>
): SchedulerJob {
  if (!schedulerJobInstance) {
    schedulerJobInstance = new SchedulerJob(config);
  }
  return schedulerJobInstance;
}

/**
 * Start the scheduler job (convenience function)
 */
export async function startSchedulerJob(
  config?: Partial<SchedulerJobConfig>
): Promise<SchedulerJob> {
  const job = getSchedulerJob(config);
  await job.start();
  return job;
}

/**
 * Stop the scheduler job (convenience function)
 */
export async function stopSchedulerJob(): Promise<void> {
  if (schedulerJobInstance) {
    await schedulerJobInstance.stop();
  }
}
