"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { signInMealCaddieEmail, signInMealCaddieGoogle } from "@/lib/auth-redirect";
import { requestedDestination } from "@/lib/auth-destination";
import { accountRequest, rememberDestination } from "@/lib/account-client";
import { MealCaddieLogo } from "./mealcaddie-logo";
import { usePersonalization } from "./account-personalization";
export type CredentialMode = "login" | "register" | "recover" | "reset";
const control = "mt-2 min-h-12 w-full rounded-xl border border-pine bg-white px-3 text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine";
const button = "min-h-12 w-full rounded-xl bg-pine px-4 py-3 font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine disabled:opacity-50";
export function CredentialAccess({ mode, enabled }: { mode: CredentialMode; enabled: boolean }) {
  const router = useRouter(), { finishRecovery, recovering, profile } = usePersonalization();
  const [ready, setReady] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [failure, setFailure] = useState("");
  const [identifier, setIdentifier] = useState(""), [username, setUsername] = useState(""), [password, setPassword] = useState(""), [confirmation, setConfirmation] = useState("");
  const destination = useRef("/planner"), alert = useRef<HTMLParagraphElement>(null);
  useEffect(() => { destination.current = requestedDestination(window.location.search); let alive = true; void accountRequest("/api/account/profile").then(async () => { if (mode === "login") { await rememberDestination(destination.current); if (alive) router.replace("/"); } }).catch(() => {}).finally(() => { if (alive) setReady(true); }); return () => { alive = false; }; }, [router, mode]);
  useEffect(() => { if (failure) alert.current?.focus(); }, [failure]);
  async function existing(google: boolean) {
    if (busy) return; setBusy(true); setFailure(""); setMessage("");
    try {
      await rememberDestination(destination.current);
      const result = google ? await signInMealCaddieGoogle(supabase.auth, window.location.origin) : await signInMealCaddieEmail(supabase.auth, identifier, window.location.origin);
      if (result.error) throw Error("Sign-in couldn’t start. Please retry using your usual account.");
      setMessage(google ? "Continuing to Google…" : "Check your inbox. Reopen your invitation after verification if needed.");
    } catch (error) { setFailure(error instanceof Error ? error.message : "Please try again."); }
    finally { setBusy(false); }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (!enabled || !ready || busy) return;
    if ((mode === "register" || mode === "reset") && password !== confirmation) { setFailure("The passwords don’t match. Please enter them again."); return; }
    setBusy(true); setFailure(""); setMessage("");
    try {
      if (mode === "reset") {
        if (!recovering || !profile) throw Error("Open a fresh recovery link before setting your password.");
        await accountRequest("/api/auth/password", { password }, "PUT", profile.userId); setPassword(""); setConfirmation(""); finishRecovery(); router.replace("/"); return;
      }
      if (mode === "login" || mode === "register") await rememberDestination(destination.current);
      const body = mode === "login" ? { action: mode, identifier, password } : mode === "register" ? { action: mode, email: identifier, username, password } : { action: mode, email: identifier };
      const response = await fetch("/api/auth/credentials", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw Error(result.error ?? "Please check your details and retry.");
      setPassword(""); setConfirmation("");
      if (result.session) { const saved = await supabase.auth.setSession(result.session); if (saved.error) throw Error("Your session couldn’t be saved. Please sign in again."); router.replace("/"); }
      else setMessage(result.message);
    } catch (error) { setFailure(error instanceof Error ? error.message : "Account access is temporarily unavailable."); }
    finally { setBusy(false); }
  }
  const title = { login: "Welcome back to MealCaddie", register: "Your invitation. Your account.", recover: "Let’s get you back in", reset: "Choose a new password" }[mode];
  return <main className="min-h-screen bg-cream px-4 py-8 text-ink"><div className="mx-auto max-w-md space-y-5 rounded-3xl bg-white p-6 sm:p-8"><MealCaddieLogo /><h1 className="font-display text-3xl font-bold text-pine">{title}</h1>
    <p>{mode === "register" ? "Account registration is for personally invited testers. Use the exact email that received your invitation. Applying or creating an account does not activate beta access." : mode === "recover" ? "Enter your account email. If eligible, a verification link will help you choose a new password." : mode === "reset" ? "Use the recovery link from your email first. We never ask for your password by email." : "Use your username or email and password, or continue with the same Google account you used before."}</p>
    {!enabled ? <p role="status" className="rounded-xl bg-parchment p-3 text-sm">Password registration and recovery are disabled in this review environment. Existing Google and email-link access is unchanged.</p> : null}
    {mode === "login" ? <button type="button" disabled={!ready || busy} className={button} onClick={() => void existing(true)}>Continue with Google</button> : null}
    <form onSubmit={submit} className="space-y-4" aria-busy={busy}>
      {mode !== "reset" ? <label className="block font-semibold">{mode === "login" ? "Username or email" : "Email address"}<input name="identifier" value={identifier} onChange={e => setIdentifier(e.target.value)} type={mode === "login" ? "text" : "email"} inputMode={mode === "login" ? "text" : "email"} autoCapitalize="none" autoCorrect="off" autoComplete={mode === "login" ? "username" : "email"} maxLength={254} className={control} required /></label> : null}
      {mode === "register" ? <label className="block font-semibold">Username<input name="username" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" pattern="[A-Za-z][A-Za-z0-9_]{2,29}" minLength={3} maxLength={30} className={control} required aria-describedby="username-help" /><span id="username-help" className="mt-2 block text-sm font-normal">3–30 letters, numbers or underscores; start with a letter. Your name is confirmed after email verification. If taken, choose another during setup.</span></label> : null}
      {mode !== "recover" ? <label className="block font-semibold">{mode === "reset" ? "New password" : "Password"}<input name="password" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "login" ? 1 : 12} maxLength={128} className={control} required /></label> : null}
      {mode === "register" || mode === "reset" ? <label className="block font-semibold">Confirm password<input name="confirmation" type="password" value={confirmation} onChange={e => setConfirmation(e.target.value)} autoComplete="new-password" minLength={12} maxLength={128} className={control} required /><span className="mt-2 block text-sm font-normal">Use a unique password of 12–128 characters. A password manager can help.</span></label> : null}
      <button disabled={!enabled || !ready || busy || (mode === "reset" && (!recovering || !profile))} className={button}>{busy ? "Please wait…" : { login: "Sign in", register: "Create my invited account", recover: "Send recovery instructions", reset: "Save new password" }[mode]}</button>
    </form>
    {mode === "login" ? <><button type="button" className="min-h-11 w-full py-3 font-semibold text-pine underline disabled:opacity-50" disabled={!ready || busy || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)} onClick={() => void existing(false)}>Email me a sign-in link instead</button><Link className="inline-block min-h-11 py-3 font-semibold text-pine underline" href="/auth/recover">Forgot your password?</Link><p className="text-sm">Invited and new here? <Link className="font-semibold text-pine underline" href="/auth/register?next=%2Fbeta%2Faccept">Set up your account</Link>. Existing Google users should use Continue with Google; do not create a second account.</p></> : <Link className="inline-block min-h-11 py-3 font-semibold text-pine underline" href="/auth/sign-in?next=%2Fbeta%2Faccept">Return to sign-in</Link>}
    {mode === "reset" && !recovering ? <p role="status">Open the latest recovery email in this browser, or <Link className="underline" href="/auth/recover">request a fresh recovery link</Link>.</p> : null}
    {mode === "reset" ? <button type="button" disabled={busy} className="min-h-11 py-3 font-semibold text-pine underline" onClick={() => { setBusy(true); void supabase.auth.signOut().then(result => { if (result.error) throw result.error; finishRecovery(); router.replace("/auth/sign-in?next=%2Fplanner"); }).catch(() => setFailure("We couldn’t sign out. Please retry.")).finally(() => setBusy(false)); }}>Cancel recovery and sign out</button> : null}
    {mode === "register" ? <p className="text-sm">Read the <Link className="underline" href="/legal/beta">beta participation notice</Link> and <Link className="underline" href="/legal/privacy">privacy policy</Link>. Email verification and explicit invitation acceptance are required before product access. No payment information is requested.</p> : null}
    <p role="status" aria-live="polite">{!ready ? "Checking your session…" : message}</p><p ref={alert} role="alert" tabIndex={-1} className="text-berry">{failure}</p><Link className="inline-block min-h-11 py-3 font-semibold text-pine underline" href="/explore">Explore a sample dinner</Link><Link className="inline-block min-h-11 px-3 py-3 text-pine underline" href="/">MealCaddie home</Link>
  </div></main>;
}
