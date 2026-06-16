import * as React from "react";
import { InvoiceEmailLayout, SummaryCard, CtaButton } from "./layout";

export interface ReceiptEmailProps {
  companyName: string;
  logoUrl?: string | null;
  message: string;
  viewUrl: string;
  invoiceNumber: string;
  amountPaid: string;
  balanceDue: string;
  fullyPaid: boolean;
}

export function ReceiptEmail({
  companyName,
  logoUrl,
  message,
  viewUrl,
  invoiceNumber,
  amountPaid,
  balanceDue,
  fullyPaid,
}: ReceiptEmailProps) {
  return (
    <InvoiceEmailLayout
      previewText={`Payment received for invoice ${invoiceNumber}`}
      companyName={companyName}
      logoUrl={logoUrl}
      message={message}
    >
      <SummaryCard
        rows={[
          { label: "Invoice", value: invoiceNumber },
          { label: "Amount received", value: amountPaid, emphasize: true },
          ...(fullyPaid
            ? [{ label: "Status", value: "Paid in full" }]
            : [{ label: "Remaining balance", value: balanceDue }]),
        ]}
      />
      <CtaButton href={viewUrl} label="View Invoice" />
    </InvoiceEmailLayout>
  );
}

export default ReceiptEmail;
