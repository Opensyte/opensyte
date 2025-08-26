/*
  Warnings:

  - You are about to drop the column `customerName` on the `Invoice` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Invoice" DROP COLUMN "customerName",
ALTER COLUMN "customerEmail" DROP NOT NULL;
