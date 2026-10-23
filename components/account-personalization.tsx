"use client";
import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { initialRecoveryCallback, supabase } from "@/lib/supabase";
import { accountRequest, type PersonalProfile } from "@/lib/account-client";
import { welcomeGreeting, firstWelcome } from "@/lib/personalization";
import { usePathname } from "next/navigation";
type State = { profile: PersonalProfile | null; loading: boolean; error: string; refresh: () => Promise<void>; recovering: boolean; finishRecovery: () => void };
const Context = createContext<State>({ profile: null, loading: true, error: "", refresh: async () => {}, recovering: false, finishRecovery: () => {} });
export function PersonalizationProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<PersonalProfile | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [recovering, setRecovering] = useState(false);
  useEffect(() => { if (initialRecoveryCallback) setRecovering(true); }, []);
  const version = useRef(0);
  const sessionOwner = useRef<string | null>(null);
  const pathname = usePathname(); const profileId = profile?.userId;
  const refresh = useCallback(async () => {
    const current = ++version.current; setLoading(true); setProfile(null); setError("");
    try { const { data } = await supabase.auth.getSession(); if (!data.session) return; const person = await accountRequest("/api/account/profile"); if (current === version.current) setProfile(person); }
    catch { if (current === version.current) setError("Your account details couldn't load. Please retry."); }
    finally { if (current === version.current) setLoading(false); }
  }, []);
  useEffect(() => { const counter = version; void refresh(); const { data } = supabase.auth.onAuthStateChange((event, session) => { const nextOwner = session?.user.id ?? null; if (sessionOwner.current && sessionOwner.current !== nextOwner) { setRecovering(false); try { sessionStorage.removeItem(`mealcaddie-household-draft:${sessionOwner.current}`); } catch { /* Cloud progress remains owner-scoped. */ } } sessionOwner.current = nextOwner; if (event === "PASSWORD_RECOVERY") setRecovering(true); if (event === "SIGNED_OUT") setRecovering(false); counter.current++; setProfile(null); setLoading(true); setTimeout(() => { void refresh(); }, 0); }); return () => { counter.current++; data.subscription.unsubscribe(); }; }, [refresh]);
  useEffect(() => { if (profileId && !["/", "/auth/sign-in", "/auth/register", "/auth/recover", "/auth/reset", "/account/setup", "/account/onboarding"].includes(pathname)) void accountRequest("/api/auth/intent", {}, "DELETE").catch(() => {}); }, [pathname, profileId]);
  return <Context.Provider value={{ profile, loading, error, refresh, recovering, finishRecovery: () => setRecovering(false) }}>{children}</Context.Provider>;
}
export function usePersonalization() { return useContext(Context); }
export function PersonalizedWelcome() {
  const { profile, loading, error } = usePersonalization();
  const [greeting, setGreeting] = useState<{ owner: string; first: boolean } | null>(null);
  const welcomed = useRef(new Map<string, boolean>());
  const owner = profile?.userId;
  useEffect(() => { if (owner) { let first = false; try { first = firstWelcome(sessionStorage, owner, welcomed.current); } catch { /* Storage is optional. */ } setGreeting({ owner, first }); } else setGreeting(null); }, [owner]);
  if (loading || !profile) return error ? <p className="text-sm text-ink/70">Your account details are temporarily unavailable.</p> : null;
  if (greeting?.owner !== profile.userId) return null;
  return <section className="my-4 w-full max-w-7xl rounded-2xl bg-white/80 p-4" aria-label="Your welcome"><h2 className="break-words font-display text-2xl text-pine" style={{ overflowWrap: "anywhere" }}>{welcomeGreeting(profile.name, greeting.first)}</h2><p className="mt-2 text-sm text-ink/70">Ready to plan something delicious?</p>{profile.onboardingAvailable && !profile.householdComplete ? <Link href="/account/onboarding?next=%2Fplanner" className="inline-block min-h-11 py-3 font-semibold text-pine underline">Set up your kitchen preferences (optional)</Link> : null}{!profile.complete ? <Link href="/account/setup" className="inline-block min-h-11 py-3 font-semibold text-pine underline">What should we call you? Add a name whenever you’re ready.</Link> : null}</section>;
}
export function PreferredNameEditor() {
  const helpId = useId();
  const { profile, loading, error, refresh } = usePersonalization();
  const [name, setName] = useState(""), [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [failure, setFailure] = useState("");
  useEffect(() => { setName(profile?.name ?? ""); }, [profile?.userId, profile?.name]);
  const alert = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (failure) alert.current?.focus(); }, [failure]);
  return <form className="space-y-3 rounded-2xl border border-pine/20 p-4" aria-busy={busy || loading} onSubmit={event => { event.preventDefault(); setBusy(true); setFailure(""); setMessage(""); void accountRequest("/api/account/profile", { name }, "PUT").then(async result => { setMessage(result.message); await refresh(); }).catch(cause => setFailure(cause instanceof Error ? cause.message : "Unable to save your name.")).finally(() => setBusy(false)); }}><label className="block font-semibold">Preferred name<input autoComplete="given-name" maxLength={120} value={name} disabled={loading || busy || !profile} onChange={e => setName(e.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-pine px-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine" aria-describedby={helpId} /></label><p id={helpId} className="text-sm">Up to 60 characters. Leave blank for a generic greeting.</p><p role="status" aria-live="polite" className="text-sm">{loading ? "Loading your name…" : message}</p><p role="alert" ref={alert} tabIndex={-1} className="text-sm text-berry">{failure || error}</p><button disabled={busy || loading || !profile} className="min-h-12 rounded-xl bg-pine px-4 py-3 font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine disabled:opacity-50">{busy ? "Saving…" : "Save preferred name"}</button></form>;
}
