import { after } from "next/server";
import { send } from "@vercel/queue";
import { adminNotificationsEnabled, processAdminApplicationNotification } from "./beta-application-notifications";
import { betaStorageClient } from "./beta-server";
export async function dispatchAdminNotification(applicationId: string, recovery = false) {
  if (!adminNotificationsEnabled()) return;
  await send("mealcaddie-beta-notifications", { applicationId }, { idempotencyKey: recovery ? `notification-recovery:${applicationId}:${crypto.randomUUID()}` : `notification:${applicationId}`, retentionSeconds: 86400 });
}
export function notifyAfterApplicationSave(email: string) {
  if (!adminNotificationsEnabled()) return;
  try {
    after(async () => {
      try {
        const client = betaStorageClient();
        const found = await client.from("beta_applications").select("id").eq("program_slug", "public-beta").eq("email", email).maybeSingle();
        if (found.error || !found.data) return;
        // Only the transactional save function creates a new-app outbox row.
        const outbox = await client.from("beta_application_notifications").select("state").eq("application_id", found.data.id).maybeSingle();
        if (outbox.error || !outbox.data || !["pending", "retryable", "blocked"].includes(outbox.data.state)) return;
        try { await dispatchAdminNotification(found.data.id); }
        catch {
          console.error("beta_admin_notification", { applicationId: found.data.id, code: "queue_unavailable" });
          // Best-effort fallback; the outbox and admin recovery survive failure.
          try { await processAdminApplicationNotification(found.data.id); } catch { /* Remains durably recoverable. */ }
        }
      } catch { console.error("beta_admin_notification", { code: "dispatch_unavailable" }); }
    });
  } catch { console.error("beta_admin_notification", { code: "background_unavailable" }); }
}
