"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { accountRequest } from "@/lib/account-client";
import { authDestination, requestedDestination } from "@/lib/auth-destination";
import { cookingEquipment, emptyHousehold, householdPreferences, type HouseholdPreferences } from "@/lib/account-experience";
import { usePersonalization } from "./account-personalization";
import { MealCaddieLogo } from "./mealcaddie-logo";
const control = "mt-2 min-h-12 w-full rounded-xl border border-pine bg-white px-3 py-2 text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine";
const action = "min-h-12 rounded-xl bg-pine px-5 py-3 font-semibold text-white disabled:opacity-50";
export function HouseholdOnboarding({ enabled }: { enabled: boolean }) {
  const { profile, loading, refresh } = usePersonalization(); const router = useRouter();
  const owner = profile?.userId;
  const [draft, setDraft] = useState<HouseholdPreferences>(emptyHousehold), [loadedOwner, setLoadedOwner] = useState("");
  const [name, setName] = useState(""), [username, setUsername] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const destination = useRef("/planner"), heading = useRef<HTMLHeadingElement>(null), alert = useRef<HTMLParagraphElement>(null);
  useEffect(() => { const next = requestedDestination(window.location.search); destination.current = next === "/" || next === "/account/onboarding" ? "/planner" : next; }, []);
  useEffect(() => {
    let alive = true; setLoadedOwner(""); setName(""); setUsername(""); setDraft(emptyHousehold()); setError("");
    if (!enabled || !owner) return;
    void Promise.all([accountRequest("/api/account/onboarding", undefined, "GET", owner), supabase.auth.getUser()]).then(([result, identity]) => {
      if (!alive || result.owner !== owner || identity.data.user?.id !== owner) return;
      const saved = householdPreferences.parse(result.preferences);
      if (saved.complete) { router.replace(authDestination(destination.current)); return; }
      let resumed = saved;
      try { const candidate = householdPreferences.safeParse(JSON.parse(sessionStorage.getItem(`mealcaddie-household-draft:${owner}`) ?? "null")); if (candidate.success) resumed = candidate.data; } catch { /* Cloud progress remains available. */ }
      setDraft(resumed); setName(identity.data.user.user_metadata.preferred_name ?? ""); setUsername(identity.data.user.user_metadata.requested_username ?? ""); setLoadedOwner(owner);
    }).catch(() => { if (alive) setError("Your setup couldn’t load. Please retry from Account."); });
    return () => { alive = false; };
  }, [owner, enabled, router]);
  useEffect(() => { if (owner && loadedOwner === owner) try { sessionStorage.setItem(`mealcaddie-household-draft:${owner}`, JSON.stringify(draft)); } catch { /* Next saves progress to your account. */ } }, [owner, loadedOwner, draft]);
  useEffect(() => { heading.current?.focus(); }, [draft.step]);
  useEffect(() => { if (error) alert.current?.focus(); }, [error]);
  async function advance(back = false) {
    if (!owner || loadedOwner !== owner || busy) return; setBusy(true); setError("");
    const capturedOwner = owner;
    try {
      const check = await supabase.auth.getUser();
      if (check.data.user?.id !== capturedOwner) throw Error("Your account changed. Reopen setup for your current account.");
      if (draft.step === 0 && !back) {
        if (name.trim()) await accountRequest("/api/account/profile", { name }, "PUT", capturedOwner);
        if (username.trim()) await accountRequest("/api/account/username", { username }, "PUT", capturedOwner);
      }
      const next = { ...draft, step: Math.max(0, Math.min(2, draft.step + (back ? -1 : 1))), complete: !back && draft.step === 2 };
      const result = await accountRequest("/api/account/onboarding", next, "PUT", capturedOwner);
      const current = await supabase.auth.getUser();
      if (current.data.user?.id !== capturedOwner || result.owner !== capturedOwner) return;
      if (next.complete) {
        try { sessionStorage.removeItem(`mealcaddie-household-draft:${owner}`); sessionStorage.setItem(`mealcaddie-household-ready:${owner}`, "yes"); } catch { /* Preferences remain on the account. */ }
        await supabase.auth.refreshSession(); await refresh(); router.replace(destination.current);
      } else setDraft(next);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Your draft is still here. Please retry."); }
    finally { setBusy(false); }
  }
  const ready = enabled && owner && loadedOwner === owner;
  return <main className="min-h-screen bg-cream px-4 py-8 text-ink"><div className="mx-auto max-w-xl space-y-5 rounded-3xl bg-white p-6 sm:p-8"><MealCaddieLogo /><p className="text-sm font-semibold text-pine">Your kitchen, your pace · Step {draft.step + 1} of 3</p><h1 ref={heading} tabIndex={-1} className="font-display text-3xl font-bold text-pine">{["Let’s make this feel like you", "A few dinner preferences", "Set up a practical week"][draft.step]}</h1><p>Every answer is optional. Next saves your progress to your account. This browser also keeps an interrupted draft for the same account. Completing setup does not grant beta access.</p>
    {!enabled ? <p role="status">Household setup is disabled in this review environment.</p> : null}
    {enabled && !ready ? <p role="status">{loading ? "Checking your account…" : owner ? "Loading your saved answers…" : "Sign in with your verified invited account to save your setup."}</p> : null}
    <form className="space-y-5" aria-busy={busy} onSubmit={event => { event.preventDefault(); void advance(); }}>
      <fieldset disabled={!ready || busy} className="space-y-4">
        <legend className="sr-only">Optional kitchen preferences</legend>
        {draft.step === 0 ? <>
          <label className="block font-semibold">What should we call you?<input className={control} value={name} onChange={e => setName(e.target.value)} autoComplete="given-name" maxLength={60} /></label>
          <label className="block font-semibold">Username (optional for existing accounts)<input className={control} value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" pattern="[A-Za-z][A-Za-z0-9_]{2,29}" maxLength={30} /><span className="mt-2 block text-sm font-normal">Verified accounts may claim one available username. Email and Google remain available if you skip it.</span></label>
          <label className="block font-semibold">How many people are you cooking for?<input className={control} type="number" min={1} max={12} inputMode="numeric" value={draft.householdSize ?? ""} onChange={e => setDraft(current => ({ ...current, householdSize: e.target.value ? Number(e.target.value) : null }))} /></label>
        </> : draft.step === 1 ? <>
          <label className="block font-semibold">Food preference<select className={control} value={draft.diet} onChange={e => setDraft(current => ({ ...current, diet: e.target.value as HouseholdPreferences["diet"] }))}>{["No preference", "Vegetarian", "Vegan", "Pescatarian"].map(value => <option key={value}>{value}</option>)}</select></label>
          <label className="block font-semibold">Ingredients you dislike<input className={control} maxLength={300} value={draft.dislikes} onChange={e => setDraft(current => ({ ...current, dislikes: e.target.value }))} /></label>
          <label className="block font-semibold">Food allergies or medical restrictions<textarea className={control} maxLength={300} value={draft.restrictions} onChange={e => setDraft(current => ({ ...current, restrictions: e.target.value }))} aria-describedby="restriction-help" /></label><p id="restriction-help" className="text-sm">Optional; avoid medical history. Allergy-dependent and medical-diet generation remains restricted. Entering a restriction does not make generation suitable or verified safe. <Link className="underline" href="/legal/safety">Read the safety notice</Link>.</p>
        </> : <>
          <label className="block font-semibold">Time for dinner<select className={control} value={draft.prepTime} onChange={e => setDraft(current => ({ ...current, prepTime: e.target.value as HouseholdPreferences["prepTime"] }))}>{["Under 30 mins", "Under 1 hour", "No limit"].map(value => <option key={value}>{value}</option>)}</select></label>
          <fieldset><legend className="font-semibold">Available equipment</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{cookingEquipment.map(value => <label key={value} className="flex min-h-11 items-center gap-3 rounded-lg border border-pine/20 p-3"><input type="checkbox" checked={draft.availableEquipment.includes(value)} onChange={e => setDraft(current => ({ ...current, availableEquipment: e.target.checked ? [...current.availableEquipment, value] : current.availableEquipment.filter(item => item !== value) }))} />{value}</label>)}</div></fieldset>
          <label className="block font-semibold">Optional weekly grocery budget (USD)<input className={control} type="number" min={1} max={10000} step="0.01" inputMode="decimal" value={draft.budget ?? ""} onChange={e => setDraft(current => ({ ...current, budget: e.target.value ? Number(e.target.value) : null }))} /></label><p className="text-sm">These are starting preferences, not a purchase or a promise about grocery prices. You’ll review your plan before generating anything.</p>
        </>}
      </fieldset>
      <div className="flex flex-wrap gap-3">{draft.step > 0 ? <button type="button" disabled={!ready || busy} className="min-h-12 px-4 py-3 font-semibold text-pine underline disabled:opacity-50" onClick={() => void advance(true)}>Back</button> : null}<button disabled={!ready || busy} className={action}>{busy ? "Saving…" : draft.step === 2 ? "Continue to my first dinner plan" : "Save and next"}</button></div>
      <p className="text-sm">Leave optional answers blank to skip them, then choose Next. Already finished? <Link className="underline" href="/planner">Return to your planner</Link>.</p>
    </form><p role="alert" ref={alert} tabIndex={-1} className="text-berry">{error}</p><button type="button" disabled={busy} className="inline-block min-h-11 py-3 font-semibold text-pine underline" onClick={() => { void supabase.auth.signOut({ scope: "local" }).then(result => { if (result.error) setError("We couldn’t sign out. Please retry."); else router.replace("/auth/sign-in?next=%2Faccount%2Fonboarding"); }); }}>Sign out and switch accounts</button></div></main>;
}
