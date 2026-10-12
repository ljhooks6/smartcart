"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { signInMealCaddieEmail, signInMealCaddieGoogle } from "@/lib/auth-redirect";
import { requestedDestination } from "@/lib/auth-destination";
import { accountRequest, rememberDestination } from "@/lib/account-client";
import { MealCaddieLogo } from "./mealcaddie-logo";
export function AuthSignIn() {
  const router = useRouter(); const [email, setEmail] = useState(""), [message, setMessage] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false), [ready, setReady] = useState(false);
  const destination = useRef("/"); const alert = useRef<HTMLParagraphElement>(null);
  useEffect(() => { destination.current = requestedDestination(window.location.search); let alive = true; void accountRequest("/api/account/profile").then(async () => { await rememberDestination(destination.current); if (alive) router.replace("/"); }).catch(() => { if (alive) setReady(true); }); return () => { alive = false; }; }, [router]);
  useEffect(() => { if (error) alert.current?.focus(); }, [error]);
  async function start(google: boolean) {
    setBusy(true); setError(""); setMessage("");
    try {
      // Only a path appears in this page URL. Invitation context stays encrypted in
      // an HttpOnly cookie; preserve it rather than overwriting it during sign-in.
      const response = await fetch("/api/auth/intent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ destination: destination.current, preserveInvitation: true }) });
      if (!response.ok) throw Error("We couldn't preserve your destination. Please retry.");
      const result = google ? await signInMealCaddieGoogle(supabase.auth, window.location.origin) : await signInMealCaddieEmail(supabase.auth, email, window.location.origin);
      if (result.error) throw Error("Sign-in couldn't start. Check your details and try again.");
      setMessage(google ? "Continuing to Google…" : "Check your inbox. Your sign-in or confirmation link will return you to the page you requested on this browser.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Sign-in is temporarily unavailable."); }
    finally { setBusy(false); }
  }
  return <main className="min-h-screen bg-cream px-4 py-8 text-ink"><div className="mx-auto max-w-md space-y-6 rounded-3xl bg-white p-6 sm:p-8"><MealCaddieLogo /><h1 className="font-display text-3xl text-pine">Welcome to MealCaddie</h1><p>Sign in or create your account. We’ll bring you back to the page you requested.</p><p className="text-sm">Already have an account? Use the same email or connected Google account. No password or payment information is needed.</p><button disabled={!ready || busy} onClick={() => void start(true)} className="min-h-12 w-full rounded-xl bg-pine px-4 py-3 font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine disabled:opacity-50">Continue with Google</button><form className="space-y-4" onSubmit={event => { event.preventDefault(); void start(false); }}><label className="block font-semibold">Email address<input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-pine px-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine" /></label><button disabled={!ready || busy} className="min-h-12 w-full rounded-xl border border-pine px-4 py-3 font-semibold text-pine focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine disabled:opacity-50">{busy ? "Starting sign-in…" : "Email me a sign-in link"}</button></form><p role="status" aria-live="polite">{!ready ? "Checking your sign-in…" : message}</p><p role="alert" ref={alert} tabIndex={-1} className="text-berry">{error}</p><Link href="/" className="inline-block min-h-11 py-3 font-semibold text-pine underline">Back to MealCaddie</Link></div></main>;
}

