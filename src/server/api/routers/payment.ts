import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { paymentService } from "~/lib/services/payment-service";
import { TRPCError } from "@trpc/server";

export const paymentRouter = createTRPCRouter({
  /**
   * Create a Stripe payment link for an invoice
   */
  createPaymentLink: protectedProcedure
    .input(
      z.object({
        invoiceId: z.string(),
        organizationId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.requirePermission(input.organizationId);

      // Get the invoice
      const invoice = await ctx.db.invoice.findUnique({
        where: {
          id: input.invoiceId,
          organizationId: input.organizationId,
        },
      });

      if (!invoice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      // Check if invoice is already paid
      if (invoice.status === "PAID") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invoice is already paid",
        });
      }

      // Create payment link
      const result = await paymentService.createPaymentLink(invoice);

      if (!result.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error ?? "Failed to create payment link",
        });
      }

      return {
        success: true,
        paymentUrl: result.paymentUrl,
        sessionId: result.sessionId,
      };
    }),

  /**
   * Get payment link for an invoice (if it exists)
   */
  getPaymentLink: protectedProcedure
    .input(
      z.object({
        invoiceId: z.string(),
        organizationId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      await ctx.requirePermission(input.organizationId);

      const invoice = await ctx.db.invoice.findUnique({
        where: {
          id: input.invoiceId,
          organizationId: input.organizationId,
        },
        select: {
          id: true,
          stripePaymentUrl: true,
          stripeSessionId: true,
          status: true,
        },
      });

      if (!invoice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      return {
        paymentUrl: invoice.stripePaymentUrl,
        sessionId: invoice.stripeSessionId,
        status: invoice.status,
      };
    }),

  /**
   * Record a manual payment (for non-Stripe payments)
   */
  recordManualPayment: protectedProcedure
    .input(
      z.object({
        invoiceId: z.string(),
        organizationId: z.string(),
        amount: z.number().positive(),
        paymentMethod: z.enum([
          "CREDIT_CARD",
          "BANK_TRANSFER",
          "CASH",
          "CHECK",
          "PAYPAL",
          "OTHER",
        ]),
        reference: z.string().optional(),
        paymentDate: z.date(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.requirePermission(input.organizationId);

      // Get the invoice
      const invoice = await ctx.db.invoice.findUnique({
        where: {
          id: input.invoiceId,
          organizationId: input.organizationId,
        },
      });

      if (!invoice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      // Record the payment
      await paymentService.markInvoiceAsPaid(input.invoiceId, {
        amount: input.amount,
        currency: invoice.currency,
        paymentMethod: input.paymentMethod,
        transactionId: input.reference ?? `manual_${Date.now()}`,
        paidAt: input.paymentDate,
      });

      return {
        success: true,
        message: "Payment recorded successfully",
      };
    }),

  /**
   * Get payment history for an invoice
   */
  getPaymentHistory: protectedProcedure
    .input(
      z.object({
        invoiceId: z.string(),
        organizationId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      await ctx.requirePermission(input.organizationId);

      const invoice = await ctx.db.invoice.findUnique({
        where: {
          id: input.invoiceId,
          organizationId: input.organizationId,
        },
        include: {
          payments: {
            orderBy: {
              paymentDate: "desc",
            },
          },
        },
      });

      if (!invoice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      return {
        payments: invoice.payments,
        totalPaid: invoice.paidAmount,
        totalAmount: invoice.totalAmount,
        remainingAmount:
          Number(invoice.totalAmount) - Number(invoice.paidAmount),
      };
    }),

  /**
   * Refund a payment
   */
  refundPayment: protectedProcedure
    .input(
      z.object({
        paymentId: z.string(),
        organizationId: z.string(),
        amount: z.number().positive().optional(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.requirePermission(input.organizationId);

      // Get the payment
      const payment = await ctx.db.payment.findUnique({
        where: {
          id: input.paymentId,
        },
        include: {
          invoice: true,
        },
      });

      if (!payment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payment not found",
        });
      }

      // Verify organization access
      if (payment.invoice.organizationId !== input.organizationId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      const refundAmount = input.amount ?? Number(payment.amount);

      // Update payment with refund
      await ctx.db.$transaction([
        ctx.db.payment.update({
          where: { id: input.paymentId },
          data: {
            status:
              refundAmount >= Number(payment.amount)
                ? "REFUNDED"
                : "PARTIALLY_REFUNDED",
            refundedAmount: Number(payment.refundedAmount) + refundAmount,
            notes: input.reason
              ? `${payment.notes ?? ""}\nRefund: ${input.reason}`
              : payment.notes,
          },
        }),
        ctx.db.invoice.update({
          where: { id: payment.invoiceId },
          data: {
            paidAmount: {
              decrement: refundAmount,
            },
            status:
              Number(payment.invoice.paidAmount) - refundAmount <= 0
                ? "SENT"
                : "PARTIALLY_PAID",
          },
        }),
      ]);

      return {
        success: true,
        message: "Payment refunded successfully",
        refundAmount,
      };
    }),
});
