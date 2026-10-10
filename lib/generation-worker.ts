import { claimGenerationJob, finishGenerationJob } from "./generation-jobs";
import { generateMealPlan } from "./meal-generation";
import { getSupabaseAdminClient } from "./supabase-admin";

export class GenerationBusyError extends Error {
  constructor(public afterSeconds = 30) { super("Planning capacity is busy."); }
}
export async function processGenerationJob(id: string) {
  const claim = await claimGenerationJob(id);
  if (claim.code === "busy") throw new GenerationBusyError(claim.retryAfter || 30);
  if (!claim.job) return;
  const job = claim.job;
  const usage: unknown[] = [];
  let plan: "free" | "plus" = "free";
  try {
    if (job.user_id) {
      const { data, error } = await getSupabaseAdminClient().from("smartcart_profiles").select("plan").eq("id", job.user_id).maybeSingle();
      if (error) throw new Error("We couldn't verify your membership. Please try again.");
      plan = (data as { plan?: string } | null)?.plan === "plus" ? "plus" : "free";
    }
    const response = await generateMealPlan(job.input, plan, details => usage.push(details));
    const result = await response.json();
    if (response.ok) {
      await finishGenerationJob(job, "completed", result, null, usage);
      console.info("Meal planning completed", { jobId: job.id, plan, providerCalls: usage.length });
      return;
    }
    // Only retry definite temporary rejections before any successful provider response.
    if (result.retryable && usage.length === 0 && job.attempts < 3) {
      const retrySeconds = Math.max(30, Number(response.headers.get("Retry-After")) || 30);
      await finishGenerationJob(job, "queued", null, "MealCaddie is busy. Your plan is waiting for another attempt.", usage, retrySeconds);
      throw new GenerationBusyError(retrySeconds);
    }
    await finishGenerationJob(job, "failed", null, result.error || "We couldn't finish this plan. Please try a new plan.", usage);
  } catch (error) {
    if (error instanceof GenerationBusyError) throw error;
    await finishGenerationJob(job, "failed", null, "We couldn't finish this plan. Please try a new plan.", usage);
    // If saving fails too, throw so delivery retries; the running lease prevents another AI call.
  }
}
