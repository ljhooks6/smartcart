import "server-only";
import { betaStorageClient } from "./beta-server";
export const betaAdminReviewUrl = "https://mealcaddie.app/admin/beta";
export function adminNotificationsEnabled(env: Record<string, string | undefined> = process.env) {
  return env.VERCEL_ENV === "production" && env.BETA_ADMIN_NOTIFICATIONS_ENABLED === "true";
}
type Application = { applicationId: string; leaseId: string; email: string; submittedAt: string; interest: string };
const escapeHtml = (text: string) => text.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]!));
export function prepareAdminApplicationEmail(application: Application) {
  const time = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", dateStyle: "long", timeStyle: "short" }).format(new Date(application.submittedAt));
  const interest = ({ free: "Free", plus: "Plus", either: "Free or Plus" } as Record<string, string>)[application.interest] ?? "Not provided";
  const subject = "New MealCaddie Beta Application Received";
  const text = `MealCaddie\n\n${subject}\n\nApplicant: ${application.email}\nSubmitted: ${time} Central Time\nRequested interest: ${interest}\nStatus: Pending Review\n\nReview Application: ${betaAdminReviewUrl}\n\nSign in with your MealCaddie administrator account. This notification does not approve the application or grant access.`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head><body style="margin:0;background:#fff7e9;color:#202c28;font-family:Arial,Helvetica,sans-serif"><table role="presentation" style="width:100%;border-collapse:collapse"><tr><td style="padding:24px 12px"><table role="presentation" style="width:100%;max-width:600px;margin:0 auto;background:white;border-collapse:collapse"><tr><td style="padding:24px;background:#174b3c;color:white;border-bottom:5px solid #ffb074;font-size:26px;font-weight:bold">MealCaddie</td></tr><tr><td style="padding:24px;font-size:16px;line-height:1.6"><h1 style="margin:0 0 20px;font-size:24px;color:#174b3c">A new beta application is ready</h1><p><strong>Applicant:</strong> <span style="overflow-wrap:anywhere;word-break:break-word">${escapeHtml(application.email)}</span></p><p><strong>Submitted:</strong> ${escapeHtml(time)} Central Time</p><p><strong>Requested interest:</strong> ${interest}</p><p><strong>Status:</strong> Pending Review</p><p style="margin:24px 0"><a href="${betaAdminReviewUrl}" style="display:inline-block;max-width:100%;box-sizing:border-box;background:#174b3c;color:white;padding:14px 20px;border-radius:10px;font-weight:bold;text-decoration:underline">Review Application</a></p><p style="font-size:14px">Sign in with your MealCaddie administrator account to review the application. No approval, invitation or product access has been granted.</p><p style="font-size:13px">This is a private administrator notification. Please do not forward applicant information. <a href="https://mealcaddie.app/legal/privacy" style="color:#174b3c">Privacy Policy</a></p></td></tr></table></td></tr></table></body></html>`;
  return { from: "MealCaddie Beta <beta@mealcaddie.app>", to: "support@mealcaddie.app", reply_to: "beta@mealcaddie.app", subject, text, html };
}
export class NotificationRetry extends Error { constructor(public afterSeconds = 60) { super("Administrator notification is pending a safe retry."); } }
export async function processAdminApplicationNotification(applicationId: string) {
  if (!adminNotificationsEnabled()) return;
  const client = betaStorageClient();
  if (!process.env.RESEND_API_KEY) {
    const saved = await client.from("beta_application_notifications").update({ state: "blocked", error_code: "missing_configuration" }).eq("application_id", applicationId).in("state", ["pending", "blocked", "retryable"]);
    if (saved.error) console.error("beta_admin_notification", { applicationId, code: "ledger_unavailable" });
    throw new NotificationRetry(300);
  }
  const claimed = await client.rpc("beta_notification_claim", { p_application: applicationId });
  if (claimed.error) throw new NotificationRetry();
  if (!claimed.data) {
    const pending = await client.from("beta_application_notifications").select("state,next_attempt_at,attempts").eq("application_id", applicationId).maybeSingle();
    if (pending.data && ["pending", "retryable"].includes(pending.data.state) && pending.data.attempts < 5) throw new NotificationRetry(300);
    return;
  }
  const application = claimed.data as Application;
  if (application.applicationId !== applicationId) throw Error("Notification claim mismatch.");
  const finish = async (state: string, provider: string | null, code: string | null, delay = 0) => {
    const saved = await client.rpc("beta_notification_finish", { p_application: applicationId, p_lease: application.leaseId, p_state: state, p_provider: provider, p_error: code, p_delay: delay });
    if (saved.error || !saved.data) console.error("beta_admin_notification", { applicationId, providerId: provider, code: "ledger_confirmation_required" });
    return !saved.error && saved.data === true;
  };
  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `beta-admin-application/${applicationId}` }, body: JSON.stringify(prepareAdminApplicationEmail(application)), signal: AbortSignal.timeout(10000) });
  } catch {
    await finish("uncertain", null, "delivery_uncertain");
    console.error("beta_admin_notification", { applicationId, code: "delivery_uncertain" });
    return; // A timeout might have sent an email: never retry an uncertain outcome.
  }
  if (!response.ok) {
    const retryable = response.status === 429;
    const knownRejected = [400, 401, 403, 404, 422, 429].includes(response.status);
    const code = retryable ? "provider_rate_limited" : knownRejected ? "provider_rejected" : "delivery_uncertain";
    const saved = await finish(retryable ? "retryable" : knownRejected ? "blocked" : "uncertain", null, code, retryable ? 300 : 0);
    console.error("beta_admin_notification", { applicationId, code, httpStatus: response.status });
    if (retryable && saved) throw new NotificationRetry(300);
    return;
  }
  let providerId: string | undefined;
  try { providerId = (await response.json() as { id?: string }).id; } catch { /* Unknown response is never retried. */ }
  if (!providerId || !/^[a-zA-Z0-9_-]{1,100}$/.test(providerId)) {
    await finish("uncertain", null, "delivery_uncertain");
    console.error("beta_admin_notification", { applicationId, code: "delivery_uncertain" });
    return;
  }
  await finish("sent", providerId, null);
  console.info("beta_admin_notification", { applicationId, providerId });
}
