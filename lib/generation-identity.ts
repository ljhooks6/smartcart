import { createHmac, randomUUID } from "node:crypto";
import { getRequestMembership } from "./server-membership";

const cookieName = "mealcaddie_guest";
function hash(value: string) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Generation storage is unavailable.");
  return createHmac("sha256", secret).update(value).digest("hex");
}
export async function generationIdentity(request: Request) {
  const membership = await getRequestMembership(request);
  if ("status" in membership) return membership;
  if (membership.userId) return {
    owner: `user:${membership.userId}`, quota: `user:${membership.userId}`, userId: membership.userId,
    plan: membership.plan, cookie: null,
  };
  const stored = request.headers.get("cookie")?.split(";").map(value => value.trim()).find(value => value.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  const guest = stored && /^[0-9a-f-]{36}$/i.test(stored) ? stored : randomUUID();
  // Vercel overwrites this header; never trust client-provided body/IP fields.
  const ip = process.env.VERCEL ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() : "local-development";
  if (process.env.VERCEL && !ip) return { status: 503 as const, error: "We couldn't start guest planning. Please sign in or try again." };
  return { owner: `guest:${hash(guest)}`, quota: `network:${hash(ip || "local-development")}`, userId: null,
    plan: "guest" as const,
    cookie: `${cookieName}=${guest}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`,
  };
}
