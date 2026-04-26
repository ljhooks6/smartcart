import Stripe from "stripe";

import { NextResponse } from "next/server";
import {
  isStripeSubscriptionActive,
  setSmartCartPlanForUser,
  upsertSmartCartSubscription,
} from "@/lib/smart-cart-billing";
import { getStripeServerClient } from "@/lib/stripe";

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET is missing." },
      { status: 500 },
    );
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature header." },
      { status: 400 },
    );
  }

  const rawBody = await request.text();

  let event: Stripe.Event;

  try {
    const stripe = getStripeServerClient();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid Stripe webhook signature." },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id?.trim() || "";
        const subscriptionId =
          typeof session.subscription === "string" ? session.subscription : null;
        const customerId =
          typeof session.customer === "string" ? session.customer : null;

        if (userId && subscriptionId) {
          await upsertSmartCartSubscription({
            plan: "plus",
            providerCustomerId: customerId,
            providerSubscriptionId: subscriptionId,
            status: session.payment_status === "paid" ? "active" : "incomplete",
            userId,
          });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const subscriptionWithPeriod = subscription as Stripe.Subscription & {
          current_period_end?: number | null;
        };
        const userId =
          subscription.metadata?.supabase_user_id?.trim() ||
          subscription.items.data[0]?.metadata?.supabase_user_id?.trim() ||
          "";
        const customerId =
          typeof subscription.customer === "string" ? subscription.customer : null;
        const isActive = isStripeSubscriptionActive(subscription.status);

        if (userId) {
          await upsertSmartCartSubscription({
            currentPeriodEnd: subscriptionWithPeriod.current_period_end,
            plan: isActive ? "plus" : "free",
            providerCustomerId: customerId,
            providerSubscriptionId: subscription.id,
            status: subscription.status,
            userId,
          });
          await setSmartCartPlanForUser(userId, isActive ? "plus" : "free");
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook processing failed." },
      { status: 500 },
    );
  }
}
