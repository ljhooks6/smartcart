import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

// Standard Webhooks/Svix raw-body HMAC verification; no new subscription or SDK.
// Reference: https://docs.svix.com/receiving/verifying-payloads/how-manual
export function verifyDeliverySignature(body: string, headers: Headers, secret: string, nowSeconds = Date.now() / 1000) {
  const id = headers.get("svix-id") ?? ""; const timestamp = headers.get("svix-timestamp") ?? "";
  const signatures = headers.get("svix-signature") ?? "";
  if (!/^whsec_[A-Za-z0-9+/=]+$/.test(secret) || !id || id.length > 200 || !/^\d+$/.test(timestamp) || Math.abs(nowSeconds - Number(timestamp)) > 300 || signatures.length > 2000) return false;
  const key = Buffer.from(secret.slice(6), "base64"); if (key.length < 16) return false;
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest();
  return signatures.split(" ").some(part => {
    if (!part.startsWith("v1,")) return false;
    const candidate = Buffer.from(part.slice(3), "base64");
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  });
}
export const deliveryEventSchema = z.object({ type: z.string().max(80), data: z.object({ email_id: z.string().uuid() }) });
export const deliveryStatus: Record<string, string> = { "email.sent": "accepted", "email.delivered": "delivered", "email.bounced": "bounced", "email.complained": "complained", "email.failed": "failed" };
