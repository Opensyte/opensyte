-- CreateTable
CREATE TABLE "PrebuiltWorkflowConfig" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "workflowKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "emailSubject" TEXT NOT NULL,
    "emailBody" TEXT NOT NULL,
    "templateVersion" INTEGER NOT NULL DEFAULT 1,
    "updatedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrebuiltWorkflowConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PrebuiltWorkflowConfig_organizationId_idx" ON "PrebuiltWorkflowConfig"("organizationId");

-- CreateIndex
CREATE INDEX "PrebuiltWorkflowConfig_workflowKey_idx" ON "PrebuiltWorkflowConfig"("workflowKey");

-- CreateIndex
CREATE UNIQUE INDEX "PrebuiltWorkflowConfig_organizationId_workflowKey_key" ON "PrebuiltWorkflowConfig"("organizationId", "workflowKey");

-- AddForeignKey
ALTER TABLE "PrebuiltWorkflowConfig" ADD CONSTRAINT "PrebuiltWorkflowConfig_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrebuiltWorkflowConfig" ADD CONSTRAINT "PrebuiltWorkflowConfig_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
