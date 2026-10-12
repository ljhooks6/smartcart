import { betaStorageClient } from "./beta-server";
import { onboardingEnabled } from "./beta-onboarding-domain";
export async function recordPlanEngagement(userId: string, jobId: string) {
  if (!onboardingEnabled()) return;
  try {
    // Consent is checked in the RPC; only a completed job ID and action enter telemetry.
    await betaStorageClient().rpc("beta_record_engagement", { p_user: userId, p_action: "plan_completed", p_key: jobId });
  } catch { /* Optional reporting must not turn a saved successful plan into a retry. */ }
}
