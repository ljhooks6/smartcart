import { agreementsForUser } from "./legal-agreements";
import { claimGenerationJob, finishGenerationJob } from "./generation-jobs";
import { generateMealPlan } from "./meal-generation";
import { loadFeaturePlan } from "./beta-feature-membership";
import { operationAllowed } from "./beta-onboarding-domain";
import { recordPlanEngagement } from "./beta-plan-engagement";

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
      plan = await loadFeaturePlan(job.user_id);
    }
    if (!operationAllowed(job.plan, plan)) {
      // Failed jobs are excluded from quota usage by the existing reservation RPC.
      await finishGenerationJob(job, "failed", null, "Your Plus access changed before planning started. Start a new plan with your current access. Your unused allowance has been released.", []);
      return;
    }
    if (!await agreementsForUser(job.user_id)) { await finishGenerationJob(job, "failed", null, "Review current agreements before starting new planning. Your unused allowance has been released.", []); return; }
    const response = await generateMealPlan(job.input, plan, details => usage.push(details));
    const result = await response.json();
    if (response.ok) {
      await finishGenerationJob(job, "completed", result, null, usage);
      if (job.user_id) await recordPlanEngagement(job.user_id, job.id);
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
