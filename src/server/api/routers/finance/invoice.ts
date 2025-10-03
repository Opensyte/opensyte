import { z } from "zod";
import { Prisma } from "@prisma/client";
import {
  createTRPCRouter,
  createPermissionProcedure,
  createAnyPermissionProcedure,
} from "~/server/api/trpc";
import { db } from "~/server/db";
import { PERMISSIONS } from "~/lib/rbac";
import { InvoiceStatusSchema } from "../../../../../prisma/generated/zod";
import { Resend } from "resend";
import { env } from "~/env";
import { render } from "@react-email/components";
import { InvoiceEmail } from "~/server/email/templates/invoice-email";
import { formatDecimalLike } from "~/server/utils/format";
import { WorkflowEvents } from "~/lib/workflow-dispatcher";
import { paymentService } from "~/lib/services/payment-service";

// Shared schemas for better reusability and consistency
const invoiceItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  taxRate: z.number().min(0).max(100).default(0),
  discountRate: z.number().min(0).max(100).default(0),
});

const updateInvoiceItemSchema = invoiceItemSchema.extend({
  id: z.string().cuid(),
});

/**
 * Calculates line item totals including tax and discount
 */
function calculateLineItem(item: z.infer<typeof invoiceItemSchema>) {
  const qty = new Prisma.Decimal(item.quantity);
  const price = new Prisma.Decimal(item.unitPrice);
  const lineBase = qty.mul(price);
  const lineDiscount = lineBase.mul(item.discountRate).div(100);
  const afterDiscount = lineBase.sub(lineDiscount);
  const lineTax = afterDiscount.mul(item.taxRate).div(100);

  return {
    quantity: qty,
    unitPrice: price,
    taxRate: new Prisma.Decimal(item.taxRate),
    discountRate: new Prisma.Decimal(item.discountRate),
    subtotal: afterDiscount.add(lineTax),
    lineDiscount,
    lineTax,
    afterDiscount,
  };
}

/**
 * Validates customer exists in organization and has required fields
 */
async function validateCustomer(customerId: string, organizationId: string) {
  const customer = await db.customer.findFirst({
    where: { id: customerId, organizationId },
  });

  if (!customer) throw new Error("Customer not found in organization");
  if (!customer.email) throw new Error("Customer has no email");

  return {
    email: customer.email,
    firstName: customer.firstName,
    lastName: customer.lastName,
    address: customer.address,
    phone: customer.phone,
  };
}

