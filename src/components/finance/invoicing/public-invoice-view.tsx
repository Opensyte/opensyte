"use client";

import { Download } from "lucide-react";
import { InvoicePdfPreview } from "./invoice-pdf-preview";
import type { InvoiceDocumentData } from "./document/invoice-document";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  VIEWED: "Viewed",
  PAID: "Paid",
  PARTIALLY_PAID: "Partially Paid",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
};

interface PublicInvoiceViewProps {
  data: InvoiceDocumentData;
  token: string;
}

// Standalone, fixed light-theme page (independent of the app's dark mode).
export function PublicInvoiceView({ data, token }: PublicInvoiceViewProps) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-100 text-gray-900">
      <header className="flex flex-col gap-3 border-b border-gray-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-gray-900">
            {data.businessName}
          </p>
          <p className="text-sm text-gray-500">
            Invoice {data.invoiceNumber} ·{" "}
            <span className="font-medium">
              {STATUS_LABELS[data.status] ?? data.status}
            </span>
          </p>
        </div>
        <a
          href={`/api/invoices/${token}/pdf?download=1`}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 sm:w-auto"
        >
          <Download className="h-4 w-4" />
          Download PDF
        </a>
      </header>

      <main className="flex-1 p-0 sm:p-6">
        <div className="mx-auto h-[calc(100vh-72px)] w-full max-w-5xl overflow-hidden bg-white sm:h-[calc(100vh-120px)] sm:rounded-lg sm:shadow-sm">
          <InvoicePdfPreview data={data} />
        </div>
      </main>
    </div>
  );
}
