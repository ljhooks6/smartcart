import { createHash } from "node:crypto";
import { betaJson, betaStorageClient, boundedJson } from "./beta-server";
import { onboardingEnabled, betaEntitlementsEnabled, invitationSendingEnabled, participantAction, adminOnboardingAction, sameOrigin } from "./beta-onboarding-domain";
import { pilotIdentityAllowed } from "./beta-pilot";

export async function onboardingAccess(request: Request, admin = false) {
  if (!onboardingEnabled()) return { response: betaJson({ error: "Beta onboarding is not enabled in this environment." }, 404) };
  if (!sameOrigin(request)) return { response: betaJson({ error: "Invalid request origin." }, 403) };
  const token = /^Bearer ([^\s]+)$/i.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!token) return { response: betaJson({ error: "Sign in to MealCaddie, then reopen your invitation." }, 401) };
  try {
    const client = betaStorageClient();
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user || data.user.is_anonymous || !data.user.email_confirmed_at) return { response: betaJson({ error: "A verified MealCaddie account is required." }, error?.status && error.status >= 500 ? 503 : 401) };
    if (admin) {
      const check = await client.rpc("beta_assert_admin", { p_actor: data.user.id });
      if (check.error) return { response: betaJson({ error: "Administrator access is required." }, check.error.message.includes("admin required") ? 403 : 503) };
    }
    return { client, user: data.user };
  } catch { return { response: betaJson({ error: "Account verification is temporarily unavailable." }, 503) }; }
}
export function onboardingError(error: { message: string }) {
  const message = error.message;
  if (message.includes("rate limit")) return betaJson({ error: "Too many attempts. Please try again later." }, 429);
  if (/wrong recipient|verified account|admin required/.test(message)) return betaJson({ error: "This account cannot perform that action. Use the verified account that received the invitation." }, 403);
  if (/invalid|expired|cooldown|resend limit|capacity|boundary|inactive|approved|already|participation required|disabled|stale/.test(message)) return betaJson({ error: "This change is unavailable. Check invitation expiry, account matching, program boundaries and cohort capacity." }, 409);
  return betaJson({ error: "Beta services are temporarily unavailable. No billing change was made." }, 503);
}
export async function participantGet(request: Request) {
  const access = await onboardingAccess(request); if ("response" in access) return access.response;
  const { data, error } = await access.client.from("beta_participations").select("id,cohort,activated_at,expires_at,revoked_at,withdrawn_at,engagement_consent").eq("user_id", access.user.id).maybeSingle();
  if (error) return onboardingError(error);
  const [plan, baseline] = await Promise.all([
    access.client.rpc("beta_effective_plan", { p_user: access.user.id }),
    access.client.from("smartcart_profiles").select("plan").eq("id", access.user.id).maybeSingle(),
  ]);
  if (plan.error || baseline.error) return betaJson({ error: "Membership is temporarily unavailable." }, 503);
  const feedback = data ? await access.client.from("beta_feedback").select("id,category,feature,message,status,created_at").eq("participation_id", data.id).order("created_at", { ascending: false }).limit(20) : { data: [], error: null };
  if (feedback.error) return onboardingError(feedback.error);
  const billingPlan = baseline.data?.plan === "plus" ? "plus" : "free";
  return betaJson({ verifiedEmail: access.user.email, participation: data, featurePlan: betaEntitlementsEnabled() ? plan.data : billingPlan, billingPlan, feedback: feedback.data });
}
// Read-only invitation review: the raw token stays in the POST body and is
// hashed before lookup. No invitation details leave the server for another user.
export async function invitationReview(request: Request) {
  const access = await onboardingAccess(request); if ("response" in access) return access.response;
  let body: unknown; try { body = await boundedJson(request); } catch { return betaJson({ error: "Invalid invitation." }, 400); }
  const input = body as { token?: unknown };
  if (!input || Object.keys(input).length !== 1 || typeof input.token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(input.token)) return betaJson({ error: "Invalid invitation." }, 400);
  const result = await access.client.from("beta_invitations").select("id,state,bound_user_id,expires_at,beta_applications(email,cohort,status)").eq("token_hash", createHash("sha256").update(input.token).digest("hex")).maybeSingle();
  if (result.error) return betaJson({ error: "We couldn't check your invitation. Try again." }, 503);
  const row = result.data;
  if (!row) return betaJson({ state: "unavailable" });
  const applicant = row.beta_applications as unknown as { email: string; cohort: string; status: string };
  if (!pilotIdentityAllowed(access.user.id, access.user.email) || applicant.email !== access.user.email?.toLowerCase() || row.bound_user_id !== access.user.id) return betaJson({ state: "wrong_account" });
  const state = row.state === "consumed" ? "accepted" : row.state === "revoked" ? "revoked" : row.state !== "issued" || new Date(row.expires_at).getTime() <= Date.now() ? "expired" : "ready";
  return betaJson({ state, cohort: applicant.cohort, expiresAt: row.expires_at });
}
export async function participantPost(request: Request) {
  const access = await onboardingAccess(request); if ("response" in access) return access.response;
  let body: unknown; try { body = await boundedJson(request); } catch { return betaJson({ error: "Invalid request." }, 400); }
  const parsed = participantAction.safeParse(body); if (!parsed.success) return betaJson({ error: "Check the form fields and consent." }, 400);
  const input = parsed.data;
  if (input.action === "accept" && !betaEntitlementsEnabled()) return betaJson({ error: "Activation is disabled pending release approval." }, 409);
  if (input.action === "accept" && !pilotIdentityAllowed(access.user.id, access.user.email)) return betaJson({ error: "This verified account is not approved for the controlled pilot." }, 403);
  const rate = await access.client.rpc("beta_onboarding_rate", { p_user: access.user.id, p_kind: input.action === "accept" ? "accept" : input.action === "feedback" ? "feedback" : "settings" });
  if (rate.error) return onboardingError(rate.error);
  const result = input.action === "accept" ? await access.client.rpc("beta_accept_invitation", { p_user: access.user.id, p_hash: createHash("sha256").update(input.token).digest("hex") }) :
    input.action === "feedback" ? await access.client.rpc("beta_submit_feedback", { p_user: access.user.id, p_category: input.category, p_feature: input.feature, p_message: input.message, p_key: input.requestKey }) :
    await access.client.rpc("beta_participant_settings", { p_user: access.user.id, p_consent: input.consent, p_withdraw: input.withdraw });
  if (result.error) return onboardingError(result.error);
  return betaJson({ message: input.action === "accept" ? "Welcome to the MealCaddie beta. No subscription or payment is required." : input.action === "feedback" ? "Thank you. Your feedback was saved." : input.withdraw ? "Participation withdrawn. Your MealCaddie account and saved content remain available." : "Preferences saved.", result: result.data });
}
export async function adminGet(request: Request) {
  const access = await onboardingAccess(request, true); if ("response" in access) return access.response;
  const results = await Promise.all([
    access.client.from("beta_invitations").select("id,application_id,state,created_at,issued_at,expires_at,consumed_at,revoked_at,beta_applications(email,cohort)").order("created_at", { ascending: false }).limit(100),
    access.client.from("beta_invitation_deliveries").select("invitation_id,status,provider_id,attempted_at,updated_at,error_code").order("updated_at", { ascending: false }).limit(100),
    access.client.from("beta_participations").select("id,user_id,cohort,activated_at,expires_at,revoked_at,withdrawn_at,engagement_consent,beta_applications(email)").order("activated_at", { ascending: false }).limit(100),
    access.client.from("beta_feedback").select("id,participation_id,category,feature,message,status,admin_note,created_at,updated_at").order("created_at", { ascending: false }).limit(100),
    access.client.from("beta_engagement_daily").select("participation_id,day,action,total").order("day", { ascending: false }).limit(200),
    access.client.from("beta_programs").select("wave_size,participation_limit_at,participation_days,onboarding_enabled,invitation_delivery_enabled").eq("slug", "public-beta").single(),
  ]);
  const failed = results.find(result => result.error); if (failed?.error) return onboardingError(failed.error);
  return betaJson(Object.fromEntries(["invitations", "deliveries", "participants", "feedback", "engagement", "program"].map((name, i) => [name, results[i].data])));
}
export async function adminPost(request: Request) {
  const access = await onboardingAccess(request, true); if ("response" in access) return access.response;
  let body: unknown; try { body = await boundedJson(request); } catch { return betaJson({ error: "Invalid request." }, 400); }
  const parsed = adminOnboardingAction.safeParse(body); if (!parsed.success) return betaJson({ error: "Check the requested change." }, 400);
  const input = parsed.data;
  if (["promote", "extend"].includes(input.action) && !betaEntitlementsEnabled()) return betaJson({ error: "Privilege changes are disabled pending release approval." }, 409);
  if (input.action === "issue" && !invitationSendingEnabled()) return betaJson({ error: "Invitation queueing is disabled until delivery is explicitly approved." }, 409);
  const rate = await access.client.rpc("beta_onboarding_rate", { p_user: access.user.id, p_kind: "admin" });
  if (rate.error) return onboardingError(rate.error);
  const result = input.action === "issue" ? await access.client.rpc("beta_issue_invitation", { p_actor: access.user.id, p_application: input.applicationId }) :
    input.action === "revoke_invitation" ? await access.client.rpc("beta_revoke_invitation", { p_actor: access.user.id, p_id: input.id }) :
    input.action === "review_feedback" ? await access.client.rpc("beta_review_feedback", { p_actor: access.user.id, p_id: input.id, p_status: input.status, p_note: input.note }) :
    input.action === "configure" ? await access.client.rpc("beta_set_onboarding_config", { p_actor: access.user.id, p_wave: input.waveSize, p_boundary: input.boundary }) :
    await access.client.rpc("beta_manage_participation", { p_actor: access.user.id, p_id: input.id, p_action: input.action, p_reason: input.reason, p_until: input.until ?? null });
  if (result.error) return onboardingError(result.error);
  return betaJson({ message: input.action === "issue" ? "Invitation queued. Delivery remains subject to separate sending approval." : "Change saved. Billing and saved content were not changed.", result: result.data });
}
