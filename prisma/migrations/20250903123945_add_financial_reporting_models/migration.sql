-- CreateEnum
CREATE TYPE "FinancialReportType" AS ENUM ('INCOME_STATEMENT', 'BALANCE_SHEET', 'CASH_FLOW', 'EXPENSE_REPORT', 'PROFIT_LOSS', 'CUSTOM');

-- CreateEnum
CREATE TYPE "FinancialReportStatus" AS ENUM ('DRAFT', 'GENERATING', 'COMPLETED', 'FAILED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "FinancialReportExportFormat" AS ENUM ('PDF', 'EXCEL', 'CSV', 'JSON');

-- CreateEnum
CREATE TYPE "FinancialReportExportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "FinancialReportScheduleFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateTable
CREATE TABLE "FinancialReport" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "FinancialReportType" NOT NULL,
    "template" JSONB NOT NULL,
    "filters" JSONB,
    "dateRange" JSONB NOT NULL,
    "status" "FinancialReportStatus" NOT NULL DEFAULT 'DRAFT',
    "generatedAt" TIMESTAMP(3),
    "generatedBy" TEXT,
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "isScheduled" BOOLEAN NOT NULL DEFAULT false,
    "scheduleConfig" JSONB,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialReportData" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialReportData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialReportExport" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "format" "FinancialReportExportFormat" NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT,
    "fileSize" INTEGER,
    "status" "FinancialReportExportStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialReportExport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialReportSchedule" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "frequency" "FinancialReportScheduleFrequency" NOT NULL,
    "dayOfWeek" INTEGER,
    "dayOfMonth" INTEGER,
    "time" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3) NOT NULL,
    "recipients" JSONB NOT NULL,
    "emailSubject" TEXT,
    "emailBody" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialReportSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinancialReport_organizationId_idx" ON "FinancialReport"("organizationId");

-- CreateIndex
CREATE INDEX "FinancialReport_type_idx" ON "FinancialReport"("type");

-- CreateIndex
CREATE INDEX "FinancialReport_status_idx" ON "FinancialReport"("status");

-- CreateIndex
CREATE INDEX "FinancialReport_createdById_idx" ON "FinancialReport"("createdById");

-- CreateIndex
CREATE INDEX "FinancialReportData_reportId_idx" ON "FinancialReportData"("reportId");

-- CreateIndex
CREATE INDEX "FinancialReportExport_reportId_idx" ON "FinancialReportExport"("reportId");

-- CreateIndex
CREATE INDEX "FinancialReportExport_createdById_idx" ON "FinancialReportExport"("createdById");

-- CreateIndex
CREATE INDEX "FinancialReportExport_status_idx" ON "FinancialReportExport"("status");

-- CreateIndex
CREATE INDEX "FinancialReportSchedule_reportId_idx" ON "FinancialReportSchedule"("reportId");

-- CreateIndex
CREATE INDEX "FinancialReportSchedule_nextRunAt_idx" ON "FinancialReportSchedule"("nextRunAt");

-- CreateIndex
CREATE INDEX "FinancialReportSchedule_isActive_idx" ON "FinancialReportSchedule"("isActive");

-- AddForeignKey
ALTER TABLE "FinancialReport" ADD CONSTRAINT "FinancialReport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialReportData" ADD CONSTRAINT "FinancialReportData_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "FinancialReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialReportExport" ADD CONSTRAINT "FinancialReportExport_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "FinancialReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialReportSchedule" ADD CONSTRAINT "FinancialReportSchedule_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "FinancialReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
