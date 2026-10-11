"use client";

import type { FormEvent } from "react";
import type { SmartCartPlan } from "../lib/smart-cart-membership";
import { SmartCartDialog } from "./smart-cart-dialog";
import Link from "next/link";

export function SmartCartAccountDialog({ open, onClose, userEmail, userPlan, betaEnabled, betaExpiresAt, isProfileLoading, isAuthLoading, email, authMessage, onEmailChange, onGoogleLogin, onSwitchGoogleAccount, onLoginSubmit, onSignOut, onUpgrade }: {
  open: boolean; onClose: () => void; userEmail: string; userPlan: SmartCartPlan | null;
  isProfileLoading: boolean; isAuthLoading: boolean; email: string; authMessage: string;
  onEmailChange: (value: string) => void;
  onGoogleLogin: () => void | Promise<void>; onSwitchGoogleAccount: () => void | Promise<void>;
  onLoginSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSignOut: () => void; onUpgrade: () => void | Promise<void>;
  betaEnabled?: boolean; betaExpiresAt?: string | null;
}) {
  const signedIn = Boolean(userEmail.trim());
  const buttonClass = "min-h-12 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-pine hover:bg-cream disabled:opacity-60";
  return <SmartCartDialog open={open} title="Account" onClose={onClose}>
    <div className="space-y-5">
      {signedIn ? <>
        <div className="rounded-2xl bg-cream p-4">
          <p className="text-xs font-semibold text-pine">Signed in</p>
          <p className="mt-2 break-all text-sm font-semibold">{userEmail}</p>
          <p className="mt-2 text-sm text-ink/65">{isProfileLoading ? "Loading your plan…" : userPlan === "plus" ? "MealCaddie Plus" : "Free plan"}</p>
        </div>
        <p className="text-sm leading-6 text-ink/65">Save your week to keep your meals and favorites together across devices.</p>
        {betaEnabled ? <div className="rounded-xl bg-cream p-4"><p>{betaExpiresAt ? `Beta participation ends ${new Date(betaExpiresAt).toLocaleString()}.` : "Beta participation is invitation-only."}</p><Link onClick={onClose} className="inline-block min-h-11 py-3 font-semibold text-pine underline" href="/beta/participant">Beta participation and feedback</Link></div> : null}
        {userPlan !== "plus" ? <button type="button" className={buttonClass} onClick={() => { onClose(); void onUpgrade(); }}>Preview MealCaddie Plus</button> : null}
        <button type="button" className={buttonClass} disabled={isAuthLoading} onClick={() => { onClose(); void onSwitchGoogleAccount(); }}>Use a Different Google Account</button>
        <button type="button" className={buttonClass} disabled={isAuthLoading} onClick={() => { onClose(); onSignOut(); }}>Sign Out</button>
      </> : <>
        <p className="text-sm leading-6 text-ink/65">You’re using MealCaddie as a guest. Sign in to save your week across devices.</p>
        <button type="button" className="min-h-12 w-full rounded-2xl bg-pine px-4 py-3 text-sm font-semibold text-white hover:bg-pine/90 disabled:opacity-60" disabled={isAuthLoading} onClick={() => void onGoogleLogin()}>Continue with Google</button>
        <form onSubmit={onLoginSubmit} className="space-y-3">
          <label className="block text-sm font-semibold">Email address<input required type="email" autoComplete="email" inputMode="email" value={email} onChange={(event) => onEmailChange(event.target.value)} className="mt-2 min-h-12 w-full rounded-2xl border border-stone-200 px-4 text-base" /></label>
          <button type="submit" className={buttonClass} disabled={isAuthLoading}>{isAuthLoading ? "Sending…" : "Send sign-in link"}</button>
        </form>
      </>}
      {authMessage ? <p role="status" className="text-sm leading-6 text-ink/70">{authMessage}</p> : null}
      <details className="border-t border-stone-200 pt-3">
        <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-pine">Add MealCaddie to your home screen</summary>
        <p className="mt-2 text-sm leading-6 text-ink/65"><strong>iPhone:</strong> Open MealCaddie in Safari, tap Share, then Add to Home Screen.</p>
        <p className="mt-3 text-sm leading-6 text-ink/65"><strong>Android:</strong> Open your browser menu, then tap Add to Home screen or Install app.</p>
      </details>
    </div>
  </SmartCartDialog>;
}
