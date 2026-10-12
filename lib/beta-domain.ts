import { z } from "zod";

export const betaStatuses = ["applied", "under_review", "approved", "waitlisted", "invited", "activated", "declined", "withdrawn"] as const;
export const betaCohorts = ["free", "plus", "reserve"] as const;
export const betaInterests = ["meal_planning", "recipes", "groceries", "pantry", "mobile", "plus_features"] as const;
export const betaConsentVersion = "2026-10-10-v1";
export const betaApplicationSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  frequency: z.enum(["daily", "several_times_week", "weekly", "occasionally", "getting_started"]),
  challenges: z.string().trim().min(10).max(1500),
  interests: z.array(z.enum(betaInterests)).min(1).max(6).transform(value => [...new Set(value)]),
  planInterest: z.enum(["free", "plus", "either"]),
  feedbackWilling: z.boolean(), betaConsent: z.literal(true), marketingConsent: z.boolean().default(false),
  website: z.string().max(200).default(""),
  turnstileToken: z.string().min(1).max(2048),
  source: z.enum(["direct", "facebook", "instagram", "friends", "community", "other"]).default("direct"),
  campaign: z.string().trim().max(80).regex(/^[a-zA-Z0-9 _.-]*$/).default(""),
}).strict();
export const betaChangeSchema = z.object({
  id: z.string().uuid(), expectedUpdatedAt: z.string().datetime({ offset: true }),
  status: z.enum(betaStatuses), cohort: z.enum(betaCohorts).nullable(),
}).strict();
export const betaTargetsSchema = z.object({ free: z.number().int().min(0).max(10000), plus: z.number().int().min(0).max(10000), reserve: z.number().int().min(0).max(10000) }).strict();
export function betaPagesEnabled(env: Record<string, string | undefined> = process.env) {
  if (env.VERCEL_ENV === "production") return env.BETA_PUBLIC_LAUNCH_APPROVED === "true" && env.BETA_APPLICATIONS_ENABLED === "true" && env.BETA_PRIVACY_REVIEW_APPROVED === "true" && env.BETA_CONTACT_MAILBOXES_VERIFIED === "true";
  return !env.VERCEL || env.VERCEL_ENV === "preview" || env.VERCEL_ENV === "development";
}
export function betaSubmissionsEnabled(env: Record<string, string | undefined> = process.env) {
  return betaPagesEnabled(env) && env.BETA_APPLICATIONS_ENABLED === "true";
}
export function displayBetaValue(value: string) { return value.replace(/_/g, " ").replace(/\b\w/g, letter => letter.toUpperCase()); }
