-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WorkflowNodeType" ADD VALUE 'QUERY';
ALTER TYPE "WorkflowNodeType" ADD VALUE 'FILTER';
ALTER TYPE "WorkflowNodeType" ADD VALUE 'SCHEDULE';

-- CreateTable
CREATE TABLE "WorkflowSchedule" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "cron" TEXT,
    "frequency" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkflowSchedule_workflowId_idx" ON "WorkflowSchedule"("workflowId");

-- CreateIndex
CREATE INDEX "WorkflowSchedule_nextRunAt_idx" ON "WorkflowSchedule"("nextRunAt");

-- CreateIndex
CREATE INDEX "WorkflowSchedule_isActive_idx" ON "WorkflowSchedule"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowSchedule_nodeId_key" ON "WorkflowSchedule"("nodeId");

-- AddForeignKey
ALTER TABLE "WorkflowSchedule" ADD CONSTRAINT "WorkflowSchedule_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowSchedule" ADD CONSTRAINT "WorkflowSchedule_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "WorkflowNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
