import { betaApplicationSchema, betaConsentVersion, betaPagesEnabled, betaSubmissionsEnabled } from "@/lib/beta-domain";
import { betaStorageClient, betaJson, betaNetworkHash, boundedJson, verifyBetaChallenge } from "@/lib/beta-server";
import { notifyAfterApplicationSave } from "@/lib/beta-notification-dispatch";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!betaPagesEnabled()) return betaJson({ error: "Not found." }, 404);
  if (!betaSubmissionsEnabled()) return betaJson({ error: "This is a review preview. Applications are not open yet." }, 503);
  try {
    const client = betaStorageClient();
    const rate = await client.rpc("beta_check_rate", { p_key: betaNetworkHash(request) });
    if (rate.error) return betaJson({ error: "Applications are temporarily unavailable." }, 503);
    if (!rate.data) return new Response(JSON.stringify({ error: "Please wait before trying again." }), { status: 429, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "Retry-After": "3600" } });
    let body: unknown;
    try { body = await boundedJson(request); } catch { return betaJson({ error: "Please submit a valid application." }, 400); }
    const parsed = betaApplicationSchema.safeParse(body);
    if (!parsed.success) return betaJson({ error: "Please check your answers and consent before submitting." }, 400);
    const input = parsed.data;
    if (input.website) return betaJson({ message: "Thank you. Your application has been received for review." });
    if (!await verifyBetaChallenge(input.turnstileToken, request)) return betaJson({ error: "Please complete the verification again." }, 400);
    const { error } = await client.rpc("beta_submit_application", { p_input: {
      email: input.email, frequency: input.frequency, challenges: input.challenges, interests: input.interests,
      plan_interest: input.planInterest, feedback_willing: input.feedbackWilling,
      beta_consent_version: betaConsentVersion, marketing_consent: input.marketingConsent,
      source: input.source, campaign: input.campaign,
    } });
    if (error) return betaJson({ error: "Applications are temporarily unavailable. Please retry later." }, 503);
    try { notifyAfterApplicationSave(input.email); }
    catch { console.error("beta_admin_notification", { code: "scheduling_unavailable" }); }
    return betaJson({ message: "Thank you. Your application has been received for review. Applying does not guarantee an invitation." });
  } catch { return betaJson({ error: "Applications are temporarily unavailable. Please retry later." }, 503); }
}
