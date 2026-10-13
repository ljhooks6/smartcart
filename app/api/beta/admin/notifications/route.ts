import { z } from "zod";
import { betaJson, betaStorageClient, boundedJson, requireBetaAdmin } from "@/lib/beta-server";
import { adminNotificationsEnabled } from "@/lib/beta-application-notifications";
import { dispatchAdminNotification } from "@/lib/beta-notification-dispatch";
import { sameOrigin } from "@/lib/beta-onboarding-domain";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const access = await requireBetaAdmin(request); if ("response" in access) return access.response;
  if (!adminNotificationsEnabled()) return betaJson({ enabled: false, notifications: [] });
  const rows = await betaStorageClient().from("beta_application_notifications").select("application_id,state,attempts,provider_id,error_code,next_attempt_at,created_at,beta_applications(email)").order("created_at", { ascending: false }).limit(50);
  if (rows.error) return betaJson({ error: "Notification status is unavailable." }, 503);
  return betaJson({ enabled: true, notifications: rows.data });
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return betaJson({ error: "Invalid request origin." }, 403);
  const access = await requireBetaAdmin(request); if ("response" in access) return access.response;
  if (!adminNotificationsEnabled()) return betaJson({ error: "Notifications are disabled." }, 403);
  let applicationId: string;
  try { applicationId = z.object({ applicationId: z.string().uuid() }).strict().parse(await boundedJson(request)).applicationId; }
  catch { return betaJson({ error: "Select a valid notification." }, 400); }
  const row = await betaStorageClient().from("beta_application_notifications").select("state,attempts,error_code").eq("application_id", applicationId).maybeSingle();
  if (row.error) return betaJson({ error: "Notification status is unavailable." }, 503);
  if (!row.data || !["pending", "retryable", "blocked"].includes(row.data.state) || row.data.attempts >= 5) return betaJson({ error: "This notification cannot be retried. Reconcile uncertain delivery with Resend; never resend a confirmed email." }, 409);
  try { await dispatchAdminNotification(applicationId, true); }
  catch { return betaJson({ error: "Recovery queue is unavailable. The notification remains saved." }, 503); }
  return betaJson({ message: "Safe recovery queued. Confirmed or uncertain emails will not be resent." });
}
