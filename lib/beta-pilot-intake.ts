import { betaApplicationSchema, betaConsentVersion } from "./beta-domain";
import { betaJson, betaNetworkHash, boundedJson, verifyBetaChallenge } from "./beta-server";
import { onboardingAccess } from "./beta-onboarding-server";
import { pilotIdentityAllowed, pilotIntakeEnabled } from "./beta-pilot";

async function access(request: Request) {
  if (!pilotIntakeEnabled()) return { response: betaJson({ error: "Pilot intake is not open." }, 404) };
  const result = await onboardingAccess(request);
  if ("response" in result) return result;
  if (!pilotIdentityAllowed(result.user.id, result.user.email)) return { response: betaJson({ error: "This verified account is not one of the two approved pilot participants. Sign in with your participant account, then return here." }, 403) };
  return result;
}
export async function pilotIntakeGet(request: Request) {
  const result = await access(request); if ("response" in result) return result.response;
  const email = result.user.email!.trim().toLowerCase();
  const application = await result.client.from("beta_applications").select("status,cohort,beta_consent_at").eq("email", email).maybeSingle();
  if (application.error) return betaJson({ error: "Your application status is temporarily unavailable." }, 503);
  return betaJson({ email, application: application.data });
}
export async function pilotIntakePost(request: Request) {
  const result = await access(request); if ("response" in result) return result.response;
  try {
    const rate = await result.client.rpc("beta_check_rate", { p_key: betaNetworkHash(request) });
    if (rate.error) return betaJson({ error: "Applications are temporarily unavailable." }, 503);
    if (!rate.data) return Response.json({ error: "Please wait before trying again." }, { status: 429, headers: { "Retry-After": "3600", "Cache-Control": "private, no-store" } });
    let body: unknown;
    try { body = await boundedJson(request); } catch { return betaJson({ error: "Please submit a valid application." }, 400); }
    const parsed = betaApplicationSchema.safeParse(body);
    if (!parsed.success) return betaJson({ error: "Please check your answers and participation consent." }, 400);
    const input = parsed.data;
    const email = result.user.email!.trim().toLowerCase();
    if (input.email !== email) return betaJson({ error: "The application must use your verified participant email." }, 403);
    if (input.website) return betaJson({ message: "Thank you. Your application has been received for review." });
    if (!await verifyBetaChallenge(input.turnstileToken, request)) return betaJson({ error: "Please complete the verification again." }, 400);
    const saved = await result.client.rpc("beta_submit_application", { p_input: {
      email, frequency: input.frequency, challenges: input.challenges, interests: input.interests,
      plan_interest: input.planInterest, feedback_willing: input.feedbackWilling,
      beta_consent_version: betaConsentVersion, marketing_consent: input.marketingConsent,
      source: input.source, campaign: "controlled-pilot",
    } });
    if (saved.error) return betaJson({ error: "We couldn't save your application. Please retry later." }, 503);
    return betaJson({ message: "Your application has been received for administrator review. No invitation, email or beta access has been created." });
  } catch { return betaJson({ error: "Applications are temporarily unavailable. Your answers have not been changed." }, 503); }
}
