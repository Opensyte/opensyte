import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { buildInvoiceDocumentData } from "~/lib/invoice/build-document-data";

// Public, no-login access to an invoice via its tokenized share link.
// Opening the link marks the invoice as Viewed.
export const publicInvoiceRouter = createTRPCRouter({
  getByToken: publicProcedure
    .input(z.object({ token: z.string().min(8) }))
    .query(async ({ input }) => {
      const invoice = await db.invoice.findUnique({
        where: { publicToken: input.token },
        include: { items: true },
      });
      if (!invoice) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      }

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

      return {
        token: input.token,
        status: invoice.status,
        invoiceNumber: invoice.invoiceNumber,
        document: buildInvoiceDocumentData({ invoice, settings, organization }),
      };
    }),
});
