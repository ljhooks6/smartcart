"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { usePersonalization } from "./account-personalization";
import { accountRequest, saveInvitationReturn } from "@/lib/account-client";
import { authDestination, settledAuthDestination } from "@/lib/auth-destination";
import { SmartCartApp } from "./smart-cart-app.fixed";
import Link from "next/link";
export function AuthHome({ publicContent }: { publicContent?: ReactNode } = {}) {
  const { profile, loading, error, refresh, recovering } = usePersonalization(); const router = useRouter();
  const pathname = usePathname();
  const processed = useRef<string | null>(null); const [returning, setReturning] = useState(false), [failure, setFailure] = useState("");
  const userId = profile?.userId; const newAccount = profile?.newAccount;
  useEffect(() => {
    if (recovering) { router.replace("/auth/reset"); return; }
    if (loading || !userId || processed.current === userId) return;
    processed.current = userId; let alive = true; let completed = false; setReturning(true);
    void accountRequest("/api/auth/intent").then(result => {
      if (!alive) return;
      completed = true;
      if (result.unavailable) setFailure("The requested page isn't available for this account. You can continue safely from MealCaddie.");
      const destination = authDestination(result.destination);
      if (result.invitation) saveInvitationReturn(result.invitation);
      if (destination === "/beta/accept") router.replace(destination);
      else if (newAccount && profile?.onboardingAvailable && !profile.householdComplete) router.replace(`/account/onboarding?next=${encodeURIComponent(destination === "/" ? "/planner" : destination)}`);
      else if (newAccount) router.replace(`/account/setup?next=${encodeURIComponent(destination)}`);
      else { const next = settledAuthDestination(destination, pathname); if (next) router.replace(next); else { void accountRequest("/api/auth/intent", {}, "DELETE").catch(() => {}); setReturning(false); } }
    }).catch(() => { if (alive) { completed = true; setReturning(false); setFailure("We couldn't restore your requested page. You can safely continue from MealCaddie."); } });
    return () => { alive = false; if (!completed) processed.current = null; };
  }, [loading, userId, newAccount, router, pathname, recovering, profile?.onboardingAvailable, profile?.householdComplete]);
  if (returning) return <main className="min-h-screen bg-cream p-6 text-pine"><p role="status">Returning you to MealCaddie…</p></main>;
  return <>{failure || error ? <aside className="bg-cream p-4"><p role="alert" className="text-berry">{failure || error}</p><Link className="inline-block min-h-11 py-3 font-semibold text-pine underline" href="/auth/sign-in">Sign in again</Link><button className="min-h-11 px-3 text-pine underline" onClick={() => { processed.current = null; void refresh(); }}>Retry account loading</button></aside> : null}{publicContent ?? <SmartCartApp />}</>;
}
