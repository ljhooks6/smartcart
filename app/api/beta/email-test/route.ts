import { z } from "zod";
import { betaJson, boundedJson, requireBetaAdmin } from "@/lib/beta-server";
import { sendApprovedBetaTest } from "@/lib/beta-email";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const access = await requireBetaAdmin(request);
  if ("response" in access) return access.response;
  if (access.userId !== "b172ef8f-f5d7-4faa-abdf-f3250b2a6ef3") return betaJson({ error: "Owner test authorization is required." }, 403);
  if (process.env.VERCEL_ENV !== "preview" || process.env.BETA_EMAIL_TEST_SEND_APPROVED !== "true" || process.env.BETA_EMAIL_LEDGER_VERIFIED !== "true") return betaJson({ error: "Email delivery is disabled." }, 403);
  try {
    const parsed = z.object({ confirm: z.literal("send-owner-application-test") }).strict().safeParse(await boundedJson(request));
    if (!parsed.success) return betaJson({ error: "Invalid owner test request." }, 400);
    return betaJson(await sendApprovedBetaTest(access.userId));
  } catch { return betaJson({ error: "Owner test unavailable or delivery outcome needs review. Do not retry blindly." }, 503); }
}
