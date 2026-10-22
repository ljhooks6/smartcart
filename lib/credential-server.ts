import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { setTimeout as pause } from "node:timers/promises";
import { betaJson, betaStorageClient, boundedJson, betaNetworkHash } from "./beta-server";
import { accountExperienceEnabled, credentialSchema, usernameSchema } from "./account-experience";
import { emailAuthRedirect } from "./auth-redirect";
import { openIntent, intentCookie } from "./auth-intent";
import { personAccess } from "./personalization-server";
import { onboardingEnabled } from "./beta-onboarding-domain";

const generic = "If these details are eligible, check your email for the next step. Already have an account? Use your usual sign-in method.";
function sameSite(request: Request) { return request.headers.get("origin") === new URL(request.url).origin && request.headers.get("sec-fetch-site") !== "cross-site"; }
function cookieInvitation(request: Request) {
  const value = (request.headers.get("cookie") ?? "").split(";").map(v => v.trim()).find(v => v.startsWith(`${intentCookie}=`))?.slice(intentCookie.length + 1);
  return value ? openIntent(value, process.env.BETA_RATE_LIMIT_SECRET ?? "")?.invitation : undefined;
}
async function limited(request: Request, identifier: string) {
  const client = betaStorageClient();
  for (const key of [`account-network:${betaNetworkHash(request)}`, `account-identity:${identifier.toLowerCase()}`]) {
    const secret = process.env.BETA_RATE_LIMIT_SECRET ?? "";
    // Secret-keyed identity buckets never persist plaintext emails or usernames.
    const rate = await client.rpc("beta_check_rate", { p_key: createHash("sha256").update(secret + key).digest("hex") });
    if (rate.error || !rate.data) return false;
  }
  return true;
}
export async function credentialPost(request: Request) {
  if (!accountExperienceEnabled()) return betaJson({ error: "Password account access is not enabled here. Use the existing Google or email-link sign-in." }, 503);
  if (!sameSite(request)) return betaJson({ error: "Start on MealCaddie." }, 403);
  const started = Date.now();
  try {
    const parsed = credentialSchema.safeParse(await boundedJson(request));
    if (!parsed.success) return betaJson({ error: "Check your details. New passwords need 12–128 characters; usernames use 3–30 letters, numbers or underscores and start with a letter." }, 400);
    const input = parsed.data, identifier = input.action === "login" ? input.identifier : input.email;
    if (!await limited(request, identifier)) return betaJson({ error: "Please wait before trying again." }, 429);
    const auth = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }).auth;
    const admin = betaStorageClient();
    if (input.action === "login") {
      let email = input.identifier.toLowerCase();
      if (!email.includes("@")) {
        const name = usernameSchema.safeParse(email);
        const row = name.success ? await admin.from("account_usernames").select("user_id").eq("username", name.data).maybeSingle() : null;
        if (row?.error) return betaJson({ error: "Sign-in is temporarily unavailable." }, 503);
        const user = row?.data ? await admin.auth.admin.getUserById(row.data.user_id) : null;
        email = user?.data.user?.email ?? "unknown-account@example.invalid";
      }
      // Supabase verifies every password, including unknown-name attempts. Never return resolved emails.
      const result = await auth.signInWithPassword({ email, password: input.password });
      if (result.error || !result.data.session || !result.data.user?.email_confirmed_at) return betaJson({ error: "We couldn’t sign you in. Check your details or use your existing Google/email-link sign-in." }, 401);
      return betaJson({ session: { access_token: result.data.session.access_token, refresh_token: result.data.session.refresh_token } });
    }
    if (input.action === "recover") {
      await auth.resetPasswordForEmail(input.email, { redirectTo: emailAuthRedirect(new URL(request.url).origin) });
      return betaJson({ message: generic });
    }
    // A current recipient-bound invitation is required before normal Auth signup.
    // The raw invitation lives only in the existing encrypted HttpOnly return cookie.
    const token = onboardingEnabled() ? cookieInvitation(request) : undefined;
    if (token) {
      const program = await admin.from("beta_programs").select("onboarding_enabled,beta_ended_at,participation_limit_at").eq("slug", "public-beta").maybeSingle();
      if (program.error) return betaJson({ error: "Account setup is temporarily unavailable." }, 503);
      if (!program.data?.onboarding_enabled || program.data.beta_ended_at || (program.data.participation_limit_at && Date.parse(program.data.participation_limit_at) <= Date.now())) return betaJson({ message: generic });
      const row = await admin.from("beta_invitations").select("state,expires_at,bound_user_id,beta_applications(email,status)").eq("token_hash", createHash("sha256").update(token).digest("hex")).maybeSingle();
      if (row.error) return betaJson({ error: "Account setup is temporarily unavailable." }, 503);
      const applicant = row.data?.beta_applications as unknown as { email: string; status: string } | undefined;
      if (row.data?.state === "issued" && !row.data.bound_user_id && Date.parse(row.data.expires_at) > Date.now() && applicant?.status === "invited" && applicant.email === input.email) {
        const result = await auth.signUp({ email: input.email, password: input.password, options: { emailRedirectTo: emailAuthRedirect(new URL(request.url).origin), data: { requested_username: input.username } } });
        if (result.data.session) return betaJson({ error: "Email verification must be enabled before registration can continue. Contact support." }, 503);
      }
    }
    return betaJson({ message: generic });
  } catch { return betaJson({ error: "Account access is temporarily unavailable. Please retry later." }, 503); }
  finally { await pause(Math.max(0, 600 - (Date.now() - started))); }
}
export async function usernamePut(request: Request) {
  if (!accountExperienceEnabled()) return betaJson({ error: "Account setup is not enabled here." }, 503);
  if (!sameSite(request)) return betaJson({ error: "Start on MealCaddie." }, 403);
  const access = await personAccess(request); if ("response" in access) return access.response;
  try {
    const body = await boundedJson(request) as Record<string, unknown>;
    const username = usernameSchema.safeParse(body.username);
    if (Object.keys(body).length !== 1 || !username.success) return betaJson({ error: "Choose a username using 3–30 letters, numbers or underscores, starting with a letter." }, 400);
    const result = await betaStorageClient().rpc("account_claim_username", { p_user: access.user.id, p_username: username.data });
    if (result.error) return betaJson({ error: "That username can’t be saved. Choose another, or continue with email/Google sign-in." }, 409);
    return betaJson({ username: result.data });
  } catch { return betaJson({ error: "Username setup is temporarily unavailable." }, 503); }
}
