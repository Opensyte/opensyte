import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "~/server/db";
import { buildInvoiceDocumentData } from "~/lib/invoice/build-document-data";
import { PublicInvoiceView } from "~/components/finance/invoicing/public-invoice-view";

export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Invoice",
  robots: { index: false, follow: false },
};

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const invoice = await db.invoice.findUnique({
    where: { publicToken: token },
    include: { items: true },
  });
  if (!invoice) notFound();

  // Mark as viewed on first open (SENT -> VIEWED).
  if (invoice.status === "SENT") {
    try {
      await db.invoice.update({
        where: { id: invoice.id },
        data: { status: "VIEWED", viewedAt: new Date() },
      });
      invoice.status = "VIEWED";
    } catch (e) {
      console.error("Failed to mark invoice viewed:", e);
    }
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

  const data = buildInvoiceDocumentData({ invoice, settings, organization });

  return <PublicInvoiceView data={data} token={token} />;
}
