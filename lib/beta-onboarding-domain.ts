import { z } from "zod";

export function onboardingEnabled(env: Record<string, string | undefined> = process.env) {
  return env.BETA_ONBOARDING_ENABLED === "true" &&
    (env.VERCEL_ENV !== "production" || env.BETA_ONBOARDING_RELEASE_APPROVED === "true");
}
export function betaEntitlementsEnabled(env: Record<string, string | undefined> = process.env) {
  return onboardingEnabled(env) && env.BETA_ENTITLEMENTS_ENABLED === "true";
}
export function invitationSendingEnabled(env: Record<string, string | undefined> = process.env) {
  return onboardingEnabled(env) && env.BETA_INVITATION_DELIVERY_APPROVED === "true";
}
export const participantAction = z.discriminatedUnion("action", [
  z.object({ action: z.literal("accept"), token: z.string().regex(/^[A-Za-z0-9_-]{43}$/), consent: z.literal(true) }).strict(),
  z.object({ action: z.literal("feedback"), category: z.enum(["bug", "suggestion", "usability"]), feature: z.enum(["planning", "cooking", "groceries", "pantry", "vault", "onboarding", "other"]), message: z.string().trim().min(10).max(2000), requestKey: z.string().uuid() }).strict(),
  z.object({ action: z.literal("settings"), consent: z.boolean(), withdraw: z.boolean() }).strict(),
]);
export const adminOnboardingAction = z.discriminatedUnion("action", [
  z.object({ action: z.literal("issue"), applicationId: z.string().uuid() }).strict(),
  z.object({ action: z.literal("revoke_invitation"), id: z.string().uuid() }).strict(),
  z.object({ action: z.enum(["promote", "extend", "revoke"]), id: z.string().uuid(), reason: z.string().trim().min(3).max(500), until: z.string().datetime({ offset: true }).optional() }).strict(),
  z.object({ action: z.literal("review_feedback"), id: z.string().uuid(), status: z.enum(["open", "triaged", "in_progress", "resolved", "duplicate"]), note: z.string().trim().max(1000) }).strict(),
  z.object({ action: z.literal("configure"), waveSize: z.number().int().min(1).max(45), boundary: z.string().datetime({ offset: true }).nullable() }).strict(),
]);
export function operationAllowed(reservedPlan: string, currentPlan: string) {
  return reservedPlan !== "plus" || currentPlan === "plus";
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true; // Non-browser clients still require a verified bearer session.
  const url = new URL(request.url);
  // Next may canonicalize its internal URL to localhost. The browser's Host
  // header reflects the requested public host; never trust forwarded-host here.
  const host = request.headers.get("host");
  return origin === url.origin || (!!host && origin === `${url.protocol}//${host}`);
}
