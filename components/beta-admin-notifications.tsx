"use client";
import { useState } from "react";
type Notification = { application_id: string; state: string; attempts: number; provider_id: string | null; error_code: string | null; beta_applications: { email: string } };
export function BetaAdminNotifications({ request }: { request: (path: string, body?: unknown) => Promise<{ enabled?: boolean; notifications?: Notification[]; message?: string }> }) {
  const [rows, setRows] = useState<Notification[]>([]); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  async function load(applicationId?: string) {
    setBusy(true); setMessage("");
    try {
      if (applicationId) await request("/api/beta/admin/notifications", { applicationId });
      const result = await request("/api/beta/admin/notifications"); setRows(result.notifications ?? []);
      setMessage(result.enabled ? applicationId ? "Recovery queued. Refresh to check the result." : "Latest 50 notification records loaded." : "Administrator notifications are not enabled.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to load notifications."); }
    finally { setBusy(false); }
  }
  return <details className="my-5 rounded-2xl border border-pine/20 bg-white p-5"><summary className="min-h-11 cursor-pointer py-3 font-semibold text-pine">Application email notifications</summary>
    <p className="my-3 text-sm">Provider acceptance is shown as Sent; it does not prove inbox delivery. Uncertain messages require manual Resend reconciliation and cannot be retried here.</p>
    <button disabled={busy} className="min-h-11 rounded-xl bg-pine px-4 py-2 font-semibold text-white disabled:opacity-50" onClick={() => void load()}>Refresh notification status</button>
    <p role="status" aria-live="polite" className="my-3 text-sm">{message}</p>
    <ul className="space-y-3">{rows.map(row => <li key={row.application_id} className="rounded-xl border border-pine/20 p-3"><p className="break-all font-semibold">{row.beta_applications?.email ?? "Applicant no longer available"}</p><p className="text-sm">{row.state} · {row.attempts} attempt(s){row.error_code ? ` · ${row.error_code.replaceAll("_", " ")}` : ""}</p>{row.provider_id ? <p className="break-all text-xs">Resend message: {row.provider_id}</p> : null}{["pending", "blocked", "retryable"].includes(row.state) && row.attempts < 5 ? <button disabled={busy} className="mt-2 min-h-11 rounded-xl border border-pine px-3 py-2 font-semibold text-pine" onClick={() => void load(row.application_id)}>Recover unsent notification</button> : null}</li>)}</ul>
  </details>;
}
