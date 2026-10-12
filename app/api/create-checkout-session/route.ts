import { NextResponse } from "next/server";
import { productGateEnabled } from "@/lib/product-access";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

import { fetchLatestSubscriptionForUser } from "@/lib/smart-cart-billing";
import { getStripeMonthlyPriceId, getStripeServerClient } from "@/lib/stripe";

function getBaseUrl(request: Request) {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, "");
  }

  return new URL(request.url).origin;
}

export async function POST(request: Request) {
  if(productGateEnabled())return NextResponse.json({error:"Paid subscriptions are not available during this invitation-only beta. Beta participation requires no payment."},{status:403});
  const match = /^Bearer ([^\s]+)$/i.exec(request.headers.get("authorization") ?? "");
  if (!match) return NextResponse.json({ error: "Please sign in before upgrading." }, { status: 401 });
  let userId: string; let email: string; let plan: string;
  try {
    const admin = getSupabaseAdminClient();
    const { data, error } = await admin.auth.getUser(match[1]);
    if (error) return NextResponse.json({ error: "Unable to verify your account." }, { status: error.status && error.status < 500 ? 401 : 503 });
    if (!data.user || data.user.is_anonymous || !data.user.email || !data.user.email_confirmed_at) return NextResponse.json({ error: "Please sign in with a verified email." }, { status: 401 });
    userId = data.user.id; email = data.user.email;
    const profile = await admin.from("smartcart_profiles").select("plan").eq("id", userId).maybeSingle();
    if (profile.error) return NextResponse.json({ error: "Unable to verify your membership." }, { status: 503 });
    plan = (profile.data as { plan?: string } | null)?.plan ?? "free";
  } catch { return NextResponse.json({ error: "Unable to verify your account." }, { status: 503 }); }

  if (plan === "plus") {
    return NextResponse.json(
      { error: "This account is already on MealCaddie Plus." },
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