export const invoiceRouter = createTRPCRouter({
  createInvoice: createPermissionProcedure(PERMISSIONS.FINANCE_WRITE)
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
        items: z.array(invoiceItemSchema).min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);
      const customer = await validateCustomer(
        input.customerId,
        input.organizationId
      );

      // Generate invoice number (simplified approach)
      const monthKey = new Date().toISOString().slice(0, 7).replace("-", "");
      const count = await db.invoice.count({
        where: { organizationId: input.organizationId },
      });
      const invoiceNumber = `INV-${monthKey}-${count + 1}`;

      // Calculate totals
      let subtotal = new Prisma.Decimal(0);
      let taxAmount = new Prisma.Decimal(0);
      let discountAmount = new Prisma.Decimal(0);
      const shippingAmount = new Prisma.Decimal(0);

      const itemData = input.items.map((item, idx) => {
        const calculated = calculateLineItem(item);
        subtotal = subtotal.add(calculated.afterDiscount);
        taxAmount = taxAmount.add(calculated.lineTax);
        discountAmount = discountAmount.add(calculated.lineDiscount);

        return {
          description: item.description,
          quantity: calculated.quantity,
          unitPrice: calculated.unitPrice,
          taxRate: calculated.taxRate,
          discountRate: calculated.discountRate,
          subtotal: calculated.subtotal,
          sortOrder: idx,
        };
      });

      const totalAmount = subtotal.add(taxAmount).add(shippingAmount);

      const created = await db.invoice.create({
        data: {
          organizationId: input.organizationId,
          customerId: input.customerId,
          customerEmail: customer.email,
          customerName: `${customer.firstName} ${customer.lastName}`,
          customerAddress: customer.address ?? null,
          customerPhone: customer.phone ?? null,
          invoiceNumber,
          status: "DRAFT",
          issueDate: input.issueDate,
          dueDate: input.dueDate,
          paymentTerms: input.paymentTerms,
          subtotal,
          taxAmount,
          discountAmount,
          shippingAmount,
          totalAmount,
          paidAmount: new Prisma.Decimal(0),
          currency: input.currency,
          notes: input.notes ?? null,
          internalNotes: input.internalNotes ?? null,
          termsAndConditions: input.termsAndConditions ?? null,
          items: { create: itemData },
        },
        include: { items: true, payments: true },
      });

      // Trigger workflow events
      try {
        await WorkflowEvents.dispatchFinanceEvent(
          "created",
          "invoice",
          input.organizationId,
          {
            id: created.id,
            invoiceNumber: created.invoiceNumber,
            totalAmount: created.totalAmount,
            subtotal: created.subtotal,
            taxAmount: created.taxAmount,
            discountAmount: created.discountAmount,
            shippingAmount: created.shippingAmount,
            paidAmount: created.paidAmount,
            currency: created.currency,
            status: created.status,
            issueDate: created.issueDate,
            dueDate: created.dueDate,
            paymentTerms: created.paymentTerms,
            customerId: created.customerId,
            customerName: created.customerName,
            customerEmail: created.customerEmail,
            customerPhone: created.customerPhone,
            customerAddress: created.customerAddress,
            notes: created.notes,
            organizationId: created.organizationId,
            createdAt: created.createdAt,
            updatedAt: created.updatedAt,
          },
          ctx.user.id
        );
      } catch (workflowError) {
        console.error("Workflow dispatch failed:", workflowError);
        // Don't fail the main operation if workflow fails
      }

      return created;
    }),
  updateInvoice: createPermissionProcedure(PERMISSIONS.FINANCE_WRITE)
    .input(
      z.object({
        id: z.string().cuid(),
        organizationId: z.string().cuid(),
        customerId: z.string().cuid().optional(),
        issueDate: z.coerce.date().optional(),
        dueDate: z.coerce.date().optional(),
        paymentTerms: z.string().optional(),
        currency: z.string().optional(),
        status: InvoiceStatusSchema.optional(),
        notes: z.string().optional(),
        internalNotes: z.string().optional(),
        termsAndConditions: z.string().optional(),
        addItems: z.array(invoiceItemSchema).optional(),
        updateItems: z.array(updateInvoiceItemSchema).optional(),
        removeItemIds: z.array(z.string().cuid()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);
      // Validate invoice exists
      const existing = await db.invoice.findUnique({
        where: { id: input.id },
        include: { items: true },
      });

      if (!existing || existing.organizationId !== input.organizationId) {
        throw new Error("Invoice not found for organization");
      }

      // Validate customer if being updated
      let customerData = null;
      if (input.customerId && input.customerId !== existing.customerId) {
        customerData = await validateCustomer(
          input.customerId,
          input.organizationId
        );
      }

      // Prepare items for creation
      const createItems = (input.addItems ?? []).map((item, idx) => {
        const calculated = calculateLineItem(item);
        return {
          description: item.description,
          quantity: calculated.quantity,
          unitPrice: calculated.unitPrice,
          taxRate: calculated.taxRate,
          discountRate: calculated.discountRate,
          subtotal: calculated.subtotal,
          sortOrder: existing.items.length + idx,
        };
      });

      await db.$transaction(async tx => {
        // Remove deleted items
        if (input.removeItemIds?.length) {
          await tx.invoiceItem.deleteMany({
            where: { id: { in: input.removeItemIds }, invoiceId: existing.id },
          });
        }

        // Add new items
        if (createItems.length) {
          await tx.invoiceItem.createMany({
            data: createItems.map(item => ({
              ...item,
              invoiceId: existing.id,
            })),
          });
        }

        // Update existing items
        if (input.updateItems?.length) {
          for (const item of input.updateItems) {
            const calculated = calculateLineItem(item);
            await tx.invoiceItem.update({
              where: { id: item.id, invoiceId: existing.id },
              data: {
                description: item.description,
                quantity: calculated.quantity,
                unitPrice: calculated.unitPrice,
                taxRate: calculated.taxRate,
                discountRate: calculated.discountRate,
                subtotal: calculated.subtotal,
              },
            });
          }
        }

        // Recalculate totals
        const allItems = await tx.invoiceItem.findMany({
          where: { invoiceId: existing.id },
        });

        const subtotal = allItems.reduce(
          (sum, item) => sum.add(item.subtotal),
          new Prisma.Decimal(0)
        );

        // Build update data conditionally
        const updateData = {
          status: input.status ?? existing.status,
          notes: input.notes ?? existing.notes,
          internalNotes: input.internalNotes ?? existing.internalNotes,
          termsAndConditions:
            input.termsAndConditions ?? existing.termsAndConditions,
          subtotal,
          taxAmount: existing.taxAmount, // TODO: Recalculate from items
          discountAmount: existing.discountAmount, // TODO: Recalculate from items
          totalAmount: subtotal,
          ...(input.customerId && {
            customerId: input.customerId,
            ...(customerData && {
              customerEmail: customerData.email,
              customerName: `${customerData.firstName} ${customerData.lastName}`,
              customerAddress: customerData.address,
              customerPhone: customerData.phone,
            }),
          }),
          ...(input.issueDate && { issueDate: input.issueDate }),
          ...(input.dueDate && { dueDate: input.dueDate }),
          ...(input.paymentTerms && { paymentTerms: input.paymentTerms }),
          ...(input.currency && { currency: input.currency }),
        };

        await tx.invoice.update({
          where: { id: existing.id },
          data: updateData,
        });
      });

      // Return updated invoice
      const refreshed = await db.invoice.findUnique({
        where: { id: existing.id },
        include: { items: true, payments: true },
      });
      // Dispatch workflow for invoice update/status change
      try {
        const statusChanged = input.status && input.status !== existing.status;
        await WorkflowEvents.dispatchFinanceEvent(
          statusChanged ? "status_changed" : "updated",
          "invoice",
          input.organizationId,
          {
            id: refreshed!.id,
            invoiceNumber: refreshed!.invoiceNumber,
            totalAmount: refreshed!.totalAmount,
            subtotal: refreshed!.subtotal,
            taxAmount: refreshed!.taxAmount,
            discountAmount: refreshed!.discountAmount,
            shippingAmount: refreshed!.shippingAmount,
            paidAmount: refreshed!.paidAmount,
            currency: refreshed!.currency,
            status: refreshed!.status,
            issueDate: refreshed!.issueDate,
            dueDate: refreshed!.dueDate,
            paymentTerms: refreshed!.paymentTerms,
            customerId: refreshed!.customerId,
            customerName: refreshed!.customerName,
            customerEmail: refreshed!.customerEmail,
            customerPhone: refreshed!.customerPhone,
            organizationId: refreshed!.organizationId,
            updatedAt: refreshed!.updatedAt,
            ...(statusChanged ? { previousStatus: existing.status } : {}),
          },
          ctx.user.id
        );
      } catch (workflowError) {
        console.error("Workflow dispatch failed:", workflowError);
      }
      return refreshed;
    }),
  deleteInvoice: createPermissionProcedure(PERMISSIONS.FINANCE_WRITE)
    .input(
      z.object({ id: z.string().cuid(), organizationId: z.string().cuid() })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);
      const existing = await db.invoice.findUnique({ where: { id: input.id } });
      if (!existing || existing.organizationId !== input.organizationId) {
        throw new Error("Invoice not found for organization");
      }
      await db.invoice.delete({ where: { id: input.id } });
      return { success: true, deletedId: input.id };
    }),
  getInvoiceById: createAnyPermissionProcedure([
    PERMISSIONS.FINANCE_READ,
    PERMISSIONS.FINANCE_WRITE,
    PERMISSIONS.FINANCE_ADMIN,
  ])
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ input, ctx }) => {
      // Note: invoice access is organization specific; we fetch invoice then verify organization permissions
      const invoice = await db.invoice.findUnique({
        where: { id: input.id },
        include: { items: true, payments: true, customer: true },
      });
      if (!invoice) throw new Error("Invoice not found");
      await ctx.requireAnyPermission(invoice.organizationId);
      return invoice;
    }),
  listInvoices: createAnyPermissionProcedure([
    PERMISSIONS.FINANCE_READ,
    PERMISSIONS.FINANCE_WRITE,
    PERMISSIONS.FINANCE_ADMIN,
  ])
    .input(
      z.object({
        organizationId: z.string().cuid(),
        status: InvoiceStatusSchema.optional(),
        search: z.string().optional(),
        from: z.coerce.date().optional(),
        to: z.coerce.date().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      await ctx.requireAnyPermission(input.organizationId);
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
  sendInvoice: createPermissionProcedure(PERMISSIONS.FINANCE_WRITE)
    .input(
      z.object({ id: z.string().cuid(), organizationId: z.string().cuid() })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);
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

      // Generate Stripe payment link if not already created
      let paymentUrl = invoice.stripePaymentUrl;
      if (!paymentUrl) {
        try {
          const paymentResult = await paymentService.createPaymentLink(invoice);
          if (paymentResult.success) {
            paymentUrl = paymentResult.paymentUrl ?? null;
          }
        } catch (error) {
          console.error("Failed to create payment link:", error);
          // Continue without payment link - don't fail the entire send operation
        }
      }

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
          paymentUrl: paymentUrl ?? undefined,
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
