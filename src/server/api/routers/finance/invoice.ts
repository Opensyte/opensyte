import { z } from "zod";
import { Prisma, type InvoiceSettings } from "@prisma/client";
import { randomBytes } from "crypto";
import {
  createTRPCRouter,
  createPermissionProcedure,
  createAnyPermissionProcedure,
} from "~/server/api/trpc";
import { db } from "~/server/db";
import { PERMISSIONS } from "~/lib/rbac";
import {
  InvoiceStatusSchema,
  PaymentMethodSchema,
} from "../../../../../prisma/generated/zod";
import { Resend } from "resend";
import { env } from "~/env";
import { render } from "@react-email/components";
import { InvoiceEmail } from "~/server/email/templates/invoice/invoice-email";
import { ReminderEmail } from "~/server/email/templates/invoice/reminder-email";
import { ReceiptEmail } from "~/server/email/templates/invoice/receipt-email";
import { WorkflowEvents } from "~/lib/workflow-dispatcher";
import { calculateInvoiceTotals, balanceDue } from "~/lib/invoice/calc";
import { nextInvoiceNumber } from "~/lib/invoice/numbering";
import { buildInvoiceDocumentData } from "~/lib/invoice/build-document-data";
import { renderInvoicePdf } from "~/server/invoice/render-pdf";
import { formatCurrency, formatDate } from "~/lib/invoice/format";
import {
  DEFAULT_EMAIL_TEMPLATES,
  interpolate,
  type InvoiceEmailKind,
} from "~/lib/invoice/email-templates";

// ---------------------------------------------------------------------------
// Shared input schemas
// ---------------------------------------------------------------------------
const invoiceItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
});

