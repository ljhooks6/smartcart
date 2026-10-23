import { supabase } from "./supabase";
export type PersonalProfile = { userId: string; name: string; prefill: string; complete: boolean; newAccount: boolean; onboardingAvailable?: boolean; householdComplete?: boolean };
export async function accountRequest(path: string, body?: unknown, method = "POST", expectedOwner?: string) {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw Error("Please sign in to your existing MealCaddie account.");
  if (expectedOwner && data.session.user.id !== expectedOwner) throw Error("Your account changed. Reopen setup for your current account.");
  const response = await fetch(path, { cache: "no-store", credentials: "same-origin", method: body === undefined ? "GET" : method, headers: { Authorization: `Bearer ${data.session.access_token}`, ...(body === undefined ? {} : { "Content-Type": "application/json" }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const result = await response.json(); if (!response.ok) throw Error(result.error ?? "Please retry in a moment."); return result;
}
export async function rememberDestination(destination: string, invitation?: string) {
  const response = await fetch("/api/auth/intent", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ destination, preserveInvitation: true, ...(invitation ? { invitation } : {}) }) });
  if (!response.ok) throw Error("We couldn't preserve your destination. Please retry before signing in.");
}
const inviteKey = "mealcaddie-invitation-return";
export function saveInvitationReturn(token: string) {
  if (/^[A-Za-z0-9_-]{43}$/.test(token)) sessionStorage.setItem(inviteKey, JSON.stringify({ token, at: Date.now() }));
}
export function takeInvitationReturn() {
  try { const value = JSON.parse(sessionStorage.getItem(inviteKey) ?? "null"); sessionStorage.removeItem(inviteKey); return value && Date.now() >= value.at && Date.now() - value.at < 1800000 && /^[A-Za-z0-9_-]{43}$/.test(value.token) ? value.token : ""; } catch { sessionStorage.removeItem(inviteKey); return ""; }
}
export function clearInvitationReturn() { sessionStorage.removeItem(inviteKey); }
