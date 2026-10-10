import { createHash } from "node:crypto";
import { getSupabaseAdminClient } from "./supabase-admin";
import { generationLimits, type GenerationInput, type GenerationJob } from "./generation-request";

export type StoredGenerationJob = GenerationJob & { owner_key: string; user_id: string | null; plan: "guest" | "free" | "plus"; attempts: number; lease_until: string | null; usage: unknown[] };
export type JobReservation = { job?: StoredGenerationJob; code?: string; reused?: boolean; remaining?: number; resetAt?: string; retryAfter?: number; limit?: number };

export async function reserveGenerationJob(identity: { owner: string; quota: string; userId: string | null; plan: "guest" | "free" | "plus" }, requestKey: string, input: GenerationInput) {
  const limits = generationLimits(identity.plan);
  const { data, error } = await getSupabaseAdminClient().rpc("smartcart_create_generation_job", {
    p_owner: identity.owner, p_quota: identity.quota, p_user: identity.userId, p_request: requestKey,
    p_hash: createHash("sha256").update(JSON.stringify(input)).digest("hex"), p_input: input, p_plan: identity.plan,
    p_limit: limits.limit, p_seconds: limits.seconds,
  } as never);
  if (error) throw new Error("We couldn't save your planning request. Please try again.");
  return data as JobReservation;
}
export async function readGenerationJob(owner: string, id?: string) {
  const admin = getSupabaseAdminClient();
  // Interrupted work is terminal: replaying an uncertain paid request can charge twice.
  const { error: staleError } = await admin.from("smartcart_generation_jobs").update({ status: "failed", error: "Planning was interrupted. Please start a new plan.", updated_at: new Date().toISOString() } as never)
    .eq("owner_key", owner).eq("status", "running").lt("lease_until", new Date().toISOString());
  if (staleError) throw new Error("Planning status is temporarily unavailable.");
  const { error: queuedError } = await admin.from("smartcart_generation_jobs").update({ status: "failed", error: "MealCaddie is busy. Please try a new plan later.", updated_at: new Date().toISOString() } as never)
    .eq("owner_key", owner).eq("status", "queued").lt("created_at", new Date(Date.now()-1800000).toISOString());
  if (queuedError) throw new Error("Planning status is temporarily unavailable.");
  let query = admin.from("smartcart_generation_jobs").select("*").eq("owner_key", owner);
  if (id) query = query.eq("id", id);
  const { data, error } = await query.order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error("Planning status is temporarily unavailable.");
  return data as StoredGenerationJob | null;
}
export async function claimGenerationJob(id: string) {
  const { data, error } = await getSupabaseAdminClient().rpc("smartcart_claim_generation_job", { p_id: id } as never);
  if (error) throw new Error("Planning storage is temporarily unavailable.");
  return data as { code?: "busy" | "done"; retryAfter?: number; job?: StoredGenerationJob };
}
export async function finishGenerationJob(job: StoredGenerationJob, status: "completed" | "failed" | "queued", result: unknown, errorMessage: string | null, usage: unknown[], retrySeconds = 0) {
  const { error } = await getSupabaseAdminClient().rpc("smartcart_finish_generation_job", {
    p_id: job.id, p_attempt: job.attempts, p_status: status, p_result: result, p_error: errorMessage, p_usage: usage, p_retry_seconds: retrySeconds,
  } as never);
  if (error) throw new Error("We couldn't save the planning result.");
}
export function publicGenerationJob(job: StoredGenerationJob) {
  return { id: job.id, status: job.status, created_at: job.created_at, updated_at: job.updated_at,
    input: job.input, result: job.status === "completed" ? job.result : null, error: job.error };
}
