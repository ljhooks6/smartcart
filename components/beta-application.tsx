"use client";
import Link from "next/link";
import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import { MealCaddieLogo } from "./mealcaddie-logo";
import { betaInterests, displayBetaValue } from "@/lib/beta-domain";
type TurnstileApi = { render: (element: HTMLElement, options: Record<string, unknown>) => string; reset: (id: string) => void; remove: (id: string) => void };
declare global { interface Window { turnstile?: TurnstileApi } }
const fieldClass = "w-full rounded-xl border border-pine/25 bg-white px-4 py-3 text-ink focus:outline-none focus:ring-2 focus:ring-pine";
const sourceChoices = ["direct", "facebook", "instagram", "friends", "community", "other"];
export function BetaApplication({ accepting, siteKey }: { accepting: boolean; siteKey: string }) {
  const [token, setToken] = useState(""); const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(""); const [done, setDone] = useState(false);
  const [source, setSource] = useState("direct"); const [campaign, setCampaign] = useState("");
  const widget = useRef<HTMLDivElement>(null); const widgetId = useRef<string | null>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const mountChallenge = useCallback(() => {
    if (!widget.current || !window.turnstile || widgetId.current !== null || !siteKey) return;
    widgetId.current = window.turnstile.render(widget.current, { sitekey: siteKey, action: "beta_application", size: "compact", callback: (value: string) => setToken(value), "expired-callback": () => setToken(""), "error-callback": () => { setToken(""); setMessage("Verification could not load. Please retry or contact support@mealcaddie.app."); } });
  }, [siteKey]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const value = params.get("source") ?? params.get("utm_source") ?? "direct";
    setSource(sourceChoices.includes(value) ? value : "other");
    const name = params.get("utm_campaign") ?? "";
    if (/^[a-zA-Z0-9 _.-]{0,80}$/.test(name)) setCampaign(name);
    mountChallenge();
    return () => { if (widgetId.current !== null) window.turnstile?.remove(widgetId.current); widgetId.current = null; };
  }, [mountChallenge]);
  useEffect(() => { if (done) resultHeading.current?.focus(); }, [done]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy || !token) return;
    const form = new FormData(event.currentTarget);
    if (!form.getAll("interests").length) { setMessage("Please choose at least one testing interest."); return; }
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/beta/applications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.get("email"), frequency: form.get("frequency"), challenges: form.get("challenges"), interests: form.getAll("interests"), planInterest: form.get("planInterest"), feedbackWilling: form.get("feedback") === "yes", betaConsent: form.get("betaConsent") === "on", marketingConsent: form.get("marketingConsent") === "on", website: form.get("website") ?? "", turnstileToken: token, source, campaign }) });
      const result = await response.json();
      if (!response.ok) { setMessage(result.error ?? "We couldn’t submit your application. Please retry."); return; }
      setDone(true);
    } catch { setMessage("We couldn’t connect. Your answers are still here; please retry."); }
    finally { setBusy(false); setToken(""); if (widgetId.current !== null) window.turnstile?.reset(widgetId.current); }
  }
  return <main className="min-h-screen bg-cream px-4 py-6 text-ink sm:px-8">
    <div className="mx-auto max-w-2xl"><header className="mb-8 flex items-center justify-between gap-4"><MealCaddieLogo /><Link href="/" className="rounded-lg px-3 py-2 text-sm font-semibold text-pine underline">Back to MealCaddie</Link></header>
      <section className="rounded-3xl bg-pine p-6 text-white sm:p-9"><p className="text-sm font-semibold text-parchment">A calmer week starts here</p><h1 className="mt-3 text-3xl font-bold sm:text-4xl">Help make meal planning feel easier.</h1><p className="mt-4 leading-relaxed">Try MealCaddie, share what works for your household, and help us improve the everyday details. We’re inviting a small group of beta testers with a range of routines and needs.</p><p className="mt-4 text-sm text-parchment">Applications are open to everyone. Participation is by invitation, and applying does not guarantee acceptance. No payment information is requested. Selected testers will explore MealCaddie over a short testing period and share feedback to help improve the experience.</p></section>
      {!accepting ? <p role="status" className="mt-6 rounded-xl border border-pine/25 bg-parchment p-4">This is a private review preview. Applications are not open yet.</p> : null}
      {done ? <section className="my-8 rounded-3xl bg-white p-7 shadow-sm"><h2 ref={resultHeading} tabIndex={-1} className="text-2xl font-bold text-pine">Thanks for raising your hand.</h2><p className="mt-3">Your application has been received for review. We’ll contact selected applicants when invitations are ready. You can request withdrawal at <a className="underline" href="mailto:support@mealcaddie.app">support@mealcaddie.app</a>.</p></section> : <form onSubmit={submit} className="my-8 space-y-6 rounded-3xl bg-white p-6 shadow-sm sm:p-8" aria-busy={busy}>
        <h2 className="text-2xl font-bold text-pine">Tell us a little about your week</h2>
        <label className="block font-semibold">Email address<input className={`${fieldClass} mt-2`} name="email" type="email" autoComplete="email" maxLength={254} required /></label>
        <label className="block font-semibold">How often do you plan meals?<select className={`${fieldClass} mt-2`} name="frequency" defaultValue="" required><option value="" disabled>Choose your routine</option>{[["daily", "Every day"], ["several_times_week", "Several times a week"], ["weekly", "Once a week"], ["occasionally", "Occasionally"], ["getting_started", "I’m getting started"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="block font-semibold">What’s the hardest part of meal planning?<textarea className={`${fieldClass} mt-2 min-h-28`} name="challenges" minLength={10} maxLength={1500} required aria-describedby="challenges-help" /><span id="challenges-help" className="mt-2 block text-sm font-normal">10–1,500 characters. Please avoid sharing medical details or other sensitive information.</span></label>
        <fieldset><legend className="mb-2 font-semibold">What would you like to test? Choose at least one.</legend><div className="grid gap-2 sm:grid-cols-2">{betaInterests.map(value => <label key={value} className="flex min-h-11 items-center gap-3 rounded-xl border border-pine/20 px-3 py-2"><input className="h-5 w-5 accent-pine" type="checkbox" name="interests" value={value} />{displayBetaValue(value)}</label>)}</div></fieldset>
        <label className="block font-semibold">Which experience interests you?<select className={`${fieldClass} mt-2`} name="planInterest" defaultValue="either"><option value="free">Free</option><option value="plus">Plus</option><option value="either">Either — I’m happy to help</option></select><span className="mt-2 block text-sm font-normal">This is a preference. The beta team makes final cohort selections.</span></label>
        <fieldset><legend className="font-semibold">Are you willing to share feedback?</legend><div className="mt-2 flex flex-wrap gap-4">{[["yes", "Yes"], ["no", "Not right now"]].map(([value, label]) => <label key={value} className="flex min-h-11 items-center gap-2"><input type="radio" name="feedback" value={value} required className="h-5 w-5 accent-pine" />{label}</label>)}</div></fieldset>
        <label className="block font-semibold">How did you hear about us?<select className={`${fieldClass} mt-2`} value={source} onChange={event => setSource(event.target.value)}>{sourceChoices.map(value => <option key={value} value={value}>{value === "direct" ? "MealCaddie website" : displayBetaValue(value)}</option>)}</select></label>
        <div className="absolute -left-[10000px]" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
        <label className="flex items-start gap-3"><input type="checkbox" name="betaConsent" required className="mt-1 h-5 w-5 shrink-0 accent-pine" /><span>I agree to MealCaddie storing my application and contacting me about this beta. I’ve read the <Link href="/beta/privacy" className="font-semibold text-pine underline" target="_blank" rel="noopener">beta privacy notice (opens in a new tab)</Link>.</span></label>
        <label className="flex items-start gap-3"><input type="checkbox" name="marketingConsent" className="mt-1 h-5 w-5 shrink-0 accent-pine" /><span>Optional: I’d also like general MealCaddie news and product updates. This choice does not affect selection.</span></label>
        {accepting && siteKey ? <><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" onReady={mountChallenge} /><div ref={widget} role="group" aria-label="Security verification" /><p id="beta-verification-status" role="status" aria-live="polite" className="text-sm">{token ? "Security verification is ready." : "Complete the security verification above before applying. If it does not load, contact support@mealcaddie.app."}</p></> : null}
        <p role="alert" className="text-sm font-semibold text-berry">{message}</p>
        <button aria-describedby={accepting && siteKey ? "beta-verification-status" : undefined} disabled={!accepting || !siteKey || !token || busy} className="min-h-12 w-full rounded-xl bg-pine px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Submitting…" : "Apply to help shape MealCaddie"}</button>
        <p className="text-sm">Applying does not change your existing account or add you to the separate Plus updates waitlist.</p>
      </form>}
      <footer className="pb-8 text-sm"><a className="text-pine underline" href="mailto:support@mealcaddie.app">Questions or privacy requests</a></footer>
    </div>
  </main>;
}
