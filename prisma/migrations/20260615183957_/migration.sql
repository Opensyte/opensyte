/*
  Warnings:

  - A unique constraint covering the columns `[publicToken]` on the table `Invoice` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'en',
ADD COLUMN     "paymentInstructions" TEXT,
ADD COLUMN     "publicToken" TEXT,
ADD COLUMN     "taxEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "taxLabel" TEXT NOT NULL DEFAULT 'Tax',
ADD COLUMN     "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "taxRegistrationId" TEXT;

-- CreateTable
CREATE TABLE "InvoiceSettings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "businessName" TEXT,
    "businessEmail" TEXT,
    "businessPhone" TEXT,
    "businessAddress" TEXT,
    "businessWebsite" TEXT,
    "logoUrl" TEXT,
    "defaultCurrency" TEXT NOT NULL DEFAULT 'USD',
    "defaultLocale" TEXT NOT NULL DEFAULT 'en',
    "defaultTaxEnabled" BOOLEAN NOT NULL DEFAULT true,
    "defaultTaxLabel" TEXT NOT NULL DEFAULT 'Tax',
    "defaultTaxRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "taxRegistrationId" TEXT,
    "defaultPaymentTerms" TEXT NOT NULL DEFAULT 'Net 30',
    "paymentInstructions" TEXT,
    "defaultNotes" TEXT,
    "defaultTermsAndConditions" TEXT,
    "invoicePrefix" TEXT NOT NULL DEFAULT 'INV',
    "invoiceNumberFormat" TEXT NOT NULL DEFAULT '{prefix}-{YYYY}-{seq}',
    "invoiceSequenceNext" INTEGER NOT NULL DEFAULT 1,
    "invoiceSequencePadding" INTEGER NOT NULL DEFAULT 4,
    "emailInvoiceSubject" TEXT,
    "emailInvoiceBody" TEXT,
    "emailReminderSubject" TEXT,
    "emailReminderBody" TEXT,
    "emailReceiptSubject" TEXT,
    "emailReceiptBody" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceSettings_organizationId_key" ON "InvoiceSettings"("organizationId");

-- CreateIndex
CREATE INDEX "InvoiceSettings_organizationId_idx" ON "InvoiceSettings"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_publicToken_key" ON "Invoice"("publicToken");

-- AddForeignKey
ALTER TABLE "InvoiceSettings" ADD CONSTRAINT "InvoiceSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
