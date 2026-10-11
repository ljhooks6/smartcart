import { z } from "zod";
import { betaJson, boundedJson, requireBetaAdmin } from "@/lib/beta-server";
import { emailKinds, emailTestRecipient, prepareBetaEmail } from "@/lib/beta-email";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const access = await requireBetaAdmin(request);
  if ("response" in access) return access.response;
  if (process.env.VERCEL_ENV !== "preview") return betaJson({ error: "Email previews are available only in the protected Preview environment." }, 403);
  try {
    const parsed = z.object({ kind: z.enum(emailKinds) }).strict().safeParse(await boundedJson(request));
    if (!parsed.success) return betaJson({ error: "Invalid email preview." }, 400);
    return betaJson({ deliveryEnabled: false, email: prepareBetaEmail(parsed.data.kind, emailTestRecipient()) });
  } catch { return betaJson({ error: "Email preview configuration is unavailable." }, 503); }
}
