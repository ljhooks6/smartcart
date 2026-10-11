"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { betaCohorts, betaStatuses, displayBetaValue } from "@/lib/beta-domain";
import { BetaVerification } from "./beta-verification";
import { MealCaddieLogo } from "./mealcaddie-logo";
type Applicant = { id: string; email: string; frequency: string; challenges: string; interests: string[]; plan_interest: string; feedback_willing: boolean; marketing_consent: boolean; beta_consent_at: string; source: string; campaign: string; status: string; cohort: string | null; updated_at: string; created_at: string };
type Directory = { applications: Applicant[]; total: number; page: number; program: { free_target: number; plus_target: number; reserve_target: number; recruitment_closed_at: string | null; beta_ended_at: string | null }; counters: { cohorts: Record<string, number>; statuses: Record<string, number>; sources: Record<string, number> } };
const selectClass = "min-h-11 rounded-xl border border-pine/25 bg-white px-3 py-2 text-ink focus:ring-2 focus:ring-pine";
const buttonClass = "min-h-11 rounded-xl bg-pine px-4 py-2 font-semibold text-white disabled:opacity-50";
async function adminRequest(path: string, body?: unknown) {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw Error("Sign in to your confirmed administrator account in MealCaddie, then return here.");
  const response = await fetch(path, { method: body ? "POST" : "GET", cache: "no-store", headers: { Authorization: `Bearer ${data.session.access_token}`, ...(body ? { "Content-Type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const result = await response.json(); if (!response.ok) throw Error(result.error ?? "Unable to load administration."); return result;
}
function ApplicantCard({ applicant, onChange, busy }: { applicant: Applicant; onChange: (body: unknown) => Promise<void>; busy: boolean }) {
  const [status, setStatus] = useState(applicant.status); const [cohort, setCohort] = useState(applicant.cohort ?? "");
  const immutable = ["withdrawn", "invited", "activated"].includes(applicant.status);
  return <article className="rounded-2xl border border-pine/20 bg-white p-5">
    <h2 className="break-all text-lg font-semibold text-pine">{applicant.email}</h2><p className="mt-1 text-sm">Applied {new Date(applicant.created_at).toLocaleDateString()} · {displayBetaValue(applicant.status)}</p>
    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="font-semibold">Routine</dt><dd>{displayBetaValue(applicant.frequency)}</dd></div><div><dt className="font-semibold">Plan interest</dt><dd>{displayBetaValue(applicant.plan_interest)}</dd></div><div><dt className="font-semibold">Testing interests</dt><dd>{applicant.interests.map(displayBetaValue).join(", ")}</dd></div><div><dt className="font-semibold">Feedback</dt><dd>{applicant.feedback_willing ? "Willing to provide feedback" : "Not right now"}</dd></div><div><dt className="font-semibold">Source</dt><dd>{displayBetaValue(applicant.source)}{applicant.campaign ? ` / ${applicant.campaign}` : ""}</dd></div><div><dt className="font-semibold">Consents</dt><dd>Beta: {new Date(applicant.beta_consent_at).toLocaleDateString()} · Marketing: {applicant.marketing_consent ? "Yes" : "No"}</dd></div></dl>
    <p className="mt-4 whitespace-pre-wrap break-words rounded-xl bg-cream p-3">{applicant.challenges}</p>
    <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); void onChange({ action: "update", change: { id: applicant.id, expectedUpdatedAt: applicant.updated_at, status, cohort: cohort || null } }); }}>
      <label className="flex flex-col gap-1 text-sm font-semibold">Status<select disabled={busy || immutable} className={selectClass} value={status} onChange={event => setStatus(event.target.value)}>{betaStatuses.map(value => <option key={value} value={value} disabled={value === "invited" || value === "activated"}>{displayBetaValue(value)}</option>)}</select></label>
      <label className="flex flex-col gap-1 text-sm font-semibold">Assigned cohort<select disabled={busy || immutable} className={selectClass} value={cohort} onChange={event => setCohort(event.target.value)}><option value="">Unassigned</option>{betaCohorts.map(value => <option key={value} value={value}>{displayBetaValue(value)}</option>)}</select></label>
      <button disabled={busy || immutable} className={buttonClass}>Save review</button>
      {applicant.status === "approved" ? <button type="button" disabled={busy} className={buttonClass} onClick={() => void onChange({ action: "draft", id: applicant.id })}>Prepare invitation draft</button> : null}
      {applicant.marketing_consent ? <button type="button" disabled={busy} className="min-h-11 rounded-xl border border-pine/30 px-3 py-2 text-pine" onClick={() => void onChange({ action: "revoke_marketing", id: applicant.id })}>Revoke marketing consent</button> : null}
    </form>
  </article>;
}
export function BetaAdmin() {
  const [directory, setDirectory] = useState<Directory | null>(null); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ q: "", status: "", cohort: "", source: "", page: 1 });
  const [search, setSearch] = useState(""); const [targets, setTargets] = useState({ free: 30, plus: 15, reserve: 5 });
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const params = new URLSearchParams(); Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, String(value)); }); const query = Object.fromEntries(params); const result: Directory = await adminRequest("/api/beta/admin", { action: "search", query }); setDirectory(result); setTargets({ free: result.program.free_target, plus: result.program.plus_target, reserve: result.program.reserve_target }); }
    catch (failure) { setDirectory(null); setError(failure instanceof Error ? failure.message : "Unable to load applicants."); }
    finally { setLoading(false); }
  }, [filters]);
  useEffect(() => { void load(); const { data } = supabase.auth.onAuthStateChange(() => { setDirectory(null); setTimeout(() => { void load(); }, 0); }); return () => data.subscription.unsubscribe(); }, [load]);
  async function change(body: unknown) {
    setBusy(true); setMessage(""); setError("");
    try { const result = await adminRequest("/api/beta/admin", body); setMessage(result.message + (result.result?.applications_deleted !== undefined ? ` Deleted ${result.result.applications_deleted} expired applications and ${result.result.counters_deleted} expired counters.` : "")); await load(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Unable to save."); }
    finally { setBusy(false); }
  }
  return <main className="min-h-screen bg-cream px-4 py-6 text-ink sm:px-8"><div className="mx-auto max-w-5xl">
    <header className="mb-6 flex flex-wrap items-center justify-between gap-4"><MealCaddieLogo /><nav className="flex flex-wrap gap-4 text-sm font-semibold text-pine"><Link className="min-h-11 py-3 underline" href="/">MealCaddie / sign in</Link><Link className="min-h-11 py-3 underline" href="/beta">Application preview</Link></nav></header>
    <h1 className="text-3xl font-bold text-pine">Beta applicants</h1><p className="mt-2">Cohort assignment reserves a seat. It does not grant access, change billing, or send an email. Move new applicants to Under Review before approving; Reserve candidates stay under review or waitlisted.</p>
    <p role="status" aria-live="polite" className="mt-4 text-pine">{loading ? "Loading administration…" : message}</p><p role="alert" className="mt-2 text-berry">{error}</p>
    {!directory && !loading ? <button className={`${buttonClass} mt-3`} onClick={() => void load()}>Retry after signing in</button> : null}
    {directory ? <>
      <BetaVerification />
      <section aria-label="Cohort counters" className="my-6 grid gap-3 sm:grid-cols-3">{betaCohorts.map(cohort => <div key={cohort} className="rounded-2xl bg-pine p-5 text-white"><h2 className="font-semibold">{displayBetaValue(cohort)}</h2><p className="mt-2 text-3xl font-bold">{directory.counters.cohorts[cohort] ?? 0} / {directory.program[`${cohort}_target` as "free_target" | "plus_target" | "reserve_target"]}</p><p className="mt-1 text-sm">Seats assigned</p></div>)}</section>
      <details className="mb-5 rounded-2xl border border-pine/20 bg-white p-5"><summary className="cursor-pointer font-semibold text-pine">Program settings and retention</summary>
        <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); void change({ action: "targets", targets }); }}>{betaCohorts.map(cohort => <label key={cohort} className="flex flex-col gap-1">{displayBetaValue(cohort)} target<input className={`${selectClass} w-28`} type="number" min={0} max={10000} required value={targets[cohort]} onChange={event => setTargets(previous => ({ ...previous, [cohort]: Number(event.target.value) }))} /></label>)}<button className={buttonClass} disabled={busy}>Save targets</button></form>
        <p className="my-4 text-sm">Invitation delivery and activation are disabled. Legal review, verified contact mailboxes, and explicit launch approval are required. Recruitment {directory.program.recruitment_closed_at ? "closed" : "open internally"}; beta {directory.program.beta_ended_at ? "ended" : "not ended"}.</p>
        <div className="flex flex-wrap gap-3"><button className={buttonClass} disabled={busy} onClick={() => { if (window.confirm("Close recruitment and start the 90-day retention period for unselected applicants?")) void change({ action: "close_recruitment" }); }}>Close recruitment</button><button className={buttonClass} disabled={busy} onClick={() => { if (window.confirm("End the beta and start the 90-day participant retention period?")) void change({ action: "end_beta" }); }}>End beta</button><button className={buttonClass} disabled={busy} onClick={() => { if (window.confirm("Permanently delete only records whose retention period has expired?")) void change({ action: "cleanup" }); }}>Delete expired records</button></div>
      </details>
      <section aria-label="Application status totals" className="mb-4 flex flex-wrap gap-2">{betaStatuses.map(status => <span key={status} className="rounded-full bg-parchment px-3 py-2 text-sm">{displayBetaValue(status)}: {directory.counters.statuses[status] ?? 0}</span>)}</section>
      <details className="mb-5 rounded-xl bg-white p-4"><summary className="cursor-pointer font-semibold">Applicant sources</summary><ul className="mt-2 flex flex-wrap gap-4">{Object.entries(directory.counters.sources).map(([source, count]) => <li key={source}>{displayBetaValue(source)}: {count}</li>)}</ul></details>
      <form className="mb-6 flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); setFilters(previous => ({ ...previous, q: search, page: 1 })); }}>
        <label className="flex min-w-0 flex-1 flex-col gap-1">Search email<input type="search" maxLength={100} className={selectClass} value={search} onChange={event => setSearch(event.target.value)} /></label>
        {[['status', betaStatuses], ['cohort', betaCohorts], ['source', ['direct','facebook','instagram','friends','community','other']]] .map(([name, values]) => <label key={name as string} className="flex flex-col gap-1">{displayBetaValue(name as string)}<select className={selectClass} value={filters[name as 'status' | 'cohort' | 'source']} onChange={event => setFilters(previous => ({ ...previous, [name as string]: event.target.value, page: 1 }))}><option value="">All</option>{(values as readonly string[]).map(value => <option key={value} value={value}>{displayBetaValue(value)}</option>)}</select></label>)}
        <button className={buttonClass}>Search</button>
      </form>
      <p className="mb-3 text-sm">{directory.total} matching applications</p><section aria-label="Applicant directory" aria-busy={loading || busy} className="space-y-4">{directory.applications.map(applicant => <ApplicantCard key={`${applicant.id}:${applicant.updated_at}`} applicant={applicant} onChange={change} busy={busy} />)}{!directory.applications.length ? <p className="rounded-2xl bg-white p-6">No applications match these filters.</p> : null}</section>
      <nav aria-label="Applicant pages" className="my-6 flex items-center justify-between gap-3"><button className={buttonClass} disabled={filters.page <= 1 || loading} onClick={() => setFilters(previous => ({ ...previous, page: previous.page - 1 }))}>Previous</button><span>Page {directory.page}</span><button className={buttonClass} disabled={filters.page * 25 >= directory.total || loading} onClick={() => setFilters(previous => ({ ...previous, page: previous.page + 1 }))}>Next</button></nav>
    </> : null}
  </div></main>;
}
