"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { MealCaddieLogo } from "./mealcaddie-logo";
import { signInPath } from "@/lib/auth-destination";
import { rememberDestination, saveInvitationReturn, takeInvitationReturn, clearInvitationReturn } from "@/lib/account-client";

export async function betaRequest(path: string, body?: unknown) {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw Error("Sign in to MealCaddie with the email that received your invitation, then reopen the invitation.");
  const response = await fetch(path, { method: body ? "POST" : "GET", cache: "no-store", headers: { Authorization: `Bearer ${data.session.access_token}`, ...(body ? { "Content-Type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const result = await response.json(); if (!response.ok) throw Error(result.error ?? "Unable to complete that action."); return result;
}
type Participation = { id: string; cohort: string; expires_at: string; revoked_at: string | null; withdrawn_at: string | null; engagement_consent: boolean };
type Feedback = { id: string; category: string; message: string; status: string };
type Overview = { participation: Participation | null; featurePlan: string; billingPlan: string; feedback: Feedback[] };
const control = "min-h-11 w-full rounded-xl border border-pine bg-white px-3 py-2 text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine";
const button = "min-h-12 rounded-xl bg-pine px-4 py-3 font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine disabled:opacity-50";

export function BetaParticipant({ accept = false, enabled }: { accept?: boolean; enabled: boolean }) {
  const invitation = useRef("");
  const feedbackKey = useRef<string | null>(null);
  const authUser = useRef<string | null | undefined>(undefined);
  const requestVersion = useRef(0);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [hasInvitation, setHasInvitation] = useState(false);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [category, setCategory] = useState("bug");
  const [feature, setFeature] = useState("other");
  const [feedback, setFeedback] = useState("");
  const [withdraw, setWithdraw] = useState(false);
  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    try { const result = await betaRequest("/api/beta/onboarding"); if (version === requestVersion.current) setOverview(result); }
    catch (failure) { if (version === requestVersion.current) { setOverview(null); setError(failure instanceof Error ? failure.message : "Unable to load participation."); } }
  }, []);
  useEffect(() => {
    const counter = requestVersion;
    if (accept) {
      const candidate = new URLSearchParams(window.location.hash.slice(1)).get("invite") || takeInvitationReturn();
      if (/^[A-Za-z0-9_-]{43}$/.test(candidate)) { invitation.current = candidate; setHasInvitation(true); saveInvitationReturn(candidate); }
      if (window.location.hash) window.history.replaceState(null, "", window.location.pathname);
    }
    if (enabled) void load();
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      const next = session?.user.id ?? null;
      if (authUser.current !== next) { authUser.current = next; requestVersion.current++; setOverview(null); setFeedback(""); feedbackKey.current = null; if (enabled) setTimeout(() => { void load(); }, 0); }
    });
    return () => { counter.current++; data.subscription.unsubscribe(); };
  }, [accept, enabled, load]);
  async function change(body: unknown) {
    setBusy(true); setMessage(""); setError("");
    try {
      const result = await betaRequest("/api/beta/onboarding", body); setMessage(result.message);
      if ((body as { action?: string }).action === "accept") { invitation.current = ""; clearInvitationReturn(); setHasInvitation(false); }
      if ((body as { action?: string }).action === "feedback") { setFeedback(""); feedbackKey.current = null; }
      await load();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Unable to save. Your input has been kept."); }
    finally { setBusy(false); }
  }
  const participant = overview?.participation;
  const active = participant && !participant.revoked_at && new Date(participant.expires_at).getTime() > Date.now();
  return <main className="min-h-screen bg-cream px-4 py-6 text-ink"><div className="mx-auto max-w-2xl">
    <header className="mb-6 flex flex-wrap items-center justify-between gap-3"><MealCaddieLogo /><Link className="min-h-11 py-3 font-semibold text-pine underline" href={signInPath(accept ? "/beta/accept" : "/beta/participant")} onClick={event => { event.preventDefault(); void rememberDestination(accept ? "/beta/accept" : "/beta/participant", invitation.current || undefined).then(() => window.location.assign(signInPath(accept ? "/beta/accept" : "/beta/participant"))).catch(() => setError("We couldn't preserve your invitation. Please retry sign-in.")); }}>MealCaddie / sign in</Link></header>
    <h1 className="text-3xl font-bold text-pine">{accept ? "Your beta invitation" : "Your MealCaddie beta"}</h1>
    <p className="mt-3">Help us make everyday meal planning easier. Participation requires no payment information and creates no subscription.</p>
    <p role="status" aria-live="polite" className="my-3 text-pine">{message}</p><p role="alert" className="my-3 text-berry">{error}</p>
    {!enabled ? <p className="rounded-2xl bg-white p-5">This protected review shows the onboarding experience. Activation, invitations and feedback storage are disabled until the isolated test configuration or a separately approved release is enabled.</p> : null}
    {accept ? <section className="my-5 space-y-4 rounded-2xl bg-white p-5" aria-label="Accept invitation">
      <h2 className="text-xl font-semibold text-pine">Sign in, then accept</h2>
      <ol className="list-decimal space-y-2 pl-5"><li>Sign in to MealCaddie using the verified email that received your invitation.</li><li>After sign-in, reopen the invitation from your original email.</li><li>Review the beta privacy notice and choose Accept invitation.</li></ol>
      <p>The personal link expires seven days after issuance. Do not forward it. Signing in does not automatically accept it.</p>
      {!hasInvitation ? <p>Reopen your original invitation to load its acceptance link. If you already accepted, your participation appears below.</p> : null}
      <form onSubmit={event => { event.preventDefault(); void change({ action: "accept", token: invitation.current, consent }); }}>
        <label className="flex items-start gap-3 py-3"><input type="checkbox" required checked={consent} onChange={event => setConsent(event.target.checked)} className="mt-1 h-5 w-5" /><span>I agree to beta participation and have read the <Link href="/beta/privacy" className="text-pine underline">privacy notice</Link>. Optional analytics and marketing are separate choices.</span></label>
        <button className={button} disabled={!enabled || !hasInvitation || busy}>{busy ? "Checking…" : "Accept invitation"}</button>
      </form>
    </section> : null}
    {enabled ? <button className={`${button} my-3`} disabled={busy} onClick={() => { setError(""); void load(); }}>Refresh after signing in</button> : null}
    {participant ? <>
      <section className="my-5 rounded-2xl bg-white p-5" aria-label="Participation and access"><h2 className="text-xl font-semibold text-pine">Your participation</h2><p className="mt-3">{participant.withdrawn_at ? "Withdrawn" : active ? "Active" : "Expired or revoked"} · {participant.cohort === "plus" ? "Plus" : "Free"} cohort</p><p>Participation ends {new Date(participant.expires_at).toLocaleString()}.</p><p className="mt-3">Current feature access: {overview?.featurePlan === "plus" ? "Plus" : "Free"}. Existing account plan: {overview?.billingPlan === "plus" ? "Plus" : "Free"}.</p><p>When temporary access ends, your saved content remains. Existing paid Plus access is preserved.</p></section>
      {!participant.withdrawn_at ? <form className="my-5 space-y-4 rounded-2xl bg-white p-5" onSubmit={event => { event.preventDefault(); feedbackKey.current ??= crypto.randomUUID(); void change({ action: "feedback", category, feature, message: feedback, requestKey: feedbackKey.current }); }} aria-label="Beta feedback">
        <h2 className="text-xl font-semibold text-pine">Tell us how it went</h2><p id="feedback-help">Report a bug, suggest an improvement or describe something confusing. Please leave out medical details, passwords and personal information about other people. Analytics consent is not required.</p>
        <label className="block">Feedback type<select className={control} value={category} onChange={event => setCategory(event.target.value)}><option value="bug">Bug report</option><option value="suggestion">Suggestion</option><option value="usability">Something was confusing</option></select></label>
        <label className="block">Feature<select className={control} value={feature} onChange={event => setFeature(event.target.value)}>{["planning", "cooking", "groceries", "pantry", "vault", "onboarding", "other"].map(value => <option key={value} value={value}>{value}</option>)}</select></label>
        <label className="block">Your feedback<textarea required minLength={10} maxLength={2000} rows={5} className={control} value={feedback} aria-describedby="feedback-help feedback-length" onChange={event => { setFeedback(event.target.value); feedbackKey.current = null; }} /></label><p id="feedback-length" className="text-sm">{feedback.length}/2,000 characters. At least 10 characters.</p><button className={button} disabled={busy}>{busy ? "Saving…" : "Send feedback"}</button>
      </form> : null}
      {active ? <section className="my-5 rounded-2xl bg-white p-5"><h2 className="text-xl font-semibold text-pine">Optional usage reporting</h2><p className="my-3">Share only counts of successful plans and feedback submissions. No meals, ingredients, prompts or device fingerprints are collected. Turning it off removes your existing beta usage reports.</p><label className="flex items-center gap-3"><input className="h-5 w-5" type="checkbox" disabled={busy} checked={participant.engagement_consent} onChange={event => void change({ action: "settings", consent: event.target.checked, withdraw: false })} />Share minimal usage counts</label></section> : null}
      {overview?.feedback.length ? <section aria-label="Your feedback" className="my-5 space-y-3"><h2 className="text-xl font-semibold text-pine">Your recent feedback</h2>{overview.feedback.map(item => <article key={item.id} className="rounded-2xl bg-white p-4"><h3 className="font-semibold">{item.category} · {item.status.replace(/_/g, " ")}</h3><p className="mt-2 whitespace-pre-wrap break-words">{item.message}</p></article>)}</section> : null}
      {!participant.withdrawn_at ? <section className="my-5 rounded-2xl border border-pine bg-white p-5"><h2 className="font-semibold">Leave the beta</h2><p className="my-3">This removes temporary beta privileges and stops usage reporting. Your MealCaddie account, subscriptions and saved content remain.</p><label className="flex items-center gap-3 py-3"><input className="h-5 w-5" type="checkbox" checked={withdraw} onChange={event => setWithdraw(event.target.checked)} />I want to withdraw from beta participation</label><button className={button} disabled={!withdraw || busy} onClick={() => void change({ action: "settings", consent: false, withdraw: true })}>Withdraw participation</button></section> : null}
    </> : null}
    <footer className="my-8"><a className="text-pine underline" href="mailto:beta@mealcaddie.app">Contact the beta team</a></footer>
  </div></main>;
}
