import { type NextRequest } from "next/server";
import { db } from "~/server/db";
import { renderInvoicePdf } from "~/server/invoice/render-pdf";
import { buildInvoiceDocumentData } from "~/lib/invoice/build-document-data";

// Public, tokenized PDF stream. Runs on the Node runtime so @react-pdf can
// render to a Buffer. Used by the public page's Download button.
export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const invoice = await db.invoice.findUnique({
    where: { publicToken: token },
    include: { items: true },
  });
  if (!invoice) {
    return new Response("Invoice not found", { status: 404 });
  }

  const [settings, organization] = await Promise.all([
    db.invoiceSettings.findUnique({
      where: { organizationId: invoice.organizationId },
    }),
    db.organization.findUnique({
      where: { id: invoice.organizationId },
      select: { name: true, logo: true, website: true },
    }),
  ]);

  const pdf = await renderInvoicePdf(
    buildInvoiceDocumentData({ invoice, settings, organization })
  );

  const download = req.nextUrl.searchParams.get("download") === "1";
  const disposition = download ? "attachment" : "inline";

  return new Response(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="invoice-${invoice.invoiceNumber}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
