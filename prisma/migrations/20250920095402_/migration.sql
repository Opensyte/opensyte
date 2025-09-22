-- AlterTable
ALTER TABLE "TemplateInstallation" ALTER COLUMN "templatePackageId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "EarlyAccessCode" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "usedById" TEXT,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EarlyAccessCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EarlyAccessCode_email_key" ON "EarlyAccessCode"("email");

-- CreateIndex
CREATE UNIQUE INDEX "EarlyAccessCode_code_key" ON "EarlyAccessCode"("code");

-- CreateIndex
CREATE INDEX "EarlyAccessCode_email_idx" ON "EarlyAccessCode"("email");

-- CreateIndex
CREATE INDEX "EarlyAccessCode_code_idx" ON "EarlyAccessCode"("code");

-- CreateIndex
CREATE INDEX "EarlyAccessCode_isUsed_idx" ON "EarlyAccessCode"("isUsed");
