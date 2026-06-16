import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import {
  InvoiceDocument,
  type InvoiceDocumentData,
} from "~/components/finance/invoicing/document/invoice-document";

/** Render the canonical invoice document to a PDF Buffer (Node runtime). */
export async function renderInvoicePdf(
  data: InvoiceDocumentData
): Promise<Buffer> {
  return renderToBuffer(<InvoiceDocument data={data} />);
}
