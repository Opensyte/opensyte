import Stripe from "stripe";
import { env } from "~/env";
import { db } from "~/server/db";
import type { Invoice, InvoiceStatus } from "@prisma/client";

// Initialize Stripe
const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-09-30.clover",
  typescript: true,
});

export interface PaymentLinkResult {
  success: boolean;
  paymentUrl?: string;
  sessionId?: string;
  error?: string;
}

export interface PaymentDetails {
  amount: number;
  currency: string;
  paymentMethod: string;
  transactionId: string;
  paidAt: Date;
}

export interface StripeWebhookPayload {
  type: string;
  data: {
    object: Stripe.Checkout.Session | Stripe.PaymentIntent;
  };
}

export interface WebhookResult {
  success: boolean;
  message: string;
  invoiceId?: string;
}

export class PaymentService {
  /**
   * Create a Stripe payment link for an invoice
   */
  async createPaymentLink(invoice: Invoice): Promise<PaymentLinkResult> {
    try {
      // Create or retrieve Stripe customer
      let stripeCustomerId = invoice.stripeCustomerId;

      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: invoice.customerEmail,
          name: invoice.customerName ?? undefined,
          phone: invoice.customerPhone ?? undefined,
          metadata: {
            organizationId: invoice.organizationId,
            customerId: invoice.customerId,
          },
        });
        stripeCustomerId = customer.id;

