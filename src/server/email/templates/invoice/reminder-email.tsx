import * as React from "react";
import { InvoiceEmailLayout, SummaryCard, CtaButton } from "./layout";

export interface ReminderEmailProps {
  companyName: string;
  logoUrl?: string | null;
  message: string;
  viewUrl: string;
  invoiceNumber: string;
  amountDue: string;
  dueDate: string;
}

export function ReminderEmail({
  companyName,
  logoUrl,
  message,
  viewUrl,
  invoiceNumber,
  amountDue,
  dueDate,
}: ReminderEmailProps) {
  return (
    <InvoiceEmailLayout
      previewText={`Reminder: invoice ${invoiceNumber} — ${amountDue} due ${dueDate}`}
      companyName={companyName}
      logoUrl={logoUrl}
      message={message}
    >
      <SummaryCard
        rows={[
          { label: "Invoice", value: invoiceNumber },
          { label: "Due date", value: dueDate },
          { label: "Amount due", value: amountDue, emphasize: true },
        ]}
      />
      <CtaButton href={viewUrl} label="View Invoice" />
    </InvoiceEmailLayout>
  );
}

export default ReminderEmail;
