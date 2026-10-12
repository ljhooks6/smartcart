"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AuthHome } from "./auth-home";
import { MealCaddieLogo } from "./mealcaddie-logo";

export function ProductShell({ gated }: { gated: boolean }) {
  const [allowed, setAllowed] = useState(!gated), [loading, setLoading] = useState(gated), [message, setMessage] = useState("");
  useEffect(() => {
    if (!gated) return;
    let alive = true, generation = 0; let owner: string | null | undefined;
    async function check() {
      const current = ++generation;
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session) { if (alive && current === generation) { setAllowed(false); setMessage("Sign in with the verified account that accepted your invitation."); } return; }
        const result = await fetch("/api/product-access", { cache: "no-store", headers: { Authorization: `Bearer ${data.session.access_token}` } });
        const body = await result.json();
        if (alive && current === generation) { setAllowed(result.ok && body.allowed === true); setMessage(result.ok ? "" : body.error || "Access could not be verified."); }
      } catch { if (alive && current === generation) { setAllowed(false); setMessage("Access could not be verified. Please retry."); } }
      finally { if (alive && current === generation) setLoading(false); }
    }
    const { data } = supabase.auth.onAuthStateChange((_event, session) => { const next = session?.user.id ?? null; if (owner !== next) { owner = next; setAllowed(false); setLoading(true); } setTimeout(() => { if (alive) void check(); }, 0); });
    const timer = setInterval(() => { void check(); }, 60000);
    function visible() { if (document.visibilityState === "visible") void check(); }
    document.addEventListener("visibilitychange", visible); void check();
    return () => { alive = false; generation++; data.subscription.unsubscribe(); clearInterval(timer); document.removeEventListener("visibilitychange", visible); };
  }, [gated]);
  if (allowed) return <AuthHome />;
  return <main className="min-h-screen bg-cream px-4 py-8 text-ink"><div className="mx-auto max-w-xl space-y-5"><MealCaddieLogo /><h1 className="text-3xl font-bold text-pine">MealCaddie beta access</h1><p role="status">{loading ? "Checking your account…" : message}</p><p>Applying or receiving an invitation does not activate access. Sign in, reopen your invitation and explicitly accept it. Existing preserved Plus and administrator access remains available.</p><nav aria-label="Access options" className="flex flex-col gap-3"><Link className="min-h-11 py-3 underline" href="/auth/sign-in?next=%2Fplanner">Sign in to MealCaddie</Link><Link className="min-h-11 py-3 underline" href="/beta/accept">Return to your invitation</Link><Link className="min-h-11 py-3 underline" href="/beta/participant">Participation and feedback</Link><Link className="min-h-11 py-3 underline" href="/account/privacy">Request content access or account deletion</Link><Link className="min-h-11 py-3 underline" href="/">Back to public home</Link></nav></div></main>;
}
