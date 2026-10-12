import { getSupabaseAdminClient } from "./supabase-admin";
import type { SupabaseClient } from "@supabase/supabase-js";

export function productGateEnabled(env: Record<string, string | undefined> = process.env) {
  return env.BETA_PRODUCT_ACCESS_ENABLED === "true" && (env.VERCEL_ENV !== "production" || env.BETA_PRODUCT_ACCESS_RELEASE_APPROVED === "true");
}
export async function productAccessForUser(userId: string | null) {
  if (!productGateEnabled()) return { allowed: true, reason: "gate_disabled" };
  if (!userId) return { allowed: false, reason: "sign_in" };
  const { data, error } = await (getSupabaseAdminClient() as SupabaseClient).rpc("beta_product_access", { p_user: userId });
  if (error || !data || typeof data.allowed !== "boolean") throw Error("Access verification unavailable.");
  return data as { allowed: boolean; reason: string };
}
export async function requireProductAccess(request: Request) {
  if (!productGateEnabled()) return null;
  const token = /^Bearer ([^\s]+)$/i.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!token) return Response.json({ error: "Sign in with an invited, activated account to use MealCaddie.", code: "BETA_ACCESS_REQUIRED" }, { status: 401 });
  try {
    const { data, error } = await getSupabaseAdminClient().auth.getUser(token);
    if (error || !data.user || !data.user.email_confirmed_at || data.user.is_anonymous) return Response.json({ error: "A verified MealCaddie account is required." }, { status: 401 });
    const access = await productAccessForUser(data.user.id);
    return access.allowed ? null : Response.json({ error: "Product access requires active beta participation or preserved existing access. Your account and saved content have not been deleted.", code: "BETA_ACCESS_REQUIRED", reason: access.reason }, { status: 403, headers: { "Cache-Control": "private, no-store" } });
  } catch { return Response.json({ error: "We could not verify product access. Please retry.", code: "ACCESS_UNAVAILABLE" }, { status: 503 }); }
}
