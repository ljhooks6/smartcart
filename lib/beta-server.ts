import type { SupabaseClient } from "@supabase/supabase-js";
import { createHmac } from "node:crypto";
import { getSupabaseAdminClient } from "./supabase-admin";
import { betaPagesEnabled } from "./beta-domain";

export function betaStorageClient() { return getSupabaseAdminClient() as SupabaseClient; }
export function betaJson(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" } });
}
export async function requireBetaAdmin(request: Request) {
  if (!betaPagesEnabled()) return { response: betaJson({ error: "Not found." }, 404) };
  const match = /^Bearer ([^\s]+)$/i.exec(request.headers.get("authorization") ?? "");
  if (!match) return { response: betaJson({ error: "Please sign in to your administrator account." }, 401) };
  try {
    const client = betaStorageClient();
    const { data, error } = await client.auth.getUser(match[1]);
    if (error) return { response: betaJson({ error: "Unable to verify your account." }, error.status && error.status < 500 ? 401 : 503) };
    if (!data.user || data.user.is_anonymous) return { response: betaJson({ error: "Please sign in again." }, 401) };
    const admin = await client.from("beta_admins").select("user_id").eq("user_id", data.user.id).is("revoked_at", null).maybeSingle();
    if (admin.error) return { response: betaJson({ error: "Administration is temporarily unavailable." }, 503) };
    if (!admin.data) return { response: betaJson({ error: "Administrator access is required." }, 403) };
    return { client, userId: data.user.id };
  } catch { return { response: betaJson({ error: "Administration is temporarily unavailable." }, 503) }; }
}
export async function boundedJson(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw Error("json");
  if (Number(request.headers.get("content-length") ?? 0) > 12000) throw Error("size");
  if (!request.body) throw Error("json");
  const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let length = 0;
  while (true) { const { done, value } = await reader.read(); if (done) break; length += value.byteLength; if (length > 12000) { await reader.cancel(); throw Error("size"); } chunks.push(value); }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}
export function betaNetworkHash(request: Request) {
  const secret = process.env.BETA_RATE_LIMIT_SECRET;
  if (!secret || secret.length < 32) throw Error("configuration");
  const ip = process.env.VERCEL ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() : "local-development";
  if (!ip) throw Error("network");
  return createHmac("sha256", secret).update(`beta:${ip}`).digest("hex");
}
export async function verifyBetaChallenge(token: string, request: Request) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return false;
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret, response: token }), signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return false;
  const result = await response.json() as { success?: boolean; hostname?: string; action?: string };
  return result.success === true && result.hostname === new URL(request.url).hostname && result.action === "beta_application";
}
export function betaDatabaseError(error: { message: string } | null) {
  if (error?.message.includes("capacity")) return betaJson({ error: "That cohort is full. Adjust its target or choose another cohort." }, 409);
  if (error?.message.includes("stale")) return betaJson({ error: "This application changed. Refresh before saving." }, 409);
  if (error?.message.includes("transition")) return betaJson({ error: "That status change is not available in Phase 1." }, 400);
  if (error?.message.includes("admin")) return betaJson({ error: "Administrator access is required." }, 403);
  return betaJson({ error: "We couldn't save that change. Please retry." }, 503);
}