// Fields shared by create & update (tax/discount are invoice-level now)
const invoiceFieldsSchema = {
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  paymentTerms: z.string().default("Net 30"),
  currency: z.string().default("USD"),
  locale: z.string().default("en"),
  taxEnabled: z.boolean().default(true),
  taxLabel: z.string().default("Tax"),
  taxRate: z.number().min(0).max(100).default(0),
  taxRegistrationId: z.string().optional(),
  discountAmount: z.number().min(0).default(0),
  shippingAmount: z.number().min(0).default(0),
  paymentInstructions: z.string().optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  termsAndConditions: z.string().optional(),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function newPublicToken(): string {
  return randomBytes(24).toString("base64url");
}

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

type InvoiceWithItems = Prisma.InvoiceGetPayload<{ include: { items: true } }>;

/** Resolve the org branding + invoice settings used by document/email. */
async function loadInvoiceContext(invoice: InvoiceWithItems) {
  const [settings, organization] = await Promise.all([
    db.invoiceSettings.findUnique({
      where: { organizationId: invoice.organizationId },
    }),
    db.organization.findUnique({
      where: { id: invoice.organizationId },
      select: { name: true, logo: true, website: true },
    }),
  ]);
  const businessName =
    settings?.businessName ?? organization?.name ?? "Your Business";
  return { settings, organization, businessName };
}

function publicInvoiceUrl(token: string): string {
  return `${env.NEXT_PUBLIC_APP_URL}/invoice/${token}`;
}

/** Build the {variable} map shared by all invoice emails. */
function emailVars(
  invoice: InvoiceWithItems,
  businessName: string,
  amountValue: string
) {
  return {
    clientName: invoice.customerName ?? "there",
    invoiceNumber: invoice.invoiceNumber,
    amountDue: formatCurrency(amountValue, invoice.currency, invoice.locale),
    dueDate: formatDate(invoice.dueDate, invoice.locale),
    companyName: businessName,
  };
}

function resolveTemplate(
  kind: InvoiceEmailKind,
  settings: InvoiceSettings | null,
  vars: Record<string, string>
) {
  const overrides = {
    invoice: { s: settings?.emailInvoiceSubject, b: settings?.emailInvoiceBody },
    reminder: {
      s: settings?.emailReminderSubject,
      b: settings?.emailReminderBody,
    },
    receipt: { s: settings?.emailReceiptSubject, b: settings?.emailReceiptBody },
  }[kind];
  const subjectTpl = overrides.s ?? DEFAULT_EMAIL_TEMPLATES[kind].subject;
  const bodyTpl = overrides.b ?? DEFAULT_EMAIL_TEMPLATES[kind].body;
  return {
    subject: interpolate(subjectTpl, vars),
    message: interpolate(bodyTpl, vars),
  };
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
export const invoiceRouter = createTRPCRouter({
  createInvoice: createPermissionProcedure(PERMISSIONS.FINANCE_WRITE)
    .input(
      z.object({
        organizationId: z.string().cuid(),
        customerId: z.string().cuid(),
        ...invoiceFieldsSchema,
        items: z.array(invoiceItemSchema).min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);
      const customer = await validateCustomer(
        input.customerId,
        input.organizationId
      );
      const settings = await db.invoiceSettings.findUnique({
        where: { organizationId: input.organizationId },
      });

      const totals = calculateInvoiceTotals({
        items: input.items,
        discountAmount: input.discountAmount,
        taxEnabled: input.taxEnabled,
        taxRate: input.taxRate,
        shippingAmount: input.shippingAmount,
      });

      const itemData = input.items.map((item, idx) => ({
        description: item.description,
        quantity: new Prisma.Decimal(item.quantity),
        unitPrice: new Prisma.Decimal(item.unitPrice),
        taxRate: new Prisma.Decimal(0),
        discountRate: new Prisma.Decimal(0),
        subtotal: new Prisma.Decimal(totals.lineSubtotals[idx]!.toFixed(2)),
        sortOrder: idx,
      }));

      // Atomic invoice number + create in one transaction.
      const created = await db.$transaction(async tx => {
        const invoiceNumber = await nextInvoiceNumber(tx, input.organizationId);
        return tx.invoice.create({
          data: {
            organizationId: input.organizationId,
            customerId: input.customerId,
            customerEmail: customer.email,
            customerName: `${customer.firstName} ${customer.lastName}`.trim(),
            customerAddress: customer.address ?? null,
            customerPhone: customer.phone ?? null,
            invoiceNumber,
            status: "DRAFT",
            issueDate: input.issueDate,
            dueDate: input.dueDate,
            paymentTerms: input.paymentTerms,
            locale: input.locale,
            taxEnabled: input.taxEnabled,
            taxLabel: input.taxLabel,
            taxRate: new Prisma.Decimal(input.taxRate),
            taxRegistrationId:
              input.taxRegistrationId ?? settings?.taxRegistrationId ?? null,
            subtotal: new Prisma.Decimal(totals.subtotal.toFixed(2)),
            taxAmount: new Prisma.Decimal(totals.taxAmount.toFixed(2)),
            discountAmount: new Prisma.Decimal(totals.discountAmount.toFixed(2)),
            shippingAmount: new Prisma.Decimal(totals.shippingAmount.toFixed(2)),
            totalAmount: new Prisma.Decimal(totals.totalAmount.toFixed(2)),
            paidAmount: new Prisma.Decimal(0),
            currency: input.currency,
            notes: input.notes ?? null,
            internalNotes: input.internalNotes ?? null,
            termsAndConditions: input.termsAndConditions ?? null,
            paymentInstructions:
              input.paymentInstructions ?? settings?.paymentInstructions ?? null,
            publicToken: newPublicToken(),
            createdById: ctx.user.id,
            items: { create: itemData },
          },
          include: { items: true, payments: true },
        });
      });

      try {
        await WorkflowEvents.dispatchFinanceEvent(
          "created",
          "invoice",
          input.organizationId,
          {
            id: created.id,
            invoiceNumber: created.invoiceNumber,
            totalAmount: created.totalAmount,
            currency: created.currency,
            status: created.status,
            issueDate: created.issueDate,
            dueDate: created.dueDate,
            customerId: created.customerId,
            customerName: created.customerName,
            customerEmail: created.customerEmail,
            organizationId: created.organizationId,
            createdAt: created.createdAt,
          },
          ctx.user.id
        );
      } catch (workflowError) {
        console.error("Workflow dispatch failed:", workflowError);
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
        locale: z.string().optional(),
        taxEnabled: z.boolean().optional(),
        taxLabel: z.string().optional(),
        taxRate: z.number().min(0).max(100).optional(),
        taxRegistrationId: z.string().optional(),
        discountAmount: z.number().min(0).optional(),
        shippingAmount: z.number().min(0).optional(),
        paymentInstructions: z.string().optional(),
        status: InvoiceStatusSchema.optional(),
        notes: z.string().optional(),
        internalNotes: z.string().optional(),
        termsAndConditions: z.string().optional(),
        // Full replacement of line items when provided.
        items: z.array(invoiceItemSchema).min(1).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);
      const existing = await db.invoice.findUnique({
        where: { id: input.id },
        include: { items: true },
      });
      if (!existing || existing.organizationId !== input.organizationId) {
        throw new Error("Invoice not found for organization");
      }

      let customerData = null;
      if (input.customerId && input.customerId !== existing.customerId) {
        customerData = await validateCustomer(
          input.customerId,
          input.organizationId
        );
      }

      // Resolve effective tax/discount/shipping (input overrides existing).
      const taxEnabled = input.taxEnabled ?? existing.taxEnabled;
      const taxRate = input.taxRate ?? Number(existing.taxRate);
      const discountAmount =
        input.discountAmount ?? Number(existing.discountAmount);
      const shippingAmount =
        input.shippingAmount ?? Number(existing.shippingAmount);

      const itemsInput =
        input.items ??
        existing.items
          .slice()
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map(i => ({
            description: i.description,
            quantity: Number(i.quantity),
            unitPrice: Number(i.unitPrice),
          }));

      const totals = calculateInvoiceTotals({
        items: itemsInput,
        discountAmount,
        taxEnabled,
        taxRate,
        shippingAmount,
      });

      await db.$transaction(async tx => {
        if (input.items) {
          await tx.invoiceItem.deleteMany({ where: { invoiceId: existing.id } });
          await tx.invoiceItem.createMany({
            data: itemsInput.map((item, idx) => ({
              invoiceId: existing.id,
              description: item.description,
              quantity: new Prisma.Decimal(item.quantity),
              unitPrice: new Prisma.Decimal(item.unitPrice),
              taxRate: new Prisma.Decimal(0),
              discountRate: new Prisma.Decimal(0),
              subtotal: new Prisma.Decimal(totals.lineSubtotals[idx]!.toFixed(2)),
              sortOrder: idx,
            })),
          });
        }

        await tx.invoice.update({
          where: { id: existing.id },
          data: {
            status: input.status ?? existing.status,
            notes: input.notes ?? existing.notes,
            internalNotes: input.internalNotes ?? existing.internalNotes,
            termsAndConditions:
              input.termsAndConditions ?? existing.termsAndConditions,
            paymentInstructions:
              input.paymentInstructions ?? existing.paymentInstructions,
            locale: input.locale ?? existing.locale,
            taxEnabled,
            taxLabel: input.taxLabel ?? existing.taxLabel,
            taxRate: new Prisma.Decimal(taxRate),
            taxRegistrationId:
              input.taxRegistrationId ?? existing.taxRegistrationId,
            subtotal: new Prisma.Decimal(totals.subtotal.toFixed(2)),
            taxAmount: new Prisma.Decimal(totals.taxAmount.toFixed(2)),
            discountAmount: new Prisma.Decimal(totals.discountAmount.toFixed(2)),
            shippingAmount: new Prisma.Decimal(totals.shippingAmount.toFixed(2)),
            totalAmount: new Prisma.Decimal(totals.totalAmount.toFixed(2)),
            ...(input.customerId && {
              customerId: input.customerId,
              ...(customerData && {
                customerEmail: customerData.email,
                customerName:
                  `${customerData.firstName} ${customerData.lastName}`.trim(),
                customerAddress: customerData.address,
                customerPhone: customerData.phone,
              }),
            }),
            ...(input.issueDate && { issueDate: input.issueDate }),
            ...(input.dueDate && { dueDate: input.dueDate }),
            ...(input.paymentTerms && { paymentTerms: input.paymentTerms }),
            ...(input.currency && { currency: input.currency }),
          },
        });
      });

      const refreshed = await db.invoice.findUnique({
        where: { id: existing.id },
        include: { items: true, payments: true },
      });

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
            currency: refreshed!.currency,
            status: refreshed!.status,
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

      // Auto-transition past-due, unpaid invoices to OVERDUE before returning.
      try {
        await db.invoice.updateMany({
          where: {
            organizationId: input.organizationId,
            status: { in: ["SENT", "VIEWED", "PARTIALLY_PAID"] },
            dueDate: { lt: new Date() },
          },
          data: { status: "OVERDUE" },
        });
      } catch (e) {
        console.error("Overdue sweep failed:", e);
      }

      return db.invoice.findMany({
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
      });
    }),

  getInvoiceSummary: createAnyPermissionProcedure([
    PERMISSIONS.FINANCE_READ,
    PERMISSIONS.FINANCE_WRITE,
    PERMISSIONS.FINANCE_ADMIN,
  ])
    .input(z.object({ organizationId: z.string().cuid() }))
    .query(async ({ input, ctx }) => {
      await ctx.requireAnyPermission(input.organizationId);
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [invoices, payments] = await Promise.all([
        db.invoice.findMany({
          where: {
            organizationId: input.organizationId,
            status: { not: "CANCELLED" },
          },
          select: {
            currency: true,
            status: true,
            totalAmount: true,
            paidAmount: true,
            dueDate: true,
          },
        }),
        db.payment.findMany({
          where: {
            paymentDate: { gte: startOfMonth },
            invoice: { organizationId: input.organizationId },
          },
          select: { amount: true, invoice: { select: { currency: true } } },
        }),
      ]);

      const byCurrency = new Map<
        string,
        { outstanding: Prisma.Decimal; overdue: Prisma.Decimal; paidThisMonth: Prisma.Decimal }
      >();
      const bucket = (c: string) => {
        if (!byCurrency.has(c)) {
          byCurrency.set(c, {
            outstanding: new Prisma.Decimal(0),
            overdue: new Prisma.Decimal(0),
            paidThisMonth: new Prisma.Decimal(0),
          });
        }
        return byCurrency.get(c)!;
      };

      for (const inv of invoices) {
        const balance = inv.totalAmount.sub(inv.paidAmount);
        if (balance.lte(0)) continue;
        const open = ["SENT", "VIEWED", "PARTIALLY_PAID", "OVERDUE"].includes(
          inv.status
        );
        if (!open) continue;
        const b = bucket(inv.currency);
        b.outstanding = b.outstanding.add(balance);
        if (inv.status === "OVERDUE" || inv.dueDate < now) {
          b.overdue = b.overdue.add(balance);
        }
      }
      for (const p of payments) {
        const b = bucket(p.invoice.currency);
        b.paidThisMonth = b.paidThisMonth.add(p.amount);
      }

      return Array.from(byCurrency.entries())
        .map(([currency, v]) => ({
          currency,
          outstanding: v.outstanding.toFixed(2),
          overdue: v.overdue.toFixed(2),
          paidThisMonth: v.paidThisMonth.toFixed(2),
        }))
        .sort((a, b) => a.currency.localeCompare(b.currency));
    }),

  recordPayment: createPermissionProcedure(PERMISSIONS.FINANCE_WRITE)
    .input(
      z.object({
        id: z.string().cuid(),
        organizationId: z.string().cuid(),
        amount: z.number().positive(),
        method: PaymentMethodSchema,
        paymentDate: z.coerce.date(),
        reference: z.string().optional(),
        notes: z.string().optional(),
        sendReceipt: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);
      const invoice = await db.invoice.findUnique({
        where: { id: input.id },
        include: { items: true },
      });
      if (!invoice || invoice.organizationId !== input.organizationId) {
        throw new Error("Invoice not found for organization");
      }

      const amount = new Prisma.Decimal(input.amount);
      const newPaid = invoice.paidAmount.add(amount);
      const fullyPaid = newPaid.gte(invoice.totalAmount);
      const newStatus = fullyPaid
        ? "PAID"
        : newPaid.gt(0)
          ? "PARTIALLY_PAID"
          : invoice.status;

      const updated = await db.$transaction(async tx => {
        await tx.payment.create({
          data: {
            invoiceId: invoice.id,
            amount,
            currency: invoice.currency,
            method: input.method,
            reference: input.reference ?? null,
            paymentDate: input.paymentDate,
            notes: input.notes ?? null,
            createdById: ctx.user.id,
          },
        });
        return tx.invoice.update({
          where: { id: invoice.id },
          data: { paidAmount: newPaid, status: newStatus },
          include: { items: true, payments: true },
        });
      });

      try {
        await WorkflowEvents.dispatchFinanceEvent(
          "status_changed",
          "payment",
          input.organizationId,
          {
            id: updated.id,
            invoiceNumber: updated.invoiceNumber,
            amount: amount.toString(),
            paidAmount: updated.paidAmount.toString(),
            totalAmount: updated.totalAmount.toString(),
            currency: updated.currency,
            status: updated.status,
            previousStatus: invoice.status,
            organizationId: updated.organizationId,
          },
          ctx.user.id
        );
      } catch (workflowError) {
        console.error("Workflow dispatch failed:", workflowError);
      }

      // Optional thank-you / receipt email.
      if (input.sendReceipt && updated.customerEmail) {
        try {
          const { settings, organization, businessName } =
            await loadInvoiceContext(updated);
          const token = updated.publicToken ?? newPublicToken();
          if (!updated.publicToken) {
            await db.invoice.update({
              where: { id: updated.id },
              data: { publicToken: token },
            });
          }
          const balance = balanceDue(
            updated.totalAmount.toString(),
            updated.paidAmount.toString()
          );
          const vars = emailVars(updated, businessName, amount.toString());
          const { subject, message } = resolveTemplate("receipt", settings, vars);
          const pdf = await renderInvoicePdf(
            buildInvoiceDocumentData({ invoice: updated, settings, organization })
          );
          const html = await render(
            ReceiptEmail({
              companyName: businessName,
              logoUrl: settings?.logoUrl ?? organization?.logo ?? null,
              message,
              viewUrl: publicInvoiceUrl(token),
              invoiceNumber: updated.invoiceNumber,
              amountPaid: formatCurrency(
                amount.toString(),
                updated.currency,
                updated.locale
              ),
              balanceDue: formatCurrency(
                balance.toString(),
                updated.currency,
                updated.locale
              ),
              fullyPaid,
            })
          );
          const resend = new Resend(env.RESEND_API_KEY);
          await resend.emails.send({
            from: `${env.RESEND_FROM_NAME} <${env.RESEND_FROM_EMAIL}>`,
            to: updated.customerEmail,
            subject,
            html,
            attachments: [
              { filename: `invoice-${updated.invoiceNumber}.pdf`, content: pdf },
            ],
          });
        } catch (e) {
          console.error("Receipt email failed:", e);
        }
      }

      return updated;
    }),

  sendInvoice: createPermissionProcedure(PERMISSIONS.FINANCE_WRITE)
    .input(
      z.object({ id: z.string().cuid(), organizationId: z.string().cuid() })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);
      const invoice = await db.invoice.findUnique({
        where: { id: input.id },
        include: { items: true },
      });
      if (!invoice || invoice.organizationId !== input.organizationId) {
        throw new Error("Invoice not found for organization");
      }
      if (!invoice.customerEmail) throw new Error("Customer email missing");

      // Ensure a public token exists.
      let token = invoice.publicToken;
      if (!token) {
        token = newPublicToken();
        await db.invoice.update({
          where: { id: invoice.id },
          data: { publicToken: token },
        });
      }

      const { settings, organization, businessName } =
        await loadInvoiceContext(invoice);
      const balance = balanceDue(
        invoice.totalAmount.toString(),
        invoice.paidAmount.toString()
      );
      const vars = emailVars(invoice, businessName, balance.toString());
      const { subject, message } = resolveTemplate("invoice", settings, vars);

      const pdf = await renderInvoicePdf(
        buildInvoiceDocumentData({ invoice, settings, organization })
      );
      const html = await render(
        InvoiceEmail({
          companyName: businessName,
          logoUrl: settings?.logoUrl ?? organization?.logo ?? null,
          message,
          viewUrl: publicInvoiceUrl(token),
          invoiceNumber: invoice.invoiceNumber,
          amountDue: vars.amountDue,
          dueDate: vars.dueDate,
        })
      );

      const resend = new Resend(env.RESEND_API_KEY);
      await resend.emails.send({
        from: `${env.RESEND_FROM_NAME} <${env.RESEND_FROM_EMAIL}>`,
        to: invoice.customerEmail,
        subject,
        html,
        attachments: [
          { filename: `invoice-${invoice.invoiceNumber}.pdf`, content: pdf },
        ],
      });

      const updated = await db.invoice.update({
        where: { id: invoice.id },
        data: {
          status: invoice.status === "DRAFT" ? "SENT" : invoice.status,
          sentAt: new Date(),
        },
      });

      try {
        await WorkflowEvents.dispatchFinanceEvent(
          "status_changed",
          "invoice",
          input.organizationId,
          {
            id: updated.id,
            invoiceNumber: updated.invoiceNumber,
            status: updated.status,
            previousStatus: invoice.status,
            organizationId: updated.organizationId,
          },
          ctx.user.id
        );
      } catch (workflowError) {
        console.error("Workflow dispatch failed:", workflowError);
      }

      return updated;
    }),

  sendReminder: createPermissionProcedure(PERMISSIONS.FINANCE_WRITE)
    .input(
      z.object({ id: z.string().cuid(), organizationId: z.string().cuid() })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);
      const invoice = await db.invoice.findUnique({
        where: { id: input.id },
        include: { items: true },
      });
      if (!invoice || invoice.organizationId !== input.organizationId) {
        throw new Error("Invoice not found for organization");
      }
      if (!invoice.customerEmail) throw new Error("Customer email missing");

      let token = invoice.publicToken;
      if (!token) {
        token = newPublicToken();
        await db.invoice.update({
          where: { id: invoice.id },
          data: { publicToken: token },
        });
      }

      const { settings, organization, businessName } =
        await loadInvoiceContext(invoice);
      const balance = balanceDue(
        invoice.totalAmount.toString(),
        invoice.paidAmount.toString()
      );
      const vars = emailVars(invoice, businessName, balance.toString());
      const { subject, message } = resolveTemplate("reminder", settings, vars);

      const pdf = await renderInvoicePdf(
        buildInvoiceDocumentData({ invoice, settings, organization })
      );
      const html = await render(
        ReminderEmail({
          companyName: businessName,
          logoUrl: settings?.logoUrl ?? organization?.logo ?? null,
          message,
          viewUrl: publicInvoiceUrl(token),
          invoiceNumber: invoice.invoiceNumber,
          amountDue: vars.amountDue,
          dueDate: vars.dueDate,
        })
      );

      const resend = new Resend(env.RESEND_API_KEY);
      await resend.emails.send({
        from: `${env.RESEND_FROM_NAME} <${env.RESEND_FROM_EMAIL}>`,
        to: invoice.customerEmail,
        subject,
        html,
        attachments: [
          { filename: `invoice-${invoice.invoiceNumber}.pdf`, content: pdf },
        ],
      });

      return db.invoice.update({
        where: { id: invoice.id },
        data: { lastReminder: new Date() },
      });
    }),
});
