import { createHmac } from "node:crypto";
import { getSupabaseAdminClient } from "./supabase-admin";
import { pilotMode } from "./beta-pilot";
import type { SupabaseClient } from "@supabase/supabase-js";
export function pilotAIBudgetEnabled(env: Record<string, string | undefined> = process.env) {
  return pilotMode(env) && env.BETA_PILOT_AI_LIMIT_ENABLED === "true" && env.VERCEL_ENV !== "production" && (!env.VERCEL || env.VERCEL_ENV === "preview");
}
// One shared pilot budget across every provider-starting feature, not per-browser
// counters. Reuse the existing atomic 5/hour, 20/day counter and 48-hour retention.
export async function pilotAIBudget(body: unknown): Promise<Response | null> {
  if (!pilotAIBudgetEnabled()) return null;
  try {
    if (Buffer.byteLength(JSON.stringify(body), "utf8") > 32000) return Response.json({ error: "Please shorten this pilot request before trying again." }, { status: 413 });
    const secret = process.env.BETA_RATE_LIMIT_SECRET;
    if (!secret || secret.length < 32) throw Error("Pilot budget unavailable");
    const key = createHmac("sha256", secret).update("controlled-pilot-ai-program").digest("hex");
    const client = getSupabaseAdminClient() as SupabaseClient;
    const result = await client.rpc("beta_check_rate", { p_key: key });
    if (result.error || typeof result.data !== "boolean") throw Error("Pilot budget unavailable");
    if (!result.data) return Response.json({ error: "The controlled pilot has reached its shared AI allowance. Existing meals, recipes and feedback remain available. Try again after the allowance resets." }, { status: 429, headers: { "Retry-After": "3600", "Cache-Control": "private, no-store" } });
    return null;
  } catch { return Response.json({ error: "Pilot AI capacity cannot be verified. No provider request was started." }, { status: 503 }); }
}
