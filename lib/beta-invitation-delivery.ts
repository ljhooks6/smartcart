import { createHash, randomBytes } from "node:crypto";
import { invitationSendingEnabled } from "./beta-onboarding-domain";
import type { SupabaseClient } from "@supabase/supabase-js";

type Message = { from: string; to: string; reply_to: string; subject: string; text: string; html: string };
type Transport = (message: Message, idempotencyKey: string) => Promise<{ id: string }>;
export async function deliverOneInvitation(client: SupabaseClient, transport: Transport, env: Record<string, string | undefined> = process.env) {
  if (!invitationSendingEnabled(env)) throw Error("Invitation delivery is disabled.");
  // Provider quota is shared with SMTP. Require a dated operator headroom review;
  // no sending-only key is broadened to inspect private provider settings.
  const today = new Date().toISOString().slice(0, 10);
  if (env.BETA_EMAIL_CAPACITY_REVIEW_DATE !== today || Number(env.BETA_EMAIL_DAILY_HEADROOM ?? 0) < 20) throw Error("A current provider capacity review is required.");
  const origin = env.BETA_INVITATION_ORIGIN;
  if (!origin || !/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(origin)) throw Error("An explicitly reviewed invitation origin is required.");
  const token = randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(token).digest("hex");
  const claim = await client.rpc("beta_claim_delivery", { p_hash: hash });
  if (claim.error) throw Error("Unable to reserve delivery.");
  if (!claim.data) return { status: "idle" };
  const { id, email, idempotency_key } = claim.data as { id: string; email: string; idempotency_key: string };
  const link = `${origin}/beta/accept#invite=${token}`;
  const message: Message = {
    from: "MealCaddie Beta <beta@mealcaddie.app>", to: email, reply_to: "beta@mealcaddie.app", subject: "Your invitation to the MealCaddie beta",
    text: `You're invited to help shape MealCaddie. No payment or subscription is required. Open ${link} within seven days. Sign in with the verified email that received this message, then reopen this invitation and choose Accept invitation. Acceptance starts your temporary beta participation. Never forward this personal link. Need help? beta@mealcaddie.app`,
    html: `<div style="background:#fff7e9;padding:24px;font-family:Arial,sans-serif"><div style="max-width:560px;margin:auto;background:white;padding:24px"><h1 style="color:#194c3e">MealCaddie</h1><h2>You're invited to help shape MealCaddie</h2><p>No payment or subscription is required.</p><p><a href="${link}" style="display:inline-block;background:#194c3e;color:white;padding:16px;border-radius:12px">Review your invitation</a></p><p>This invitation expires in seven days. Sign in with the verified email that received this message, then reopen this invitation and choose Accept invitation.</p><p>Never forward your personal link. Need help? <a href="mailto:beta@mealcaddie.app">Contact the beta team</a>.</p></div></div>`,
  };
  let providerId: string;
  try { providerId = (await transport(message, idempotency_key)).id; }
  catch {
    await client.rpc("beta_finish_delivery", { p_id: id, p_status: "unknown", p_provider: null });
    return { status: "unknown", id }; // Never repeat an uncertain paid/external request.
  }
  const finish = await client.rpc("beta_finish_delivery", { p_id: id, p_status: "accepted", p_provider: providerId });
  if (finish.error) throw Error("Provider accepted; ledger confirmation is uncertain. Inspect before reissuing.");
  return { status: "accepted", id }; // No recipient, token, link or body in output/logs.
}

// No public send endpoint or automatic scheduler is enabled in Phase 3.
export const resendInvitationTransport: Transport = async (message, idempotencyKey) => {
  const key = process.env.RESEND_API_KEY;
  if (!invitationSendingEnabled() || !key) throw Error("Sending not approved.");
  const result = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": idempotencyKey }, body: JSON.stringify(message), signal: AbortSignal.timeout(10000) });
  if (!result.ok) throw Error("Provider did not confirm acceptance.");
  const body = await result.json() as { id?: string }; if (!body.id) throw Error("Missing provider confirmation.");
  return { id: body.id };
};
