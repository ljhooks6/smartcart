import { betaJson, requireBetaAdmin } from "@/lib/beta-server";
import { GET as retentionCheck } from "@/app/api/cron/beta-retention/route";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const access = await requireBetaAdmin(request);
  if ("response" in access) return access.response;
  const env = process.env;
  const configuration = {
    environment: env.VERCEL_ENV ?? "development",
    turnstileSiteKeyPresent: Boolean(env.NEXT_PUBLIC_TURNSTILE_SITE_KEY),
    turnstileSecretPresent: Boolean(env.TURNSTILE_SECRET_KEY),
    rateSecretMeetsMinimum: Boolean(env.BETA_RATE_LIMIT_SECRET && env.BETA_RATE_LIMIT_SECRET.length >= 32),
    cronSecretMeetsMinimum: Boolean(env.CRON_SECRET && env.CRON_SECRET.length >= 32),
    resendKeyPresent: Boolean(env.RESEND_API_KEY),
    intakeEnabled: env.BETA_APPLICATIONS_ENABLED === "true",
    launchApproved: env.BETA_PUBLIC_LAUNCH_APPROVED === "true",
    privacyReviewed: env.BETA_PRIVACY_REVIEW_APPROVED === "true",
    contactMailboxesVerified: env.BETA_CONTACT_MAILBOXES_VERIFIED === "true",
    automaticEmailsEnabled: false,
  };
  // In-process authorization test only: never invoke the destructive URL or expose its secret.
  const url = new URL("/api/cron/beta-retention?dryRun=1", request.url);
  const result = await retentionCheck(new Request(url, { headers: { Authorization: `Bearer ${env.CRON_SECRET ?? ""}` } }));
  return betaJson({ configuration, retentionAuthorizationStatus: result.status, retention: await result.json() });
}
