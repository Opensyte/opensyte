-- CreateEnum
CREATE TYPE "TemplateShareMode" AS ENUM ('LINK', 'EMAIL', 'MIXED');

-- CreateEnum
CREATE TYPE "TemplateShareStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED', 'EXHAUSTED');

-- CreateEnum
CREATE TYPE "TemplateShareRecipientStatus" AS ENUM ('PENDING', 'VIEWED', 'IMPORTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "TemplateShareAccessAction" AS ENUM ('PREVIEW', 'IMPORT', 'DOWNLOAD');

-- CreateEnum
CREATE TYPE "TemplateShareAccessStatus" AS ENUM ('SUCCESS', 'BLOCKED', 'EXPIRED', 'REVOKED', 'EXHAUSTED', 'INVALID', 'ERROR');

-- CreateTable
CREATE TABLE "TemplateShare" (
    "id" TEXT NOT NULL,
    "templatePackageId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT,
    "shareMode" "TemplateShareMode" NOT NULL DEFAULT 'LINK',
    "tokenHash" TEXT,
    "expiresAt" TIMESTAMP(3),
    "maxUses" INTEGER,
    "allowExternal" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "status" "TemplateShareStatus" NOT NULL DEFAULT 'ACTIVE',
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastAccessedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedById" TEXT,
    "snapshotData" JSONB NOT NULL,
    "snapshotVersion" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemplateShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateShareRecipient" (
    "id" TEXT NOT NULL,
    "shareId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "TemplateShareRecipientStatus" NOT NULL DEFAULT 'PENDING',
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewedAt" TIMESTAMP(3),
    "importedAt" TIMESTAMP(3),

    CONSTRAINT "TemplateShareRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateShareAccessLog" (
    "id" TEXT NOT NULL,
    "shareId" TEXT NOT NULL,
    "action" "TemplateShareAccessAction" NOT NULL,
    "status" "TemplateShareAccessStatus" NOT NULL,
    "recipientEmail" TEXT,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemplateShareAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateShareImport" (
    "id" TEXT NOT NULL,
    "shareId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "templatePackageId" TEXT NOT NULL,
    "importedById" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "originalPackageId" TEXT NOT NULL,
    "originalOrgId" TEXT NOT NULL,
    "snapshotVersion" TEXT NOT NULL,

    CONSTRAINT "TemplateShareImport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TemplateShare_tokenHash_key" ON "TemplateShare"("tokenHash");

-- CreateIndex
CREATE INDEX "TemplateShare_templatePackageId_idx" ON "TemplateShare"("templatePackageId");

-- CreateIndex
CREATE INDEX "TemplateShare_organizationId_idx" ON "TemplateShare"("organizationId");

-- CreateIndex
CREATE INDEX "TemplateShare_shareMode_idx" ON "TemplateShare"("shareMode");

-- CreateIndex
CREATE INDEX "TemplateShare_status_idx" ON "TemplateShare"("status");

-- CreateIndex
CREATE INDEX "TemplateShare_expiresAt_idx" ON "TemplateShare"("expiresAt");

-- CreateIndex
CREATE INDEX "TemplateShare_createdById_idx" ON "TemplateShare"("createdById");

-- CreateIndex
CREATE INDEX "TemplateShare_tokenHash_idx" ON "TemplateShare"("tokenHash");

-- CreateIndex
CREATE INDEX "TemplateShareRecipient_shareId_idx" ON "TemplateShareRecipient"("shareId");

-- CreateIndex
CREATE INDEX "TemplateShareRecipient_email_idx" ON "TemplateShareRecipient"("email");

-- CreateIndex
CREATE INDEX "TemplateShareRecipient_status_idx" ON "TemplateShareRecipient"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TemplateShareRecipient_shareId_email_key" ON "TemplateShareRecipient"("shareId", "email");

-- CreateIndex
CREATE INDEX "TemplateShareAccessLog_shareId_idx" ON "TemplateShareAccessLog"("shareId");

-- CreateIndex
CREATE INDEX "TemplateShareAccessLog_action_idx" ON "TemplateShareAccessLog"("action");

-- CreateIndex
CREATE INDEX "TemplateShareAccessLog_status_idx" ON "TemplateShareAccessLog"("status");

-- CreateIndex
CREATE INDEX "TemplateShareAccessLog_createdAt_idx" ON "TemplateShareAccessLog"("createdAt");

-- CreateIndex
CREATE INDEX "TemplateShareAccessLog_recipientEmail_idx" ON "TemplateShareAccessLog"("recipientEmail");

-- CreateIndex
CREATE INDEX "TemplateShareImport_shareId_idx" ON "TemplateShareImport"("shareId");

-- CreateIndex
CREATE INDEX "TemplateShareImport_organizationId_idx" ON "TemplateShareImport"("organizationId");

-- CreateIndex
CREATE INDEX "TemplateShareImport_templatePackageId_idx" ON "TemplateShareImport"("templatePackageId");

-- CreateIndex
CREATE INDEX "TemplateShareImport_importedById_idx" ON "TemplateShareImport"("importedById");

-- CreateIndex
CREATE INDEX "TemplateShareImport_originalPackageId_idx" ON "TemplateShareImport"("originalPackageId");

-- AddForeignKey
ALTER TABLE "TemplateShare" ADD CONSTRAINT "TemplateShare_templatePackageId_fkey" FOREIGN KEY ("templatePackageId") REFERENCES "TemplatePackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateShare" ADD CONSTRAINT "TemplateShare_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateShareRecipient" ADD CONSTRAINT "TemplateShareRecipient_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "TemplateShare"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateShareAccessLog" ADD CONSTRAINT "TemplateShareAccessLog_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "TemplateShare"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateShareImport" ADD CONSTRAINT "TemplateShareImport_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "TemplateShare"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateShareImport" ADD CONSTRAINT "TemplateShareImport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateShareImport" ADD CONSTRAINT "TemplateShareImport_templatePackageId_fkey" FOREIGN KEY ("templatePackageId") REFERENCES "TemplatePackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
