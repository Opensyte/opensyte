-- CreateEnum
CREATE TYPE "ImportModule" AS ENUM ('CRM', 'HR', 'FINANCE', 'PROJECTS');

-- CreateEnum
CREATE TYPE "ImportEntityType" AS ENUM ('CONTACT', 'ORGANIZATION', 'DEAL');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('DRAFT', 'UPLOADING', 'DETECTING', 'MAPPING_REVIEW', 'VALIDATING', 'VALIDATION_FAILED', 'READY_TO_IMPORT', 'IMPORTING', 'COMPLETED', 'IMPORT_FAILED', 'CANCELLED', 'RETRY_QUEUED');

-- CreateEnum
CREATE TYPE "DedupeMode" AS ENUM ('SKIP', 'UPDATE', 'CREATE');

-- CreateEnum
CREATE TYPE "RowStatus" AS ENUM ('PENDING', 'VALIDATED', 'IMPORTED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "IssueSeverity" AS ENUM ('ERROR', 'WARNING');

-- CreateTable
CREATE TABLE "ImportSession" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileType" TEXT,
    "module" "ImportModule" NOT NULL,
    "entityType" "ImportEntityType" NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'DRAFT',
    "dedupeMode" "DedupeMode" NOT NULL DEFAULT 'SKIP',
    "mappingConfig" JSONB,
    "summary" JSONB,
    "rowCount" INTEGER,
    "processedCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "appliedTemplateId" TEXT,

    CONSTRAINT "ImportSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "module" "ImportModule" NOT NULL,
    "entityType" "ImportEntityType" NOT NULL,
    "mappingConfig" JSONB NOT NULL,
    "columnSignature" JSONB NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportRow" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "rawData" JSONB NOT NULL,
    "mappedData" JSONB,
    "status" "RowStatus" NOT NULL DEFAULT 'PENDING',
    "dedupeHint" TEXT,
    "score" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportRowIssue" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "rowId" TEXT NOT NULL,
    "field" TEXT,
    "severity" "IssueSeverity" NOT NULL,
    "message" TEXT NOT NULL,
    "hint" TEXT,
    "value" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportRowIssue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImportSession_organizationId_idx" ON "ImportSession"("organizationId");

-- CreateIndex
CREATE INDEX "ImportSession_status_idx" ON "ImportSession"("status");

-- CreateIndex
CREATE INDEX "ImportSession_createdByUserId_idx" ON "ImportSession"("createdByUserId");

-- CreateIndex
CREATE INDEX "ImportSession_appliedTemplateId_idx" ON "ImportSession"("appliedTemplateId");

-- CreateIndex
CREATE INDEX "ImportTemplate_organizationId_idx" ON "ImportTemplate"("organizationId");

-- CreateIndex
CREATE INDEX "ImportTemplate_module_entityType_idx" ON "ImportTemplate"("module", "entityType");

-- CreateIndex
CREATE INDEX "ImportTemplate_createdByUserId_idx" ON "ImportTemplate"("createdByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ImportTemplate_organizationId_name_key" ON "ImportTemplate"("organizationId", "name");

-- CreateIndex
CREATE INDEX "ImportRow_sessionId_idx" ON "ImportRow"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "ImportRow_sessionId_rowNumber_key" ON "ImportRow"("sessionId", "rowNumber");

-- CreateIndex
CREATE INDEX "ImportRowIssue_sessionId_idx" ON "ImportRowIssue"("sessionId");

-- CreateIndex
CREATE INDEX "ImportRowIssue_rowId_idx" ON "ImportRowIssue"("rowId");

-- AddForeignKey
ALTER TABLE "ImportSession" ADD CONSTRAINT "ImportSession_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportSession" ADD CONSTRAINT "ImportSession_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportSession" ADD CONSTRAINT "ImportSession_appliedTemplateId_fkey" FOREIGN KEY ("appliedTemplateId") REFERENCES "ImportTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportTemplate" ADD CONSTRAINT "ImportTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportTemplate" ADD CONSTRAINT "ImportTemplate_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRow" ADD CONSTRAINT "ImportRow_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ImportSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRowIssue" ADD CONSTRAINT "ImportRowIssue_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ImportSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRowIssue" ADD CONSTRAINT "ImportRowIssue_rowId_fkey" FOREIGN KEY ("rowId") REFERENCES "ImportRow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
