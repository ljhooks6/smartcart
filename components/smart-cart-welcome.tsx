"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";

type Props = {
  ready: boolean;
  busy: boolean;
  email: string;
  message: string;
  onEmailChange: (value: string) => void;
  onGoogleLogin: () => void | Promise<void>;
  onEmailLogin: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onContinueAsGuest: () => void;
};

export function SmartCartWelcome({ ready, busy, email, message, onEmailChange, onGoogleLogin, onEmailLogin, onContinueAsGuest }: Props) {
  const [showEmail, setShowEmail] = useState(false);

  return <main className="mealcaddie-surface flex min-h-[100svh] flex-col items-center justify-center px-6 py-10 font-body">
    <div className="w-full max-w-sm">
      <div className="mb-10 text-center">
        <Image src="/app-icon.png" alt="" width={88} height={88} priority className="mx-auto rounded-3xl ring-8 ring-apricot/30" />
        <p className="mt-3 text-lg font-semibold text-pine">MealCaddie</p>
      </div>
      <h1 className="text-center font-display text-4xl leading-tight text-pine">Your week starts here.</h1>
      <p className="mt-4 text-center text-base leading-7 text-ink/65">Sign in to keep your meals and saved recipes together.</p>
      {!ready ? <p role="status" className="mt-10 text-center text-sm text-pine">Getting your account ready…</p> : <div className="mt-8 space-y-3">
        <button type="button" disabled={busy} onClick={() => void onGoogleLogin()} className="flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-pine px-4 py-4 font-semibold text-white disabled:opacity-60">
          <span aria-hidden="true" className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-bold text-pine">G</span>
          {busy ? "Signing in…" : "Continue with Google"}
        </button>
        <button type="button" disabled={busy} aria-expanded={showEmail} onClick={() => setShowEmail((open) => !open)} className="min-h-14 w-full rounded-2xl border border-pine/20 bg-white px-4 py-4 font-semibold text-pine disabled:opacity-60">Continue with email</button>
        {showEmail ? <form onSubmit={onEmailLogin} className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4">
          <label className="block text-sm font-semibold text-ink">Email address
            <input autoComplete="email" inputMode="email" required type="email" value={email} onChange={(event) => onEmailChange(event.target.value)} disabled={busy} placeholder="you@example.com" className="mt-2 min-h-12 w-full rounded-xl border border-stone-300 px-3 text-base outline-none focus:border-pine focus:ring-2 focus:ring-pine/20" />
          </label>
          <button type="submit" disabled={busy} className="min-h-12 w-full rounded-xl bg-orange-500 px-4 py-3 font-semibold text-white disabled:opacity-60">{busy ? "Sending…" : "Send sign-in link"}</button>
          <p className="text-xs leading-5 text-ink/60">We’ll email you a sign-in link. No password needed.</p>
        </form> : null}
        {message ? <p role="status" aria-live="polite" className="rounded-xl bg-white p-3 text-sm leading-6 text-ink">{message}</p> : null}
        <button type="button" disabled={busy} onClick={onContinueAsGuest} className="min-h-12 w-full py-3 text-sm font-semibold text-ink/65 underline underline-offset-4 disabled:opacity-60">Continue as guest</button>
        <p className="text-center text-xs leading-5 text-ink/70">Guest plans stay on this device. Sign in to save your week across devices.</p>
      </div>}
    </div>
  </main>;
}
