import { betaJson, betaStorageClient } from "@/lib/beta-server";
import { onboardingEnabled } from "@/lib/beta-onboarding-domain";
import { deliveryEventSchema, deliveryStatus, verifyDeliverySignature } from "@/lib/beta-delivery-webhook";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  if (!onboardingEnabled() || process.env.BETA_INVITATION_WEBHOOK_APPROVED !== "true") return betaJson({ error: "Not found." }, 404);
  const secret = process.env.BETA_RESEND_WEBHOOK_SECRET;
  if (!secret) return betaJson({ error: "Monitoring unavailable." }, 503);
  if (!request.body) return betaJson({ error: "Invalid event." }, 400);
  const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let length = 0;
  while (true) { const { done, value } = await reader.read(); if (done) break; length += value.byteLength; if (length > 12000) { await reader.cancel(); return betaJson({ error: "Event too large." }, 413); } chunks.push(value); }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!verifyDeliverySignature(raw, request.headers, secret)) return betaJson({ error: "Invalid signature." }, 401);
  let event: unknown; try { event = JSON.parse(raw); } catch { return betaJson({ error: "Invalid event." }, 400); }
  const parsed = deliveryEventSchema.safeParse(event); if (!parsed.success) return betaJson({ error: "Invalid event." }, 400);
  const status = deliveryStatus[parsed.data.type]; if (!status) return betaJson({ accepted: true });
  try {
    const result = await betaStorageClient().rpc("beta_delivery_event", { p_event: request.headers.get("svix-id"), p_provider: parsed.data.data.email_id, p_status: status });
    if (result.error) return betaJson({ error: "Monitoring temporarily unavailable." }, 503);
    return betaJson({ accepted: true });
  } catch { return betaJson({ error: "Monitoring temporarily unavailable." }, 503); }
}
