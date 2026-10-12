"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
type Email = { from: string; to: string; reply_to: string; subject: string; text: string; html: string };
export function BetaVerification() {
  const [confirmed, setConfirmed] = useState(false); const [ownerTestAvailable, setOwnerTestAvailable] = useState(false); const [attempted, setAttempted] = useState(false);
  const [kind, setKind] = useState("application"); const [email, setEmail] = useState<Email | null>(null);
  const [result, setResult] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function request(path: string, body?: unknown) {
    setBusy(true); setError("");
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session?.access_token) throw Error("Please sign in again.");
      const response = await fetch(path, { method: body ? "POST" : "GET", headers: { Authorization: `Bearer ${data.session.access_token}`, ...(body ? { "Content-Type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
      const value = await response.json(); if (!response.ok) throw Error(value.error ?? "Unable to verify configuration.");
      if (path === "/api/beta/email-preview") setEmail(value.email); else { setResult(JSON.stringify(value, null, 2)); if (path === "/api/beta/readiness") setOwnerTestAvailable(value.configuration?.ownerTestAvailable === true); }
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Verification unavailable."); }
    finally { setBusy(false); }
  }
  return <details className="my-5 rounded-2xl border border-pine/20 bg-white p-5"><summary className="cursor-pointer font-semibold text-pine">Controlled preview checks</summary>
    <p className="my-3 text-sm">Automatic email delivery is disabled. The retention check validates authorization without accessing storage or deleting records.</p>
    <button disabled={busy} className="min-h-11 rounded-xl bg-pine px-4 py-2 text-white" onClick={() => void request("/api/beta/readiness")}>Check configuration and retention authorization</button>
    <p role="alert" className="my-2 text-berry">{error}</p>{result ? <pre className="my-3 whitespace-pre-wrap break-all rounded-xl bg-cream p-3 text-xs" role="status">{result}</pre> : null}
    {ownerTestAvailable ? <section className="my-4 rounded-xl border border-pine/40 p-3" aria-label="Approved owner email test"><p className="mb-3 text-sm">One approved application acknowledgement from beta@mealcaddie.app to the privately approved inbox. Invitations and marketing remain disabled. Do not retry an uncertain result.</p><label className="mb-3 flex items-center gap-3 text-sm"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />Confirm the exact sender, recipient and single application email above</label><button disabled={busy || attempted || !confirmed} className="min-h-11 rounded-xl bg-pine px-4 py-2 text-white" onClick={() => { if (!confirmed) return; setAttempted(true); void request("/api/beta/email-test", { confirm: "send-owner-application-test" }); }}>Send approved owner test once</button></section> : null}
    <form className="my-4 flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); void request("/api/beta/email-preview", { kind }); }}><label className="flex flex-col gap-1">Email template<select className="min-h-11 rounded-xl border border-pine/70 p-2 focus:ring-2 focus:ring-pine" value={kind} onChange={event => { setKind(event.target.value); setEmail(null); }}>{["application","invitation","welcome","feedback","admin"].map(value => <option key={value} value={value}>{value === "admin" ? "Administrator notification" : value[0].toUpperCase() + value.slice(1)}</option>)}</select></label><button disabled={busy} className="min-h-11 rounded-xl bg-pine px-4 py-2 text-white">Prepare email preview — does not send</button></form>
    {email ? <section aria-label="Prepared email"><p className="break-all text-sm">From: {email.from}<br />To: {email.to}<br />Reply-to: {email.reply_to}<br />Subject: {email.subject}</p><iframe title="MealCaddie email preview" sandbox="" srcDoc={email.html} className="my-3 h-96 w-full rounded-xl border border-pine/20" /><pre className="whitespace-pre-wrap break-words text-sm">{email.text}</pre></section> : null}
  </details>;
}
