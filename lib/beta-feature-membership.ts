import { getSupabaseAdminClient } from "./supabase-admin";
import { betaEntitlementsEnabled } from "./beta-onboarding-domain";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function loadFeaturePlan(userId: string): Promise<"free" | "plus"> {
  const client = getSupabaseAdminClient() as SupabaseClient;
  if (betaEntitlementsEnabled()) {
    const { data, error } = await client.rpc("beta_effective_plan", { p_user: userId });
    if (error || (data !== "free" && data !== "plus")) throw Error("Feature membership unavailable.");
    return data;
  }
  const { data, error } = await client.from("smartcart_profiles").select("plan").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data?.plan === "plus" ? "plus" : "free";
}
