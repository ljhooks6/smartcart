import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { betaStorageClient } from "./beta-server";

export const emailKinds = ["application", "invitation", "welcome", "feedback", "admin"] as const;
export type EmailKind = typeof emailKinds[number];
const sender = "MealCaddie Beta <beta@mealcaddie.app>";
const replyTo = "beta@mealcaddie.app";
const previewOrigin = "https://smartcart-git-feature-beta-recruitment-ljhooks6s-projects.vercel.app";
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]!));
export function betaEmailOrigin(env: Record<string, string | undefined> = process.env) {
  if (env.VERCEL_ENV === "production") return "https://mealcaddie.app";
  const url = new URL(env.BETA_PREVIEW_ORIGIN ?? previewOrigin);
  if (url.protocol !== "https:" || url.username || url.password || url.port || url.pathname !== "/" || url.search || url.hash || ![new URL(previewOrigin).hostname, "preview.mealcaddie.app"].includes(url.hostname)) throw Error("Preview email origin is not approved.");
  return url.origin;
}
export function prepareBetaEmail(kind: EmailKind, recipient: string) {
  const origin = betaEmailOrigin();
  const to = z.string().email().max(254).parse(recipient.trim().toLowerCase());
  const content: Record<EmailKind, [string, string]> = {
    application: ["MealCaddie beta application received", "Thanks for raising your hand. Your application is ready for review. Applying does not guarantee acceptance; selected testers will receive invitation details when recruitment is ready."],
    invitation: ["Your MealCaddie beta invitation draft", "We would love your help shaping MealCaddie. This draft does not activate beta access. Invitation redemption and temporary Plus access require the next approved phase."],
    welcome: ["Welcome to MealCaddie", "A calmer week starts here. Explore your meals, recipes and groceries at your own pace."],
    feedback: ["Help improve MealCaddie", "Your experience matters. When you have a moment, share what worked well and what made planning harder through MealCaddie’s feedback controls."],
    admin: ["MealCaddie beta administration update", "Open your private dashboard to review beta applications. Applicant answers and contact details are intentionally omitted from this email."],
  };
  const [subject, copy] = content[kind];
  const link = `${origin}${kind === "admin" ? "/admin/beta" : "/"}`;
  const text = `MealCaddie\n\n${copy}\n\n${link}\n\nQuestions? Reply to beta@mealcaddie.app. Privacy: ${origin}/beta/privacy`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head><body style="margin:0;background:#faf7f1;color:#182a20;font-family:Arial,sans-serif"><main style="max-width:600px;margin:auto;padding:32px"><h1 style="color:#2f5d3d">MealCaddie</h1><h2>${escapeHtml(subject)}</h2><p style="line-height:1.6">${escapeHtml(copy)}</p><p><a href="${escapeHtml(link)}" style="color:#2f5d3d">Open MealCaddie</a></p><p>Questions? Reply to beta@mealcaddie.app.</p><p><a href="${escapeHtml(origin)}/beta/privacy">Beta privacy notice</a></p></main></body></html>`;
  return { from: sender, to, reply_to: replyTo, subject, text, html };
}
export function emailTestRecipient() { return z.string().email().max(254).parse(process.env.BETA_EMAIL_TEST_RECIPIENT); }
// The owner-test route verifies the session before invoking this gated sender.
// Claims survive timeouts: uncertain deliveries are never automatically retried.
export async function sendApprovedBetaTest(verifiedAdminId: string) {
  if (verifiedAdminId !== "b172ef8f-f5d7-4faa-abdf-f3250b2a6ef3") throw Error("Owner test authorization is required.");
  const kind = "application";
  if (process.env.VERCEL_ENV !== "preview" || process.env.BETA_EMAIL_TEST_SEND_APPROVED !== "true") throw Error("Email delivery is disabled.");
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw Error("Email provider is unavailable.");
  if (emailTestRecipient().toLowerCase() !== "mealcaddie@proton.me") throw Error("Owner test recipient is not approved.");
  const payload = prepareBetaEmail(kind, "mealcaddie@proton.me");
  const key = "beta-test-v1-" + createHash("sha256").update("MealCaddie owner application test 2026-10-10 v1").digest("hex");
  const client = betaStorageClient();
  const claim = await client.from("beta_email_deliveries").insert({ idempotency_key: key, kind, state: "claimed" });
  if (claim.error?.code === "23505") return { duplicate: true };
  if (claim.error) throw Error("Email reservation failed.");
  try {
    const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": key }, body: JSON.stringify(payload), signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw Error("provider");
    const data = await response.json() as { id?: string };
    if (!data.id || !/^[a-zA-Z0-9_-]{1,100}$/.test(data.id)) throw Error("provider");
    const saved = await client.from("beta_email_deliveries").update({ state: "sent", provider_id: data.id }).eq("idempotency_key", key);
    if (saved.error) throw Error("ledger");
    return { sent: true };
  } catch {
    await client.from("beta_email_deliveries").update({ state: "uncertain" }).eq("idempotency_key", key).then(() => undefined, () => undefined);
    // Do not log the provider body, request, recipient, API key or personal data.
    throw Error("Delivery outcome needs administrator review. Automatic retry is disabled.");
  }
}
