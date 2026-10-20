import { candidateOutputResponse } from "@/lib/food-safety-response";
import { foodSafetyResponse } from "@/lib/food-safety-response";
import { requireProductAccess } from "@/lib/product-access";
import { requireAgreements } from "@/lib/legal-agreements";
import { NextResponse } from "next/server";
import { z } from "zod";
import { generationIdentity } from "@/lib/generation-identity";
import { generationRequestSchema } from "@/lib/generation-request";
import { publicGenerationJob, readGenerationJob, reserveGenerationJob } from "@/lib/generation-jobs";
import { dispatchGenerationJob } from "@/lib/generation-dispatch";
import { optionalMealPauseResponse } from "@/lib/meal-availability";

export const maxDuration = 30;
export const dynamic = "force-dynamic";
function reply(body: unknown, status: number, cookie?: string | null, retryAfter?: number) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store",
    ...(cookie ? { "Set-Cookie": cookie } : {}), ...(retryAfter ? { "Retry-After": String(retryAfter) } : {}) } });
}
export async function POST(request: Request) {
  const productResponse = await requireProductAccess(request); if (productResponse) return productResponse;
  const legalResponse = await requireAgreements(request); if (legalResponse) return legalResponse;
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return reply({ error: "Please start planning from MealCaddie." }, 403);
  let input;
  try {
    const text = await request.text();
    if (text.length > 32000) return reply({ error: "Your planning preferences are too long." }, 400);
    const raw=JSON.parse(text);const paused=optionalMealPauseResponse(raw);if(paused)return paused;
    input = generationRequestSchema.safeParse(raw);
  } catch { return reply({ error: "Request body must be valid JSON." }, 400); }
  if (!input.success) return reply({ error: "Check your budget, household size, pantry, and planning preferences." }, 400);
  const safetyResponse = foodSafetyResponse(input.data, true); if (safetyResponse) return safetyResponse;
  const key = z.string().uuid().safeParse(request.headers.get("Idempotency-Key"));
  if (!key.success) return reply({ error: "Please refresh MealCaddie before generating a plan." }, 400);
  try {
    const identity = await generationIdentity(request);
    if ("status" in identity) return reply({ error: identity.error }, identity.status);
    const reservation = await reserveGenerationJob(identity, key.data, input.data);
    if (reservation.code) {
      if (reservation.code === "conflict") return reply({ error: "This request already belongs to different planning preferences." }, 409, identity.cookie);
      if (reservation.code === "limit") return reply({ error: `You've used your ${reservation.limit} ${identity.plan === "guest" ? "daily" : "weekly"} plans. Your existing meals and recipes are still available.`, resetAt: reservation.resetAt }, 429, identity.cookie,
        Math.max(1, Math.ceil((Date.parse(reservation.resetAt || "")-Date.now())/1000)));
      return reply({ error: reservation.code === "burst" ? "Please give your recent plans a moment before generating another." : "MealCaddie is busy. Please try again shortly." }, 429, identity.cookie, reservation.retryAfter || 60);
    }
    if (!reservation.job) throw new Error("Planning is unavailable.");
    if (reservation.job.status === "queued") {
      try { await dispatchGenerationJob(reservation.job.id); }
      catch { return reply({ error: "Your request is saved. Please retry to start the same plan; it won't count twice.", job: publicGenerationJob(reservation.job) }, 503, identity.cookie, 15); }
    }
    return reply({ job: publicGenerationJob(reservation.job), reused: reservation.reused, remaining: reservation.remaining, resetAt: reservation.resetAt }, 202, identity.cookie);
  } catch { return reply({ error: "Planning is temporarily unavailable. Please try again shortly." }, 503, null, 15); }
}
export async function GET(request: Request) {
  const productResponse = await requireProductAccess(request); if (productResponse) return productResponse;
  const id = new URL(request.url).searchParams.get("id");
  if (id && !z.string().uuid().safeParse(id).success) return reply({ error: "Invalid planning request." }, 400);
  try {
    const identity = await generationIdentity(request);
    if ("status" in identity) return reply({ error: identity.error }, identity.status);
    const job = await readGenerationJob(identity.owner, id || undefined);
    if (id && !job) return reply({ error: "Planning request not found." }, 404, identity.cookie);
    if (job?.status === "queued") {
      try { await dispatchGenerationJob(job.id); } catch { /* Retry on a later poll. */ }
    }
    const safetyResponse = job ? foodSafetyResponse(job.input, true) : null; if (safetyResponse) return safetyResponse;
    const candidateFailure=job?.status === "completed" ? candidateOutputResponse(job.input,job.result) : null;if(candidateFailure)return candidateFailure;
    return reply({ job: job ? publicGenerationJob(job) : null }, 200, identity.cookie);
  } catch { return reply({ error: "We couldn't check your plan. Your saved request is safe; please try again." }, 503, null, 15); }
}
