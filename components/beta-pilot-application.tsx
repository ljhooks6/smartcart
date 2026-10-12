"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { BetaApplication } from "./beta-application";
import { MealCaddieLogo } from "./mealcaddie-logo";
import { signInPath } from "@/lib/auth-destination";
type Intake = { email: string; application: { status: string; cohort: string | null; beta_consent_at: string } | null };
export async function pilotAuthorization() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw Error("Sign in to your existing participant account on MealCaddie, then return to this application. No new account or additional authentication email is needed if you are already signed in.");
  return `Bearer ${data.session.access_token}`;
}
export function BetaPilotApplication({ siteKey }: { siteKey: string }) {
  const [intake, setIntake] = useState<Intake | null>(null);
  const [error, setError] = useState(""); const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true); setError(""); setIntake(null);
    try {
      const response = await fetch("/api/beta/pilot-application", { cache: "no-store", headers: { Authorization: await pilotAuthorization() } });
      const result = await response.json();
      if (!response.ok) throw Error(result.error ?? "Unable to verify your participant account.");
      setIntake(result);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to verify your participant account."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  if (intake && !intake.application) return <BetaApplication key={intake.email} accepting siteKey={siteKey} pilotEmail={intake.email} authorize={pilotAuthorization} />;
  return <main className="min-h-screen bg-cream px-4 py-8 text-ink"><div className="mx-auto max-w-2xl space-y-6"><MealCaddieLogo /><h1 className="text-3xl font-bold text-pine">Your controlled pilot application</h1>
    {loading ? <p role="status">Verifying your signed-in participant account…</p> : null}
    {error ? <p role="alert" className="rounded-xl border border-berry/30 bg-white p-4 text-berry">{error}</p> : null}
    {intake?.application ? <section className="rounded-2xl bg-white p-6"><h2 className="text-xl font-bold">Your application is already recorded.</h2><p className="mt-3 break-all">{intake.email}</p><p className="mt-3">Status: {intake.application.status.replace(/_/g, " ")}. Applying does not automatically approve or activate participation.</p><p className="mt-3">For changes or withdrawal, contact <a href="mailto:support@mealcaddie.app" className="underline">support@mealcaddie.app</a>.</p></section> : null}
    <div className="flex flex-wrap gap-4"><Link href={signInPath("/beta/pilot-apply")} className="inline-flex min-h-12 items-center rounded-xl bg-pine px-4 py-3 font-semibold text-white">MealCaddie / sign in</Link><button disabled={loading} onClick={() => void refresh()} className="min-h-12 rounded-xl border border-pine px-4 py-3 font-semibold disabled:opacity-50">Refresh after sign-in</button></div>
    <p className="text-sm">Only the two verified pilot identities can apply here. Public recruitment, invitation sending and participation activation remain separately controlled.</p>
  </div></main>;
}
