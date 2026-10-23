import { betaJson, boundedJson } from "./beta-server";
import { personAccess } from "./personalization-server";
import { accountExperienceEnabled, householdPreferences, readHousehold } from "./account-experience";
export async function householdGet(request: Request) {
  if (!accountExperienceEnabled()) return betaJson({ error: "Household setup is not enabled here." }, 503);
  const access = await personAccess(request); if ("response" in access) return access.response;
  return betaJson({ owner: access.user.id, preferences: readHousehold(access.user.user_metadata) });
}
export async function householdPut(request: Request) {
  if (!accountExperienceEnabled()) return betaJson({ error: "Household setup is not enabled here." }, 503);
  if (request.headers.get("origin") !== new URL(request.url).origin || request.headers.get("sec-fetch-site") === "cross-site") return betaJson({ error: "Use MealCaddie on this website." }, 403);
  const access = await personAccess(request); if ("response" in access) return access.response;
  try {
    const parsed = householdPreferences.safeParse(await boundedJson(request));
    if (!parsed.success) return betaJson({ error: "Check the optional answers and try again." }, 400);
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`, { method: "PUT", headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, Authorization: request.headers.get("authorization")!, "Content-Type": "application/json" }, body: JSON.stringify({ data: { mealcaddie_household_v1: parsed.data } }), signal: AbortSignal.timeout(10000) });
    if (!response.ok) return betaJson({ error: "We couldn’t save your answers. Your draft is still here." }, 503);
    const user = await response.json();
    if (user.id !== access.user.id) return betaJson({ error: "Account changed. Please sign in again." }, 503);
    return betaJson({ owner: user.id, preferences: readHousehold(user.user_metadata) });
  } catch { return betaJson({ error: "We couldn’t save your answers. Please retry." }, 503); }
}
export async function passwordPut(request: Request) {
  if (!accountExperienceEnabled()) return betaJson({ error: "Password setup is not enabled here." }, 503);
  if (request.headers.get("origin") !== new URL(request.url).origin) return betaJson({ error: "Use MealCaddie on this website." }, 403);
  const access = await personAccess(request); if ("response" in access) return access.response;
  try {
    const body = await boundedJson(request) as Record<string, unknown>;
    if (!body || Object.keys(body).length !== 1 || typeof body.password !== "string" || body.password.length < 12 || body.password.length > 128) return betaJson({ error: "Use a password of 12–128 characters." }, 400);
    const result = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`, { method: "PUT", headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, Authorization: request.headers.get("authorization")!, "Content-Type": "application/json" }, body: JSON.stringify({ password: body.password }), signal: AbortSignal.timeout(10000) });
    if (!result.ok) return betaJson({ error: "Your password couldn’t be saved. Request a fresh recovery link if it has expired." }, 400);
    return betaJson({ saved: true });
  } catch { return betaJson({ error: "Password recovery is temporarily unavailable." }, 503); }
}
