import { timingSafeEqual } from "node:crypto";
import { betaJson, betaStorageClient } from "@/lib/beta-server";
import { onboardingEnabled } from "@/lib/beta-onboarding-domain";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret ?? ""}`;
  if (!secret || secret.length < 32 || Buffer.byteLength(provided) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(provided), Buffer.from(expected))) return betaJson({ error: "Unauthorized." }, 401);
  const params = new URL(request.url).searchParams;
  if (params.has("dryRun")) {
    if (params.getAll("dryRun").length !== 1 || params.get("dryRun") !== "1") return betaJson({ error: "Use dryRun=1 for an authorization-only check." }, 400);
    return betaJson({ authorized: true, cleanupPerformed: false });
  }
  try {
    if (onboardingEnabled()) {
      const onboarding = await betaStorageClient().rpc("beta_onboarding_cleanup");
      if (onboarding.error) return betaJson({ error: "Onboarding retention cleanup failed." }, 503);
    }
    const result = await betaStorageClient().rpc("beta_cleanup", { p_actor: null });
    if (result.error) return betaJson({ error: "Retention cleanup failed." }, 503);
    return betaJson({ result: result.data });
  } catch { return betaJson({ error: "Retention cleanup failed." }, 503); }
}
