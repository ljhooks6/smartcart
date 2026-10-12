"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePersonalization } from "./account-personalization";
import { accountRequest, saveInvitationReturn } from "@/lib/account-client";
import { authDestination } from "@/lib/auth-destination";
import { SmartCartApp } from "./smart-cart-app.fixed";
import Link from "next/link";
export function AuthHome() {
  const { profile, loading, error, refresh } = usePersonalization(); const router = useRouter();
  const processed = useRef<string | null>(null); const [returning, setReturning] = useState(false), [failure, setFailure] = useState("");
  const userId = profile?.userId; const newAccount = profile?.newAccount;
  useEffect(() => {
    if (loading || !userId || processed.current === userId) return;
    processed.current = userId; let alive = true; let completed = false; setReturning(true);
    void accountRequest("/api/auth/intent").then(result => {
      if (!alive) return;
      completed = true;
      if (result.unavailable) setFailure("The requested page isn't available for this account. You can continue safely from MealCaddie.");
      const destination = authDestination(result.destination);
      if (result.invitation) saveInvitationReturn(result.invitation);
      if (newAccount) router.replace(`/account/setup?next=${encodeURIComponent(destination)}`);
      else if (destination !== "/") router.replace(destination);
      else { void accountRequest("/api/auth/intent", {}, "DELETE").catch(() => {}); setReturning(false); }
    }).catch(() => { if (alive) { completed = true; setReturning(false); setFailure("We couldn't restore your requested page. You can safely continue from MealCaddie."); } });
    return () => { alive = false; if (!completed) processed.current = null; };
  }, [loading, userId, newAccount, router]);
  if (returning) return <main className="min-h-screen bg-cream p-6 text-pine"><p role="status">Returning you to MealCaddie…</p></main>;
  return <>{failure || error ? <aside className="bg-cream p-4"><p role="alert" className="text-berry">{failure || error}</p><Link className="inline-block min-h-11 py-3 font-semibold text-pine underline" href="/auth/sign-in">Sign in again</Link><button className="min-h-11 px-3 text-pine underline" onClick={() => { processed.current = null; void refresh(); }}>Retry account loading</button></aside> : null}<SmartCartApp /></>;
}
