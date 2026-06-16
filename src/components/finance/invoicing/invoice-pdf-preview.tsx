"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import {
  InvoiceDocument,
  type InvoiceDocumentData,
} from "./document/invoice-document";

// @react-pdf's PDFViewer is browser-only — load it lazily with SSR disabled.
const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then(m => m.PDFViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    ),
  }
);

interface InvoicePdfPreviewProps {
  data: InvoiceDocumentData;
  /** Bump to force the viewer to re-render the document (e.g. debounced key). */
  refreshKey?: string | number;
  className?: string;
}

export function InvoicePdfPreview({
  data,
  refreshKey,
  className,
}: InvoicePdfPreviewProps) {
  return (
    <div className={className ?? "h-full w-full bg-white"}>
      <PDFViewer
        key={refreshKey}
        showToolbar
        style={{ width: "100%", height: "100%", border: "none" }}
      >
        <InvoiceDocument data={data} />
      </PDFViewer>
    </div>
  );
}
