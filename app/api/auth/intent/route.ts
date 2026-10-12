import { betaJson, boundedJson, requireBetaAdmin } from "@/lib/beta-server";
import { authDestination } from "@/lib/auth-destination";
import { sealIntent, openIntent, intentCookie, intentHeader } from "@/lib/auth-intent";
import { personAccess } from "@/lib/personalization-server";
import { pilotIdentityAllowed } from "@/lib/beta-pilot";
import { onboardingEnabled } from "@/lib/beta-onboarding-domain";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin || request.headers.get("sec-fetch-site") === "cross-site") return betaJson({ error: "Start sign-in on MealCaddie." }, 403);
  try {
    const body = await boundedJson(request) as { destination?: unknown; invitation?: unknown; preserveInvitation?: unknown };
    if (!body || Object.keys(body).some(k => !["destination", "invitation", "preserveInvitation"].includes(k)) || (body.preserveInvitation !== undefined && body.preserveInvitation !== true) || typeof body.destination !== "string" || authDestination(body.destination) !== body.destination || (body.invitation !== undefined && (body.destination !== "/beta/accept" || typeof body.invitation !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(body.invitation)))) return betaJson({ error: "Choose a valid MealCaddie destination." }, 400);
    const existing = (request.headers.get("cookie") ?? "").split(";").map(x => x.trim()).find(x => x.startsWith(`${intentCookie}=`))?.slice(intentCookie.length + 1);
    const prior = body.preserveInvitation && existing ? openIntent(existing, process.env.BETA_RATE_LIMIT_SECRET ?? "") : null;
    const invitation = (body.invitation as string | undefined) ?? (prior?.destination === body.destination ? prior.invitation : undefined);
    const response = betaJson({ saved: true });
    response.headers.set("Set-Cookie", intentHeader(sealIntent(body.destination, invitation, process.env.BETA_RATE_LIMIT_SECRET ?? ""), request));
    return response;
  } catch { return betaJson({ error: "We couldn't preserve your destination. Please retry before signing in." }, 503); }
}
export async function GET(request: Request) {
  const access = await personAccess(request); if ("response" in access) return access.response;
  const cookie = (request.headers.get("cookie") ?? "").split(";").map(x => x.trim()).find(x => x.startsWith(`${intentCookie}=`))?.slice(intentCookie.length + 1);
  const result = cookie ? openIntent(cookie, process.env.BETA_RATE_LIMIT_SECRET ?? "") : null;
  if (result?.destination.startsWith("/beta/") && !onboardingEnabled()) return betaJson({ destination: "/", unavailable: true });
  if (result?.destination === "/beta/pilot-apply" && !pilotIdentityAllowed(access.user.id, access.user.email)) return betaJson({ destination: "/", unavailable: true });
  if (result?.destination.startsWith("/admin/") && "response" in await requireBetaAdmin(request)) return betaJson({ destination: "/", unavailable: true });
  return betaJson(result ?? { destination: null });
}
export async function DELETE(request: Request) {
  const access = await personAccess(request); if ("response" in access) return access.response;
  const response = betaJson({ cleared: true }); response.headers.set("Set-Cookie", intentHeader("", request, true)); return response;
}
