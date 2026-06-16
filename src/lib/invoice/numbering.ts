// Sequential, customizable, guaranteed-unique invoice numbering.
// The sequence lives on InvoiceSettings and is incremented atomically inside a
// transaction; the @@unique([organizationId, invoiceNumber]) constraint is the
// final safety net against any race.
import type { Prisma } from "@prisma/client";

export interface InvoiceNumberParts {
  prefix: string;
  seq: number;
  padding: number;
  date: Date;
}

/**
 * Expand a numbering format string. Supported tokens:
 *   {prefix} {YYYY} {MM} {seq}
 */
export function formatInvoiceNumber(
  format: string,
  { prefix, seq, padding, date }: InvoiceNumberParts
): string {
  const yyyy = date.getFullYear().toString();
  const mm = (date.getMonth() + 1).toString().padStart(2, "0");
  const seqStr = seq.toString().padStart(Math.max(padding, 1), "0");
  return format
    .replace(/\{prefix\}/g, prefix)
    .replace(/\{YYYY\}/g, yyyy)
    .replace(/\{MM\}/g, mm)
    .replace(/\{seq\}/g, seqStr);
}

/**
 * Reserve and return the next invoice number for an organization.
 * MUST be called inside a db.$transaction so the increment is atomic.
 * Creates default InvoiceSettings on first use.
 */
export async function nextInvoiceNumber(
  tx: Prisma.TransactionClient,
  organizationId: string
): Promise<string> {
  // Atomically reserve a sequence value. On first use the row is created with
  // next=2 (this invoice takes seq 1); thereafter we increment and the value we
  // just consumed is (next - 1).
  const settings = await tx.invoiceSettings.upsert({
    where: { organizationId },
    create: { organizationId, invoiceSequenceNext: 2 },
    update: { invoiceSequenceNext: { increment: 1 } },
  });

  const seq = settings.invoiceSequenceNext - 1;

  return formatInvoiceNumber(settings.invoiceNumberFormat, {
    prefix: settings.invoicePrefix,
    seq,
    padding: settings.invoiceSequencePadding,
    date: new Date(),
  });
}
