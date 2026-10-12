import { z } from "zod";
import { betaStorageClient, betaJson, boundedJson } from "./beta-server";
import { sameOrigin } from "./beta-onboarding-domain";
export async function privacyRequest(request: Request) {
  if (process.env.LEGAL_STORAGE_APPROVED !== "true") return betaJson({ error: "Online request recording awaits review. Contact support@mealcaddie.app; no account data has been changed." }, 503);
  if (!sameOrigin(request)) return betaJson({ error: "Invalid origin." }, 403);
  const token = /^Bearer ([^\s]+)$/i.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!token) return betaJson({ error: "Sign in to verify ownership of your privacy request." }, 401);
  try {
    const client = betaStorageClient(); const { data, error } = await client.auth.getUser(token);
    if (error || !data.user?.email_confirmed_at || data.user.is_anonymous) return betaJson({ error: "Verified account required." }, 401);
    const input = z.object({kind:z.enum(["access_export","account_deletion"]),requestKey:z.string().uuid()}).strict().safeParse(await boundedJson(request));
    if (!input.success) return betaJson({ error: "Choose a valid request type." }, 400);
    const rate = await client.rpc("beta_onboarding_rate",{p_user:data.user.id,p_kind:"settings"});
    if(rate.error)return betaJson({error:rate.error.message.includes("rate limit")?"Too many requests. Please retry later.":"Request verification is unavailable."},rate.error.message.includes("rate limit")?429:503);
    const saved = await client.from("beta_privacy_requests").upsert({user_id:data.user.id,request_key:input.data.requestKey,kind:input.data.kind},{onConflict:"user_id,request_key",ignoreDuplicates:true});
    if (saved.error) return betaJson({ error: "We could not record your request. Retry with the same request or contact support." }, 503);
    return betaJson({message:"Your verified request is recorded for private review. This does not delete content, cancel billing or withdraw beta participation. Support will verify the scope before any approved deletion."});
  } catch { return betaJson({ error: "Your request could not be recorded. No account data was changed." }, 503); }
}
