import { getSupabaseAdminClient } from "./supabase-admin";
import type { SmartCartPlan } from "./smart-cart-membership";

type SmartCartSubscriptionRow = {
  id?: number | null;
  user_id?: string | null;
  provider?: string | null;
  plan?: SmartCartPlan | null;
  status?: string | null;
  provider_customer_id?: string | null;
  provider_subscription_id?: string | null;
  current_period_end?: string | null;
};

const ACTIVE_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
]);

export function isStripeSubscriptionActive(status: string | null | undefined) {
  return ACTIVE_SUBSCRIPTION_STATUSES.has((status ?? "").trim().toLowerCase());
}

export async function fetchLatestSubscriptionForUser(userId: string) {
  if (!userId) {
    return null;
  }

  const supabaseAdmin = getSupabaseAdminClient() as any;
  const { data, error } = await supabaseAdmin
    .from("smartcart_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data ?? null) as SmartCartSubscriptionRow | null;
}

export async function setSmartCartPlanForUser(userId: string, plan: SmartCartPlan) {
  if (!userId) {
    return;
  }

  const supabaseAdmin = getSupabaseAdminClient() as any;
  const { error } = await supabaseAdmin
    .from("smartcart_profiles")
    .update({ plan })
    .eq("id", userId);

  if (error) {
    throw error;
  }
}

export async function upsertSmartCartSubscription(args: {
  currentPeriodEnd?: number | null;
  plan: SmartCartPlan;
  providerCustomerId?: string | null;
  providerSubscriptionId?: string | null;
  status: string;
  userId: string;
}) {
  const { currentPeriodEnd, plan, providerCustomerId, providerSubscriptionId, status, userId } =
    args;

  if (!userId) {
    return;
  }

  const supabaseAdmin = getSupabaseAdminClient() as any;
  const current_period_end =
    typeof currentPeriodEnd === "number"
      ? new Date(currentPeriodEnd * 1000).toISOString()
      : null;

  const { error } = await supabaseAdmin
    .from("smartcart_subscriptions")
    .upsert(
      {
        current_period_end,
        plan,
        provider: "stripe",
        provider_customer_id: providerCustomerId ?? null,
        provider_subscription_id: providerSubscriptionId ?? null,
        status,
        user_id: userId,
      },
      { onConflict: "provider_subscription_id" },
    );

  if (error) {
    throw error;
  }
}
