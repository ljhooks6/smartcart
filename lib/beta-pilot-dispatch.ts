import { onboardingAccess } from "./beta-onboarding-server";
import { betaJson, boundedJson } from "./beta-server";
import { invitationSendingEnabled } from "./beta-onboarding-domain";
import { pilotInvitationApproved, pilotMode } from "./beta-pilot";
import { deliverOneInvitation, resendInvitationTransport } from "./beta-invitation-delivery";
function targets(): Record<string,{user:string;application:string;cohort:string}> {
 try { const value=JSON.parse(process.env.BETA_PILOT_DISPATCH_TARGETS ?? "{}"); const rows=Object.entries(value) as [string,{user:string;application:string;cohort:string}][]; const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 if(rows.length!==2 || new Set(rows.map(([,r])=>r.user)).size!==2 || new Set(rows.map(([,r])=>r.application)).size!==2 || new Set(rows.map(([,r])=>r.cohort)).size!==2 || rows.some(([email,r])=>email!==email.trim().toLowerCase()|| !/^[^ @]+@[^ @]+[.][^ @]+$/.test(email)|| !uuid.test(r.user)|| !uuid.test(r.application)|| !["free","plus"].includes(r.cohort))) return {}; return value; } catch { return {}; }
}

type Row = { id: string; state: string; bound_user_id: string; application_id: string; beta_applications: { email: string; cohort: string; status: string; beta_consent_at: string | null } };
export async function dispatchPilot(request: Request) {
  if (process.env.VERCEL_ENV !== "preview" || !pilotMode() || process.env.BETA_PILOT_DISPATCH_APPROVED !== "true" || !invitationSendingEnabled()) return betaJson({ error: "Pilot delivery is disabled." }, 403);
  const access = await onboardingAccess(request, true); if ("response" in access) return access.response;
  const owner=process.env.BETA_PILOT_ADMIN_ID;
  if (!owner || access.user.id !== owner) return betaJson({ error: "Confirmed administrator authorization is required." }, 403);
  try { const body = await boundedJson(request) as Record<string, unknown>; if (!body || Object.keys(body).length !== 1 || body.confirm !== "send-authorized-two-person-pilot") return betaJson({ error: "Exact two-person dispatch confirmation is required." }, 400); }
  catch { return betaJson({ error: "Invalid dispatch request." }, 400); }
  const outcomes: { status: string; id?: string }[] = []; let stopped = false; let closed = false;
  try {
    const ids = JSON.parse(process.env.BETA_PILOT_INVITATION_IDS ?? "[]") as unknown;
    if (!Array.isArray(ids) || ids.length !== 2 || new Set(ids).size !== 2 || ids.some(id => typeof id !== "string" || !/^[a-f0-9-]{36}$/i.test(id))) throw Error("Allowlist");
    const found = await access.client.from("beta_invitations").select("id,state,bound_user_id,application_id,beta_applications(email,cohort,status,beta_consent_at)").in("id", ids);
    if (found.error || found.data?.length !== 2) throw Error("Invitations");
    const rows = found.data as unknown as Row[];
    const recipients=targets();
    if (new Set(rows.map(r => r.application_id)).size !== 2 || rows.some(row => {
      const a = row.beta_applications, expected = recipients[a?.email];
      return !expected || row.bound_user_id !== expected.user || row.application_id !== expected.application || a.cohort !== expected.cohort || !a.beta_consent_at || !["approved", "invited"].includes(a.status) || !pilotInvitationApproved(row.id, a.email);
    })) throw Error("Recipient authorization");
    const users = await Promise.all(rows.map(row => access.client.auth.admin.getUserById(row.bound_user_id)));
    if (users.some((result, n) => result.error || !result.data.user?.email_confirmed_at || result.data.user.is_anonymous || result.data.user.id !== rows[n].bound_user_id || result.data.user.email?.toLowerCase() !== rows[n].beta_applications.email)) throw Error("Identity verification");
    const queued = rows.filter(row => row.state === "queued").length;
    for (let n = 0; n < queued; n++) {
      if (n) await new Promise(resolve => setTimeout(resolve, 6000));
      const result = await deliverOneInvitation(access.client, resendInvitationTransport);
      outcomes.push(result);
      if (result.status !== "accepted") { stopped = result.status !== "idle"; break; }
    }
  } catch { stopped = true; }
  finally {
    // Always close the shared send window. Acceptance is independent and remains
    // recipient initiated; never activate a grant or alter a profile here.
    const close = await access.client.from("beta_programs").update({ invitation_delivery_enabled: false }).eq("slug", "public-beta");
    closed = !close.error;
    await access.client.from("beta_program_events").insert({ actor_id: owner, kind: "pilot_dispatch_window_closed", detail: { delivery_count: outcomes.filter(r => r.status === "accepted").length, stopped, closed } });
  }
  return betaJson({ outcomes, deliveryGateClosed: closed, message: stopped || !closed ? "Dispatch stopped. Review the durable ledger and provider status before any further action; do not retry blindly." : "Bounded pilot dispatch finished. Sending is closed; no participation was activated." }, stopped || !closed ? 409 : 200);
}
