-- CreateEnum
CREATE TYPE "AuditPackageStatus" AS ENUM ('DRAFT', 'PROCESSING', 'REVIEW', 'COMPLETED', 'EXPORTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AuditDocumentType" AS ENUM ('RECEIPT', 'INVOICE', 'BANK_STATEMENT', 'CONTRACT', 'PURCHASE_ORDER', 'PAYMENT_CONFIRMATION', 'TAX_DOCUMENT', 'EXPENSE_REPORT', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "AuditDocumentStatus" AS ENUM ('PENDING', 'PROCESSING', 'CLASSIFIED', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AuditExportFormat" AS ENUM ('CSV', 'JSON', 'ZIP');

-- CreateEnum
CREATE TYPE "AuditExportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "PersonalizedViewType" AS ENUM ('FOUNDER_DASHBOARD', 'CFO_DASHBOARD', 'ACCOUNTANT_DASHBOARD', 'MANAGER_DASHBOARD', 'SALES_DASHBOARD', 'HR_DASHBOARD');

-- CreateEnum
CREATE TYPE "AIInsightType" AS ENUM ('ANOMALY_DETECTION', 'TREND_ANALYSIS', 'PREDICTION', 'RECOMMENDATION', 'ALERT', 'OPPORTUNITY');

-- CreateEnum
CREATE TYPE "AIInsightPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AIInsightStatus" AS ENUM ('ACTIVE', 'DISMISSED', 'RESOLVED', 'EXPIRED');

-- CreateTable
CREATE TABLE "AuditPackage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "dateRange" JSONB NOT NULL,
    "status" "AuditPackageStatus" NOT NULL DEFAULT 'DRAFT',
    "totalTransactions" INTEGER NOT NULL DEFAULT 0,
    "totalDocuments" INTEGER NOT NULL DEFAULT 0,
    "riskScore" DOUBLE PRECISION,
    "generatedAt" TIMESTAMP(3),
    "exportedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditDocument" (
    "id" TEXT NOT NULL,
    "auditPackageId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "classification" "AuditDocumentType" NOT NULL,
    "aiClassification" JSONB,
    "confidence" DOUBLE PRECISION,
    "linkedTransactions" JSONB,
    "extractedData" JSONB,
    "status" "AuditDocumentStatus" NOT NULL DEFAULT 'PENDING',
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditTrail" (
    "id" TEXT NOT NULL,
    "auditPackageId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "changes" JSONB,
    "performedById" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,

    CONSTRAINT "AuditTrail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditApproval" (
    "id" TEXT NOT NULL,
    "auditPackageId" TEXT NOT NULL,
    "approverType" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL,
    "comments" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "digitalSignature" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditExport" (
    "id" TEXT NOT NULL,
    "auditPackageId" TEXT NOT NULL,
    "format" "AuditExportFormat" NOT NULL DEFAULT 'CSV',
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT,
    "fileSize" INTEGER,
    "status" "AuditExportStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "exportType" TEXT NOT NULL,
    "exportedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AuditExport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalizedView" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "viewType" "PersonalizedViewType" NOT NULL,
    "configuration" JSONB NOT NULL,
    "metrics" JSONB,
    "insights" JSONB,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "preferences" JSONB,

    CONSTRAINT "PersonalizedView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIInsight" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "type" "AIInsightType" NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "priority" "AIInsightPriority" NOT NULL,
    "data" JSONB NOT NULL,
    "recommendations" JSONB,
    "status" "AIInsightStatus" NOT NULL DEFAULT 'ACTIVE',
    "dismissedAt" TIMESTAMP(3),
    "dismissedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "AIInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBehavior" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionId" TEXT,

    CONSTRAINT "UserBehavior_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditPackage_organizationId_idx" ON "AuditPackage"("organizationId");

-- CreateIndex
CREATE INDEX "AuditPackage_status_idx" ON "AuditPackage"("status");

-- CreateIndex
CREATE INDEX "AuditPackage_createdById_idx" ON "AuditPackage"("createdById");

-- CreateIndex
CREATE INDEX "AuditDocument_auditPackageId_idx" ON "AuditDocument"("auditPackageId");

-- CreateIndex
CREATE INDEX "AuditDocument_classification_idx" ON "AuditDocument"("classification");

-- CreateIndex
CREATE INDEX "AuditDocument_status_idx" ON "AuditDocument"("status");

-- CreateIndex
CREATE INDEX "AuditTrail_auditPackageId_idx" ON "AuditTrail"("auditPackageId");

-- CreateIndex
CREATE INDEX "AuditTrail_entityType_entityId_idx" ON "AuditTrail"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditTrail_performedById_idx" ON "AuditTrail"("performedById");

-- CreateIndex
CREATE INDEX "AuditTrail_performedAt_idx" ON "AuditTrail"("performedAt");

-- CreateIndex
CREATE INDEX "AuditApproval_auditPackageId_idx" ON "AuditApproval"("auditPackageId");

-- CreateIndex
CREATE INDEX "AuditApproval_approverId_idx" ON "AuditApproval"("approverId");

-- CreateIndex
CREATE INDEX "AuditApproval_status_idx" ON "AuditApproval"("status");

-- CreateIndex
CREATE INDEX "AuditExport_auditPackageId_idx" ON "AuditExport"("auditPackageId");

-- CreateIndex
CREATE INDEX "AuditExport_status_idx" ON "AuditExport"("status");

-- CreateIndex
CREATE INDEX "AuditExport_exportedById_idx" ON "AuditExport"("exportedById");

-- CreateIndex
CREATE INDEX "PersonalizedView_userId_idx" ON "PersonalizedView"("userId");

-- CreateIndex
CREATE INDEX "PersonalizedView_organizationId_idx" ON "PersonalizedView"("organizationId");

-- CreateIndex
CREATE INDEX "PersonalizedView_viewType_idx" ON "PersonalizedView"("viewType");

-- CreateIndex
CREATE UNIQUE INDEX "PersonalizedView_userId_organizationId_viewType_key" ON "PersonalizedView"("userId", "organizationId", "viewType");

-- CreateIndex
CREATE INDEX "AIInsight_organizationId_idx" ON "AIInsight"("organizationId");

-- CreateIndex
CREATE INDEX "AIInsight_userId_idx" ON "AIInsight"("userId");

-- CreateIndex
CREATE INDEX "AIInsight_type_idx" ON "AIInsight"("type");

-- CreateIndex
CREATE INDEX "AIInsight_status_idx" ON "AIInsight"("status");

-- CreateIndex
CREATE INDEX "AIInsight_priority_idx" ON "AIInsight"("priority");

-- CreateIndex
CREATE INDEX "UserBehavior_userId_organizationId_idx" ON "UserBehavior"("userId", "organizationId");

-- CreateIndex
CREATE INDEX "UserBehavior_module_idx" ON "UserBehavior"("module");

-- CreateIndex
CREATE INDEX "UserBehavior_timestamp_idx" ON "UserBehavior"("timestamp");

-- CreateIndex
CREATE INDEX "UserBehavior_sessionId_idx" ON "UserBehavior"("sessionId");

-- AddForeignKey
ALTER TABLE "AuditPackage" ADD CONSTRAINT "AuditPackage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditDocument" ADD CONSTRAINT "AuditDocument_auditPackageId_fkey" FOREIGN KEY ("auditPackageId") REFERENCES "AuditPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditTrail" ADD CONSTRAINT "AuditTrail_auditPackageId_fkey" FOREIGN KEY ("auditPackageId") REFERENCES "AuditPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditApproval" ADD CONSTRAINT "AuditApproval_auditPackageId_fkey" FOREIGN KEY ("auditPackageId") REFERENCES "AuditPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditExport" ADD CONSTRAINT "AuditExport_auditPackageId_fkey" FOREIGN KEY ("auditPackageId") REFERENCES "AuditPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalizedView" ADD CONSTRAINT "PersonalizedView_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIInsight" ADD CONSTRAINT "AIInsight_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBehavior" ADD CONSTRAINT "UserBehavior_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
