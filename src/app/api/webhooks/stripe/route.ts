import { NextRequest, NextResponse } from "next/server";
import { paymentService } from "~/lib/services/payment-service";
import { env } from "~/env";
import Stripe from "stripe";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-09-30.clover",
  typescript: true,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        env.STRIPE_WEBHOOK_SECRET ?? ""
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Handle the event
    const result = await paymentService.handleWebhook({
      type: event.type,
      data: event.data,
    } as any);

    if (!result.success) {
      console.error("Webhook handling failed:", result.message);
      return NextResponse.json({ error: result.message }, { status: 500 });
    }

    return NextResponse.json({
      received: true,
      message: result.message,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
