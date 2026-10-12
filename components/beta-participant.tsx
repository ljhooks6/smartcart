"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { MealCaddieLogo } from "./mealcaddie-logo";
import { signInPath } from "@/lib/auth-destination";
import { accountRequest, rememberDestination, saveInvitationReturn, takeInvitationReturn, clearInvitationReturn } from "@/lib/account-client";

export async function betaRequest(path: string, body?: unknown) {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw Error("We couldn't confirm your session. Sign in to MealCaddie with your verified account.");
  const response = await fetch(path, { method: body ? "POST" : "GET", cache: "no-store", headers: { Authorization: `Bearer ${data.session.access_token}`, ...(body ? { "Content-Type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const result = await response.json(); if (!response.ok) throw Error(result.error ?? "Unable to complete that action."); return result;
}
type Participation = { id: string; cohort: string; expires_at: string; revoked_at: string | null; withdrawn_at: string | null; engagement_consent: boolean };
type Overview = { verifiedEmail: string; participation: Participation | null; featurePlan: string; billingPlan: string; feedback: { id: string; category: string; message: string; status: string }[] };
type Review = { state: "ready" | "accepted" | "wrong_account" | "expired" | "revoked" | "unavailable"; cohort?: string };
const control = "min-h-11 w-full rounded-xl border border-pine bg-white px-3 py-2 text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine";
const button = "min-h-12 rounded-xl bg-pine px-4 py-3 font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine disabled:opacity-50";
const areas = [["onboarding", "Signup, sign-in and beta onboarding"], ["planning", "Meal planning"], ["cooking", "Recipes and cooking"], ["groceries", "Groceries and shopping"], ["pantry", "Pantry (Plus saving)"], ["vault", "Recipe Vault"], ["other", "General, pricing or upgrade experience"]];

export function BetaParticipant({ accept = false, enabled }: { accept?: boolean; enabled: boolean }) {
  const invitation = useRef(""); const feedbackKey = useRef<string | null>(null);
  const authUser = useRef<string | null | undefined>(undefined); const version = useRef(0); const saving = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const [overview, setOverview] = useState<Overview | null>(null), [review, setReview] = useState<Review | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null), [loading, setLoading] = useState(true), [recovery, setRecovery] = useState(false);
  const [busy, setBusy] = useState(false), [consent, setConsent] = useState(false), [hasInvitation, setHasInvitation] = useState(false);
  const [message, setMessage] = useState(""), [error, setError] = useState("");
  const [category, setCategory] = useState("bug"), [feature, setFeature] = useState("other"), [feedback, setFeedback] = useState(""), [withdraw, setWithdraw] = useState(false);
  const load = useCallback(async () => {
    const current = ++version.current; setLoading(true); setRecovery(false); setError("");
    try {
      const session = await supabase.auth.getSession();
      if (current !== version.current) return;
      if (session.error) throw Error("We couldn't confirm your session. Try again.");
      setSignedIn(!!session.data.session);
      if (!session.data.session) { setOverview(null); setReview(null); return; }
      const result = await betaRequest("/api/beta/onboarding");
      const checked = accept && invitation.current ? await betaRequest("/api/beta/onboarding/invitation", { token: invitation.current }) : null;
      if (current === version.current) { setOverview(result); setReview(checked); }
    } catch (failure) { if (current === version.current) { setOverview(null); setReview(null); setRecovery(true); setError(failure instanceof Error ? failure.message : "We couldn't confirm your session. Try again."); } }
    finally { if (current === version.current) setLoading(false); }
  }, [accept]);
  useEffect(() => {
    const counter = version;
    if (accept) {
      const candidate = new URLSearchParams(window.location.hash.slice(1)).get("invite") || takeInvitationReturn();
      if (/^[A-Za-z0-9_-]{43}$/.test(candidate)) { invitation.current = candidate; setHasInvitation(true); saveInvitationReturn(candidate); }
      if (window.location.hash) window.history.replaceState(null, "", window.location.pathname);
    }
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const next = session?.user.id ?? null;
      if (authUser.current !== next) { authUser.current = next; counter.current++; setOverview(null); setReview(null); setConsent(false); setFeedback(""); feedbackKey.current = null; if (enabled) setTimeout(() => { void load(); }, 0); }
    });
    return () => { counter.current++; authUser.current = undefined; data.subscription.unsubscribe(); };
  }, [accept, enabled, load]);
  async function change(body: unknown) {
    if (saving.current) return; saving.current = true;
    setBusy(true); setMessage(""); setError("");
    const currentUser = authUser.current;
    try {
      const result = await betaRequest("/api/beta/onboarding", body);
      if (currentUser !== authUser.current) return;
      setMessage(result.message);
      if ((body as { action?: string }).action === "accept") { invitation.current = ""; clearInvitationReturn(); setHasInvitation(false); }
      if ((body as { action?: string }).action === "feedback") { setFeedback(""); feedbackKey.current = null; }
      await load(); if ((body as { action?: string }).action === "accept") heading.current?.focus();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Unable to save. Your input has been kept."); }
    finally { saving.current = false; setBusy(false); }
  }
  async function signIn(switchAccount = false) {
    try {
      await rememberDestination(accept ? "/beta/accept" : "/beta/participant", invitation.current || undefined);
      if (switchAccount) { const result = await supabase.auth.signOut({ scope: "local" }); if (result.error) throw result.error; }
      window.location.assign(signInPath(accept ? "/beta/accept" : "/beta/participant"));
    } catch { setError("We couldn't preserve your invitation. Please try again."); }
  }
  const participant = overview?.participation;
  const active = participant && !participant.revoked_at && !participant.withdrawn_at && new Date(participant.expires_at).getTime() > Date.now();
  return <main className="min-h-screen bg-cream px-4 py-6 text-ink"><div className="mx-auto max-w-2xl">
    <header className="mb-6 flex flex-wrap items-center justify-between gap-3"><MealCaddieLogo /><Link className="min-h-11 py-3 font-semibold text-pine underline" href="/">MealCaddie home</Link></header>
    <h1 ref={heading} tabIndex={-1} className="text-3xl font-bold text-pine">{active ? "You're in! Welcome to the MealCaddie beta." : accept ? "Your beta invitation" : "Your MealCaddie beta"}</h1>
    <p className="mt-3">Help us make everyday meal planning easier. Participation requires no payment information and creates no subscription.</p>
    <p role="status" aria-live="polite" className="my-3 text-pine">{message || (enabled && loading ? "Checking your account and beta access…" : "")}</p><p role="alert" className="my-3 text-berry">{error}</p>
    {!enabled ? <p className="rounded-2xl bg-white p-5">Beta onboarding is disabled in this environment.</p> : null}
    {overview ? <p className="my-4 break-words">Signed in as: <strong>{overview.verifiedEmail}</strong></p> : null}
    {enabled && signedIn === false ? <section className="my-5 rounded-2xl bg-white p-5"><h2 className="text-xl font-semibold">{accept ? "Sign in to accept your invitation." : "Sign in to view your beta participation."}</h2><p className="my-3">Use the verified account that received your invitation. We will return you here after sign-in.</p><button className={button} onClick={() => void signIn()}>Sign in to MealCaddie</button></section> : null}
    {review?.state === "wrong_account" ? <section className="my-5 rounded-2xl bg-white p-5"><h2 className="text-xl font-semibold">You are signed in with a different MealCaddie account.</h2><p className="my-3">Switch to the verified account that received this invitation. Your invitation will be preserved.</p><button className={button} onClick={() => void signIn(true)}>Switch accounts</button></section> : null}
    {review && ["expired", "revoked", "unavailable"].includes(review.state) && !participant ? <p role="status" className="my-5 rounded-2xl bg-white p-5">{review.state === "revoked" ? "This invitation was revoked." : review.state === "expired" ? "This invitation has expired or is no longer available." : "This invitation is unavailable."} Contact the beta team for help.</p> : null}
    {accept && !participant && review?.state === "ready" ? <section className="my-5 space-y-4 rounded-2xl bg-white p-5" aria-label="Accept invitation">
      <h2 className="text-xl font-semibold text-pine">This account matches your beta invitation.</h2>
      <p>{review.cohort === "plus" ? "Temporary Plus Beta" : "Free Beta"} · 30 days from acceptance, capped by the program end date.</p>
      {review.cohort === "plus" ? <p>Plus privileges are temporary and expire automatically. Your stored Free plan and saved content remain unchanged.</p> : null}
      <p>The personal link expires seven days after issuance. Do not forward it. Signing in does not automatically accept it.</p>
      <form onSubmit={event => { event.preventDefault(); void change({ action: "accept", token: invitation.current, consent }); }}>
        <label className="flex items-start gap-3 py-3"><input type="checkbox" required checked={consent} onChange={event => setConsent(event.target.checked)} className="mt-1 h-5 w-5" /><span>I agree to beta participation and have read the <Link href="/beta/privacy" className="text-pine underline">privacy notice</Link>. Optional analytics and marketing are separate choices.</span></label>
        <button className={button} disabled={!enabled || !hasInvitation || !consent || busy}>{busy ? "Checking…" : "Accept invitation"}</button>
      </form>
    </section> : null}
    {accept && overview && !participant && !hasInvitation ? <p className="my-5">Reopen your original invitation email to review its personal acceptance link.</p> : null}
    {recovery ? <button className={button} disabled={busy || loading} onClick={() => void load()}>Try again</button> : null}
    {participant ? <>
      <section className="my-5 space-y-3 rounded-2xl bg-white p-5" aria-label="Participation and access"><h2 className="text-xl font-semibold text-pine">{participant.cohort === "plus" ? "Temporary Plus Beta" : "Free Beta"}</h2><p>{participant.withdrawn_at ? "Withdrawn" : participant.revoked_at ? "Revoked" : active ? "Active participation" : "Expired"}</p>{active ? <p>Your beta access is active. You are ready to start exploring MealCaddie.</p> : <p>Your beta access is no longer active. You can still use your existing MealCaddie account.</p>}<p>Participation ends {new Date(participant.expires_at).toLocaleString()}.</p><p>No subscription or payment was created.</p>{participant.cohort === "plus" ? <p>Plus beta privileges expire automatically. Your stored account plan and saved content remain unchanged. Existing paid Plus access is preserved.</p> : null}<Link href="/" className={button + " inline-block"} onClick={event => { event.preventDefault(); void accountRequest("/api/auth/intent", {}, "DELETE").then(() => window.location.assign("/")).catch(() => setError("We could not open MealCaddie. Please try again.")); }}>{active ? "Start exploring MealCaddie" : "Continue to MealCaddie"}</Link>{accept ? <Link className="block min-h-11 py-3 text-pine underline" href="/beta/participant">Send beta feedback</Link> : null}</section>
      {!accept && !participant.withdrawn_at ? <form className="my-5 space-y-4 rounded-2xl bg-white p-5" onSubmit={event => { event.preventDefault(); feedbackKey.current ??= crypto.randomUUID(); void change({ action: "feedback", category, feature, message: feedback, requestKey: feedbackKey.current }); }} aria-label="Beta feedback">
        <h2 className="text-xl font-semibold text-pine">Send beta feedback</h2><p id="feedback-help">Report a bug, suggest an improvement or describe something confusing. Please leave out medical details, passwords and personal information about other people. Feedback is optional; analytics and marketing consent are not required.</p>
        <label className="block">Feedback type<select className={control} value={category} onChange={event => { setCategory(event.target.value); feedbackKey.current = null; }} disabled={busy}><option value="bug">Bug report</option><option value="suggestion">Feature suggestion</option><option value="usability">General experience or usability</option></select></label>
        <label className="block">Area<select className={control} value={feature} onChange={event => { setFeature(event.target.value); feedbackKey.current = null; }} disabled={busy}>{areas.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <p className="text-sm">Current feature access: {overview?.featurePlan === "plus" ? "Plus" : "Free"}. You can report locked features and upgrade explanations, too.</p>
        <label className="block">Your feedback<textarea required minLength={10} maxLength={2000} rows={5} className={control} value={feedback} disabled={busy} aria-describedby="feedback-help feedback-length" onChange={event => { setFeedback(event.target.value); feedbackKey.current = null; }} /></label><p id="feedback-length" className="text-sm">{feedback.length}/2,000 characters. At least 10 characters.</p><button className={button} disabled={busy}>{busy ? "Saving…" : "Send feedback"}</button>
      </form> : null}
      {!accept && active ? <section className="my-5 rounded-2xl bg-white p-5"><h2 className="text-xl font-semibold text-pine">Optional usage reporting</h2><p className="my-3">Share only counts of successful plans and feedback submissions. No meals, ingredients, prompts or device fingerprints are collected. Turning it off removes your existing beta usage reports.</p><label className="flex items-center gap-3"><input className="h-5 w-5" type="checkbox" disabled={busy} checked={participant.engagement_consent} onChange={event => void change({ action: "settings", consent: event.target.checked, withdraw: false })} />Share minimal usage counts</label></section> : null}
      {!accept && overview?.feedback.length ? <section aria-label="Your feedback" className="my-5 space-y-3"><h2 className="text-xl font-semibold text-pine">Your recent feedback</h2>{overview.feedback.map(item => <article key={item.id} className="rounded-2xl bg-white p-4"><h3 className="font-semibold">{item.category} · {item.status.replace(/_/g, " ")}</h3><p className="mt-2 whitespace-pre-wrap break-words">{item.message}</p></article>)}</section> : null}
      {!accept && !participant.withdrawn_at ? <details className="my-5 rounded-2xl border border-pine bg-white p-5"><summary className="min-h-11 cursor-pointer py-3 font-semibold">Leave the beta</summary><p className="my-3">This removes temporary beta privileges and stops usage reporting. Your MealCaddie account, subscriptions and saved content remain.</p><label className="flex items-center gap-3 py-3"><input className="h-5 w-5" type="checkbox" checked={withdraw} onChange={event => setWithdraw(event.target.checked)} />I want to withdraw from beta participation</label><button className={button} disabled={!withdraw || busy} onClick={() => void change({ action: "settings", consent: false, withdraw: true })}>Withdraw participation</button></details> : null}
    </> : null}
    {enabled && overview && !participant && !accept ? <p className="my-5">No beta participation is active for this account. Open your personal invitation to join, or contact the beta team if onboarding prevented you from joining.</p> : null}
    <footer className="my-8"><a className="text-pine underline" href="mailto:beta@mealcaddie.app">Contact the beta team</a></footer>
  </div></main>;
}
