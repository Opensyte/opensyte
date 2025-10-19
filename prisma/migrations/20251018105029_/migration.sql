-- CreateTable
CREATE TABLE "PrebuiltWorkflowRun" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "workflowKey" TEXT NOT NULL,
    "status" "WorkflowExecutionStatus" NOT NULL DEFAULT 'RUNNING',
    "triggerModule" TEXT NOT NULL,
    "triggerEntity" TEXT NOT NULL,
    "triggerEvent" TEXT NOT NULL,
    "triggeredAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "emailRecipient" TEXT,
    "emailSubject" TEXT,
    "context" JSONB,
    "result" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrebuiltWorkflowRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PrebuiltWorkflowRun_organizationId_workflowKey_createdAt_idx" ON "PrebuiltWorkflowRun"("organizationId", "workflowKey", "createdAt");

-- CreateIndex
CREATE INDEX "PrebuiltWorkflowRun_organizationId_idx" ON "PrebuiltWorkflowRun"("organizationId");

-- AddForeignKey
ALTER TABLE "PrebuiltWorkflowRun" ADD CONSTRAINT "PrebuiltWorkflowRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
