-- AlterTable
ALTER TABLE "PrebuiltWorkflowConfig" ADD COLUMN     "messageTemplateId" TEXT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "customerId" TEXT;

-- CreateIndex
CREATE INDEX "PrebuiltWorkflowConfig_messageTemplateId_idx" ON "PrebuiltWorkflowConfig"("messageTemplateId");

-- CreateIndex
CREATE INDEX "Project_customerId_idx" ON "Project"("customerId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
