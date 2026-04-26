import { NextResponse } from "next/server";

import { fetchLatestSubscriptionForUser } from "@/lib/smart-cart-billing";
import { getStripeMonthlyPriceId, getStripeServerClient } from "@/lib/stripe";

type CreateCheckoutSessionRequest = {
  userId?: string;
  email?: string;
  plan?: string;
};

function getBaseUrl(request: Request) {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, "");
  }

  return new URL(request.url).origin;
}

export async function POST(request: Request) {
  let body: CreateCheckoutSessionRequest;

  try {
    body = (await request.json()) as CreateCheckoutSessionRequest;
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const userId = body.userId?.trim() || "";
  const email = body.email?.trim() || "";
  const plan = body.plan?.trim() || "free";

  if (!userId || !email) {
    return NextResponse.json(
      { error: "Missing required fields: userId and email." },
      { status: 400 },
    );
  }

  if (plan === "plus") {
    return NextResponse.json(
      { error: "This account is already on SmartCart Plus." },
      { status: 400 },
    );
  }

  try {
    const stripe = getStripeServerClient();
    const priceId = getStripeMonthlyPriceId();
    const baseUrl = getBaseUrl(request);
    const existingSubscription = await fetchLatestSubscriptionForUser(userId);

    const session = await stripe.checkout.sessions.create({
      allow_promotion_codes: true,
      cancel_url: `${baseUrl}/?billing=cancelled`,
      customer: existingSubscription?.provider_customer_id ?? undefined,
      customer_email: existingSubscription?.provider_customer_id ? undefined : email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        smartcart_plan: "plus",
        supabase_user_id: userId,
      },
      mode: "subscription",
      subscription_data: {
        metadata: {
          smartcart_plan: "plus",
          supabase_user_id: userId,
        },
      },
      success_url: `${baseUrl}/?billing=success`,
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL.");
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create checkout session." },
      { status: 500 },
    );
  }
}