        // Update invoice with Stripe customer ID
        await db.invoice.update({
          where: { id: invoice.id },
          data: { stripeCustomerId },
        });
      }

      // Create Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: invoice.currency.toLowerCase(),
              product_data: {
                name: `Invoice ${invoice.invoiceNumber}`,
                description: invoice.notes ?? undefined,
              },
              unit_amount: Math.round(Number(invoice.totalAmount) * 100), // Convert to cents
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${env.NEXT_PUBLIC_APP_URL}/invoices/${invoice.id}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${env.NEXT_PUBLIC_APP_URL}/invoices/${invoice.id}/payment-cancelled`,
        metadata: {
          invoiceId: invoice.id,
          organizationId: invoice.organizationId,
          invoiceNumber: invoice.invoiceNumber,
        },
        payment_intent_data: {
          metadata: {
            invoiceId: invoice.id,
            organizationId: invoice.organizationId,
          },
        },
      });

      // Update invoice with session details
      await db.invoice.update({
        where: { id: invoice.id },
        data: {
          stripeSessionId: session.id,
          stripePaymentUrl: session.url,
        },
      });

      return {
        success: true,
        paymentUrl: session.url ?? undefined,
        sessionId: session.id,
      };
    } catch (error) {
      console.error("Error creating payment link:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create payment link",
      };
    }
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(payload: StripeWebhookPayload): Promise<WebhookResult> {
    try {
      const { type, data } = payload;

      switch (type) {
        case "checkout.session.completed":
          return await this.handleCheckoutSessionCompleted(
            data.object as Stripe.Checkout.Session
          );

        case "payment_intent.succeeded":
          return await this.handlePaymentSucceeded(
            data.object as Stripe.PaymentIntent
          );

        case "payment_intent.payment_failed":
          return await this.handlePaymentFailed(
            data.object as Stripe.PaymentIntent
          );

        default:
          return {
            success: true,
            message: `Unhandled event type: ${type}`,
          };
      }
    } catch (error) {
      console.error("Error handling webhook:", error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to handle webhook",
      };
    }
  }

  /**
   * Handle successful checkout session
   */
  private async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session
  ): Promise<WebhookResult> {
    const invoiceId = session.metadata?.invoiceId;

    if (!invoiceId) {
      return {
        success: false,
        message: "Invoice ID not found in session metadata",
      };
    }

    // Get the invoice
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return {
        success: false,
        message: `Invoice ${invoiceId} not found`,
      };
    }

    // Update invoice status to PAID
    await this.markInvoiceAsPaid(invoiceId, {
      amount: (session.amount_total ?? 0) / 100, // Convert from cents
      currency: session.currency?.toUpperCase() ?? "USD",
      paymentMethod: "STRIPE",
      transactionId: session.payment_intent as string,
      paidAt: new Date(),
    });

    return {
      success: true,
      message: "Invoice marked as paid",
      invoiceId,
    };
  }

  /**
   * Handle successful payment intent
   */
  private async handlePaymentSucceeded(
    paymentIntent: Stripe.PaymentIntent
  ): Promise<WebhookResult> {
    const invoiceId = paymentIntent.metadata?.invoiceId;

    if (!invoiceId) {
      return {
        success: false,
        message: "Invoice ID not found in payment intent metadata",
      };
    }

    // Get the invoice
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return {
        success: false,
        message: `Invoice ${invoiceId} not found`,
      };
    }

    // Update invoice with payment intent ID
    await db.invoice.update({
      where: { id: invoiceId },
      data: {
        paymentIntentId: paymentIntent.id,
      },
    });

    return {
      success: true,
      message: "Payment intent recorded",
      invoiceId,
    };
  }

  /**
   * Handle failed payment intent
   */
  private async handlePaymentFailed(
    paymentIntent: Stripe.PaymentIntent
  ): Promise<WebhookResult> {
    const invoiceId = paymentIntent.metadata?.invoiceId;

    if (!invoiceId) {
      return {
        success: false,
        message: "Invoice ID not found in payment intent metadata",
      };
    }

    // Log the failure (you might want to add a payment attempts table)
    console.error(`Payment failed for invoice ${invoiceId}:`, {
      paymentIntentId: paymentIntent.id,
      lastPaymentError: paymentIntent.last_payment_error,
    });

    // Optionally update invoice with failure information
    await db.invoice.update({
      where: { id: invoiceId },
      data: {
        internalNotes: `Payment failed: ${paymentIntent.last_payment_error?.message ?? "Unknown error"}`,
      },
    });

    return {
      success: true,
      message: "Payment failure recorded",
      invoiceId,
    };
  }

  /**
   * Mark an invoice as paid and create payment record
   */
  async markInvoiceAsPaid(
    invoiceId: string,
    paymentDetails: PaymentDetails
  ): Promise<void> {
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    // Calculate new paid amount
    const newPaidAmount = Number(invoice.paidAmount) + paymentDetails.amount;
    const totalAmount = Number(invoice.totalAmount);

    // Determine new status
    let newStatus: InvoiceStatus;
    if (newPaidAmount >= totalAmount) {
      newStatus = "PAID";
    } else if (newPaidAmount > 0) {
      newStatus = "PARTIALLY_PAID";
    } else {
      newStatus = invoice.status;
    }

    // Update invoice and create payment record in a transaction
    await db.$transaction([
      db.invoice.update({
        where: { id: invoiceId },
        data: {
          status: newStatus,
          paidAmount: newPaidAmount,
        },
      }),
      db.payment.create({
        data: {
          invoiceId,
          amount: paymentDetails.amount,
          currency: paymentDetails.currency,
          method: paymentDetails.paymentMethod as any,
          reference: paymentDetails.transactionId,
          paymentDate: paymentDetails.paidAt,
          status: "COMPLETED",
          gatewayId: paymentDetails.transactionId,
        },
      }),
    ]);
  }

  /**
   * Record a partial payment
   */
  async recordPartialPayment(invoiceId: string, amount: number): Promise<void> {
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    await this.markInvoiceAsPaid(invoiceId, {
      amount,
      currency: invoice.currency,
      paymentMethod: "STRIPE",
      transactionId: `partial_${Date.now()}`,
      paidAt: new Date(),
    });
  }

  /**
   * Verify Stripe webhook signature
   */
  verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    try {
      stripe.webhooks.constructEvent(payload, signature, secret);
      return true;
    } catch (error) {
      console.error("Webhook signature verification failed:", error);
      return false;
    }
  }

  /**
   * Get Stripe instance for advanced operations
   */
  getStripeInstance(): Stripe {
    return stripe;
  }
}

// Export singleton instance
export const paymentService = new PaymentService();
