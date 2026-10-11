import { getRequestMembership } from "@/lib/server-membership";
import { betaStorageClient, betaJson } from "@/lib/beta-server";
import { betaEntitlementsEnabled, onboardingEnabled } from "@/lib/beta-onboarding-domain";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const membership = await getRequestMembership(request);
  if ("status" in membership) return betaJson({ error: membership.error }, membership.status);
  let expiresAt: string | null = null;
  if (membership.userId && betaEntitlementsEnabled()) {
    const participant = await betaStorageClient().from("beta_participations").select("expires_at").eq("user_id", membership.userId).is("revoked_at", null).maybeSingle();
    if (participant.error) return betaJson({ error: "Feature access unavailable." }, 503);
    expiresAt = participant.data?.expires_at ?? null;
  }
  return betaJson({ userId: membership.userId, featurePlan: membership.plan, expiresAt, betaEnabled: onboardingEnabled() });
}
