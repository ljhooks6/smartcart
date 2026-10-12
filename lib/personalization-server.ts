import { createClient } from "@supabase/supabase-js";
import { boundedJson, betaJson } from "./beta-server";
import { personalProfile, preferredName } from "./personalization";
export async function personAccess(request: Request) {
  const origin = request.headers.get("origin");
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get("sec-fetch-site") === "cross-site") return { response: betaJson({ error: "Use MealCaddie on this website." }, 403) };
  const match = /^Bearer ([^\s]+)$/i.exec(request.headers.get("authorization") ?? "");
  if (!match) return { response: betaJson({ error: "Please sign in to your existing account." }, 401) };
  try {
    const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { headers: { Authorization: `Bearer ${match[1]}` } } });
    const result = await client.auth.getUser(match[1]);
    if (result.error || !result.data.user || result.data.user.is_anonymous || !result.data.user.email_confirmed_at) return { response: betaJson({ error: "Please sign in with your verified account." }, result.error?.status && result.error.status >= 500 ? 503 : 401) };
    return { client, user: result.data.user };
  } catch { return { response: betaJson({ error: "Account verification is temporarily unavailable." }, 503) }; }
}
export async function profileGet(request: Request) {
  const access = await personAccess(request); if ("response" in access) return access.response;
  return betaJson({ userId: access.user.id, ...personalProfile(access.user) });
}
export async function profilePut(request: Request) {
  const access = await personAccess(request); if ("response" in access) return access.response;
  try {
    const body = await boundedJson(request) as Record<string, unknown>;
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some(k => !["name", "skip"].includes(k)) || (body.skip !== undefined && body.skip !== true) || (body.skip === true && body.name !== undefined)) return betaJson({ error: "Submit only your preferred name or skip account setup." }, 400);
    const name = preferredName(body.name);
    if (!body.skip && (typeof body.name !== "string" || (body.name.trim() && !name))) return betaJson({ error: "Use a name of up to 60 characters without control characters or angle brackets." }, 400);
    // Caller-scoped Auth client: no privileged update, user ID, email, plan or app_metadata.
    const data = { mealcaddie_setup_complete: true, ...(!body.skip ? { preferred_name: name } : {}) };
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`, { method: "PUT", headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, Authorization: request.headers.get("authorization")!, "Content-Type": "application/json" }, body: JSON.stringify({ data }), signal: AbortSignal.timeout(10000) });
    if (!response.ok) return betaJson({ error: "Your name could not be saved. Please retry." }, 503);
    const user = await response.json();
    if (user.id !== access.user.id) return betaJson({ error: "Your name could not be saved. Please retry." }, 503);
    return betaJson({ userId: access.user.id, ...personalProfile(user), message: body.skip ? "You can add your name later in Account." : "Your preferred name has been saved." });
  } catch { return betaJson({ error: "Please submit a valid name." }, 400); }
}
