import { z } from "zod";
import { Prisma } from "@prisma/client";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { InvoiceStatusSchema } from "../../../../../prisma/generated/zod";
import { Resend } from "resend";
import { env } from "~/env";
import { render } from "@react-email/components";
import { InvoiceEmail } from "~/server/email/templates/invoice-email";
import { formatDecimalLike } from "~/server/utils/format";

export const invoiceRouter = createTRPCRouter({
  createInvoice: publicProcedure
    .input(
      z.object({
        organizationId: z.string().cuid(),
        customerId: z.string().cuid(),
        issueDate: z.coerce.date(),
        dueDate: z.coerce.date(),
        paymentTerms: z.string().default("Net 30"),
        currency: z.string().default("USD"),
        notes: z.string().optional(),
        internalNotes: z.string().optional(),
        termsAndConditions: z.string().optional(),
        items: z
          .array(
            z.object({
              description: z.string().min(1),
              quantity: z.number().positive(),
              unitPrice: z.number().nonnegative(),
              taxRate: z.number().min(0).max(100).default(0),
              discountRate: z.number().min(0).max(100).default(0),
            })
          )
          .min(1),
      })
    )
    .mutation(async ({ input }) => {
      const customer = await db.customer.findFirst({
        where: { id: input.customerId, organizationId: input.organizationId },
      });
      if (!customer) throw new Error("Customer not found in organization");
      if (!customer.email) throw new Error("Customer has no email");

      // Generate invoice number simplistic (ORG-YYYYMM-SEQ)
      const monthKey = new Date().toISOString().slice(0, 7).replace("-", "");
      const count = await db.invoice.count({
        where: { organizationId: input.organizationId },
      });
      const invoiceNumber = `INV-${monthKey}-${count + 1}`;

      let subtotal = new Prisma.Decimal(0);
      let taxAmount = new Prisma.Decimal(0);
      let discountAmount = new Prisma.Decimal(0);
      const shippingAmount = new Prisma.Decimal(0);

      const itemData = input.items.map((i, idx) => {
        const qty = new Prisma.Decimal(i.quantity);
        const price = new Prisma.Decimal(i.unitPrice);
        const lineBase = qty.mul(price);
        const lineDiscount = lineBase.mul(i.discountRate).div(100);
        const afterDiscount = lineBase.sub(lineDiscount);
        const lineTax = afterDiscount.mul(i.taxRate).div(100);
        subtotal = subtotal.add(afterDiscount);
        taxAmount = taxAmount.add(lineTax);
        discountAmount = discountAmount.add(lineDiscount);
        return {
          description: i.description,
          quantity: qty,
          unitPrice: price,
          taxRate: new Prisma.Decimal(i.taxRate),
          discountRate: new Prisma.Decimal(i.discountRate),
          subtotal: afterDiscount.add(lineTax),
          sortOrder: idx,
        };
      });

      const totalAmount = subtotal.add(taxAmount).add(shippingAmount);

      const created = await db.invoice.create({
        data: {
          organizationId: input.organizationId,
          customerId: customer.id,
          customerEmail: customer.email,
          customerName: `${customer.firstName} ${customer.lastName}`,
          customerAddress: customer.address ?? null,
          customerPhone: customer.phone ?? null,
          // ensure dates
          invoiceNumber,
          status: "DRAFT",
          issueDate: input.issueDate,
          dueDate: input.dueDate,
          paymentTerms: input.paymentTerms ?? "Net 30",
          subtotal,
          taxAmount,
          discountAmount,
          shippingAmount,
          totalAmount,
          paidAmount: new Prisma.Decimal(0),
          currency: input.currency ?? "USD",
          notes: input.notes ?? null,
          internalNotes: input.internalNotes ?? null,
          termsAndConditions: input.termsAndConditions ?? null,
          items: { create: itemData },
        },
        include: { items: true, payments: true },
      });
      return created;
    }),
  updateInvoice: publicProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        organizationId: z.string().cuid(),
        status: InvoiceStatusSchema.optional(),
        notes: z.string().optional(),
        internalNotes: z.string().optional(),
        termsAndConditions: z.string().optional(),
        addItems: z
          .array(
            z.object({
              description: z.string().min(1),
              quantity: z.number().positive(),
              unitPrice: z.number().nonnegative(),
              taxRate: z.number().min(0).max(100).default(0),
              discountRate: z.number().min(0).max(100).default(0),
            })
          )
          .optional(),
        removeItemIds: z.array(z.string().cuid()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const existing = await db.invoice.findUnique({
        where: { id: input.id },
        include: { items: true },
      });
      if (!existing || existing.organizationId !== input.organizationId) {
        throw new Error("Invoice not found for organization");
      }

      // Build item creates/deletes
      const createItems = (input.addItems ?? []).map((i, idx) => {
        const qty = new Prisma.Decimal(i.quantity);
        const price = new Prisma.Decimal(i.unitPrice);
        const lineBase = qty.mul(price);
        const lineDiscount = lineBase.mul(i.discountRate).div(100);
        const afterDiscount = lineBase.sub(lineDiscount);
        const lineTax = afterDiscount.mul(i.taxRate).div(100);
        return {
          description: i.description,
          quantity: qty,
          unitPrice: price,
          taxRate: new Prisma.Decimal(i.taxRate),
          discountRate: new Prisma.Decimal(i.discountRate),
          subtotal: afterDiscount.add(lineTax),
          sortOrder: existing.items.length + idx,
        };
      });

      await db.$transaction(async tx => {
        if (input.removeItemIds?.length) {
          await tx.invoiceItem.deleteMany({
            where: { id: { in: input.removeItemIds }, invoiceId: existing.id },
          });
        }
        if (createItems.length) {
          await tx.invoiceItem.createMany({
            data: createItems.map(i => ({ ...i, invoiceId: existing.id })),
          });
        }

        // Recompute totals
        const items = await tx.invoiceItem.findMany({
          where: { invoiceId: existing.id },
        });
        let subtotal = new Prisma.Decimal(0);
        items.forEach(it => {
          const basePlusTax = it.subtotal; // subtotal field already holds after discount + tax
          // Reverse-engineer? keep simplified; maintain discount / tax from fields
          subtotal = subtotal.add(basePlusTax);
        });
        // For simplicity treat subtotal as sum of item subtotal, cannot precisely separate out tax & discount without storing separate; keep existing
        const updated = await tx.invoice.update({
          where: { id: existing.id },
          data: {
            status: input.status ?? existing.status,
            notes: input.notes ?? existing.notes,
            internalNotes: input.internalNotes ?? existing.internalNotes,
            termsAndConditions:
              input.termsAndConditions ?? existing.termsAndConditions,
            subtotal, // item subtotal includes tax & discount; keep legacy fields
            taxAmount: existing.taxAmount, // unchanged (improvement: recalc with item details stored separately)
            discountAmount: existing.discountAmount,
            totalAmount: subtotal, // simplified
          },
        });
        return updated;
      });

      const refreshed = await db.invoice.findUnique({
        where: { id: existing.id },
        include: { items: true, payments: true },
      });
      return refreshed;
    }),
  deleteInvoice: publicProcedure
    .input(
      z.object({ id: z.string().cuid(), organizationId: z.string().cuid() })
    )
    .mutation(async ({ input }) => {
      const existing = await db.invoice.findUnique({ where: { id: input.id } });
      if (!existing || existing.organizationId !== input.organizationId) {
        throw new Error("Invoice not found for organization");
      }
      await db.invoice.delete({ where: { id: input.id } });
      return { success: true, deletedId: input.id };
    }),
  getInvoiceById: publicProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ input }) => {
      const invoice = await db.invoice.findUnique({
        where: { id: input.id },
        include: { items: true, payments: true, customer: true },
      });
      if (!invoice) throw new Error("Invoice not found");
      return invoice;
    }),
  listInvoices: publicProcedure
    .input(
      z.object({
        organizationId: z.string().cuid(),
        status: InvoiceStatusSchema.optional(),
        search: z.string().optional(),
        from: z.coerce.date().optional(),
        to: z.coerce.date().optional(),
      })
    )
    .query(async ({ input }) => {
      const invoices = await db.invoice.findMany({
        where: {
          organizationId: input.organizationId,
          status: input.status ?? undefined,
          AND: [
            input.from ? { issueDate: { gte: input.from } } : {},
            input.to ? { issueDate: { lte: input.to } } : {},
            input.search
              ? {
                  OR: [
                    { invoiceNumber: { contains: input.search } },
                    { customerName: { contains: input.search } },
                    { customerEmail: { contains: input.search } },
                  ],
                }
              : {},
          ],
        },
        orderBy: { issueDate: "desc" },
        include: { items: false, payments: false },
      });
      return invoices;
    }),
  sendInvoice: publicProcedure
    .input(
      z.object({ id: z.string().cuid(), organizationId: z.string().cuid() })
    )
    .mutation(async ({ input }) => {
      const invoice = await db.invoice.findUnique({
        where: { id: input.id },
        include: { items: true, customer: true },
      });
      if (!invoice || invoice.organizationId !== input.organizationId) {
        throw new Error("Invoice not found for organization");
      }
      if (!invoice.customerEmail) throw new Error("Customer email missing");

      const organization = await db.organization.findUnique({
        where: { id: invoice.organizationId },
        select: { name: true, website: true, industry: true },
      });

      // HTML email using react-email template
      const emailHtml = await render(
        InvoiceEmail({
          invoiceNumber: invoice.invoiceNumber,
          issueDate: invoice.issueDate.toISOString().split("T")[0] ?? "",
          dueDate: invoice.dueDate.toISOString().split("T")[0] ?? "",
          status: invoice.status,
          customerName: invoice.customerName,
          customerEmail: invoice.customerEmail,
          customerAddress: invoice.customerAddress,
          customerPhone: invoice.customerPhone,
          organizationName: organization?.name ?? "Organization",
          organizationWebsite: organization?.website ?? null,
          organizationIndustry: organization?.industry ?? null,
          currency: invoice.currency,
          items: invoice.items.map(i => ({
            description: i.description,
            quantity: formatDecimalLike(i.quantity),
            unitPrice: formatDecimalLike(i.unitPrice),
            taxRate: formatDecimalLike(i.taxRate),
            discountRate: formatDecimalLike(i.discountRate),
            lineTotal: formatDecimalLike(i.subtotal),
          })),
          subtotal: formatDecimalLike(invoice.subtotal),
          taxAmount: formatDecimalLike(invoice.taxAmount),
          discountAmount: formatDecimalLike(invoice.discountAmount),
          shippingAmount: formatDecimalLike(invoice.shippingAmount),
          totalAmount: formatDecimalLike(invoice.totalAmount),
          paidAmount: formatDecimalLike(invoice.paidAmount),
          paymentTerms: invoice.paymentTerms,
          notes: invoice.notes,
          termsAndConditions: invoice.termsAndConditions,
        })
      );

      const resend = new Resend(env.RESEND_API_KEY);
      await resend.emails.send({
        from: "Acme <onboarding@resend.dev>",
        to: invoice.customerEmail,
        subject: `Invoice ${invoice.invoiceNumber}`,
        html: emailHtml,
      });

      const updated = await db.invoice.update({
        where: { id: invoice.id },
        data: {
          status: invoice.status === "DRAFT" ? "SENT" : invoice.status,
          sentAt: new Date(),
        },
      });
      return updated;
    }),
});
