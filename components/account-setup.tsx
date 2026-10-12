"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { requestedDestination, signInPath } from "@/lib/auth-destination";
import { accountRequest } from "@/lib/account-client";
import { usePersonalization } from "./account-personalization";
import { MealCaddieLogo } from "./mealcaddie-logo";
export function AccountSetup() {
  const { profile, loading, error, refresh } = usePersonalization(); const router = useRouter();
  const [name, setName] = useState(""), [busy, setBusy] = useState(false), [failure, setFailure] = useState(""); const destination = useRef("/"), alert = useRef<HTMLParagraphElement>(null);
  useEffect(() => { destination.current = requestedDestination(window.location.search); }, []);
  const profileId = profile?.userId; const prefill = profile?.prefill ?? "";
  useEffect(() => { setName(prefill); }, [profileId, prefill]);
  useEffect(() => { if (failure) alert.current?.focus(); }, [failure]);
  async function finish(skip: boolean) {
    if (!profile || busy) return; setBusy(true); setFailure("");
    try { await accountRequest("/api/account/profile", skip ? { skip: true } : { name }, "PUT"); if (profile.newAccount) { try { sessionStorage.setItem(`mealcaddie-first-welcome:${profile.userId}`, "yes"); } catch { /* Greeting can remain generic. */ } } await refresh(); router.replace(destination.current); }
    catch (cause) { setFailure(cause instanceof Error ? cause.message : "Your name couldn't be saved. Please retry."); setBusy(false); }
  }
  return <main className="min-h-screen bg-cream px-4 py-8 text-ink"><div className="mx-auto max-w-md space-y-5 rounded-3xl bg-white p-6 sm:p-8"><MealCaddieLogo /><h1 className="font-display text-3xl text-pine">Welcome to MealCaddie!</h1><p>Before we get cooking, what should we call you?</p><p className="text-sm">A first name or display name is enough. You can skip this and edit it later in Account.</p>{loading ? <p role="status">Loading your account…</p> : profile ? <form className="space-y-4" aria-busy={busy} onSubmit={e => { e.preventDefault(); void finish(false); }}><label className="block font-semibold">Preferred name<input autoComplete="given-name" maxLength={120} value={name} onChange={e => setName(e.target.value)} disabled={busy} aria-describedby="setup-name-help" className="mt-2 min-h-12 w-full rounded-xl border border-pine px-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine" /></label><p id="setup-name-help" className="text-sm">Up to 60 characters. Choose the name you’d like us to use.</p><button disabled={busy} className="min-h-12 w-full rounded-xl bg-pine px-4 py-3 font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine disabled:opacity-50">{busy ? "Saving…" : "Save and continue"}</button><button type="button" disabled={busy} onClick={() => void finish(true)} className="min-h-12 w-full rounded-xl border border-pine px-4 py-3 font-semibold text-pine focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine">Skip for now</button></form> : <><p role="alert">{error || "Please sign in to personalize your account."}</p><Link href={signInPath(destination.current)} className="inline-block min-h-11 py-3 font-semibold text-pine underline">Sign in to MealCaddie</Link><button className="min-h-11 px-3 underline" onClick={() => void refresh()}>Retry loading account</button></>}<p ref={alert} role="alert" tabIndex={-1} className="text-berry">{failure}</p></div></main>;
}

