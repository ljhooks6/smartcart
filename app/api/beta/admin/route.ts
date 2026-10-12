import { betaChangeSchema, betaStatuses, betaCohorts, betaTargetsSchema } from "@/lib/beta-domain";
import { betaDatabaseError, betaJson, boundedJson, requireBetaAdmin } from "@/lib/beta-server";
import { z } from "zod";
export const dynamic = "force-dynamic";
const querySchema = z.object({ q: z.string().trim().max(100).default(""), status: z.enum(betaStatuses).optional(), cohort: z.enum(betaCohorts).optional(), source: z.enum(["direct", "facebook", "instagram", "friends", "community", "other"]).optional(), page: z.coerce.number().int().min(1).max(10000).default(1) });
async function directory(request: Request, search?: unknown) {
  const access = await requireBetaAdmin(request);
  if ("response" in access) return access.response;
  const url = new URL(request.url);
  const input = querySchema.safeParse(search ?? Object.fromEntries(url.searchParams));
  if (!input.success) return betaJson({ error: "Invalid directory filters." }, 400);
  const { q, status, cohort, source, page } = input.data;
  let query = access.client.from("beta_applications").select("*", { count: "exact" }).eq("program_slug", "public-beta");
  if (q) query = query.ilike("email", `%${q.replace(/[\\%_]/g, "\\$&")}%`);
  if (status) query = query.eq("status", status);
  if (cohort) query = query.eq("cohort", cohort);
  if (source) query = query.eq("source", source);
  const [applications, program, counters] = await Promise.all([
    query.order("created_at", { ascending: false }).order("id").range((page - 1) * 25, page * 25 - 1),
    access.client.from("beta_programs").select("free_target,plus_target,reserve_target,recruitment_closed_at,beta_ended_at").eq("slug", "public-beta").single(),
    access.client.rpc("beta_directory_counts", { p_actor: access.userId }),
  ]);
  if (applications.error || program.error || counters.error) return betaJson({ error: "Unable to load applicants. Please retry." }, 503);
  return betaJson({ applications: applications.data, total: applications.count, page, program: program.data, counters: counters.data });
}
export async function GET(request: Request) {
  if (new URL(request.url).searchParams.has("q")) return betaJson({ error: "Use private search." }, 400);
  return directory(request);
}
const mutationSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("update"), change: betaChangeSchema }).strict(),
  z.object({ action: z.literal("search"), query: querySchema }).strict(),
  z.object({ action: z.literal("targets"), targets: betaTargetsSchema }).strict(),
  z.object({ action: z.literal("draft"), id: z.string().uuid() }).strict(),
  z.object({ action: z.literal("cleanup") }).strict(),
  z.object({ action: z.literal("revoke_marketing"), id: z.string().uuid() }).strict(),
  z.object({ action: z.literal("close_recruitment") }).strict(),
  z.object({ action: z.literal("end_beta") }).strict(),
]);
export async function POST(request: Request) {
  const access = await requireBetaAdmin(request);
  if ("response" in access) return access.response;
  let body: unknown;
  try { body = await boundedJson(request); } catch { return betaJson({ error: "Invalid request." }, 400); }
  const parsed = mutationSchema.safeParse(body);
  if (!parsed.success) return betaJson({ error: "Invalid change." }, 400);
  const input = parsed.data;
  if (input.action === "search") return directory(request, input.query);
  const operation = input.action === "update" ? ["beta_update_application", { p_actor: access.userId, p_id: input.change.id, p_status: input.change.status, p_cohort: input.change.cohort, p_expected: input.change.expectedUpdatedAt }] :
    input.action === "targets" ? ["beta_update_targets", { p_actor: access.userId, p_free: input.targets.free, p_plus: input.targets.plus, p_reserve: input.targets.reserve }] :
    input.action === "draft" ? ["beta_draft_invitation", { p_actor: access.userId, p_id: input.id }] :
    input.action === "revoke_marketing" ? ["beta_revoke_marketing", { p_actor: access.userId, p_id: input.id }] :
    input.action === "cleanup" ? ["beta_cleanup", { p_actor: access.userId }] :
    ["beta_close_period", { p_actor: access.userId, p_kind: input.action === "end_beta" ? "beta" : "recruitment" }];
  const result = await access.client.rpc(operation[0] as string, operation[1] as Record<string, unknown>);
  if (result.error) return betaDatabaseError(result.error);
  return betaJson({ message: input.action === "draft" ? "Invitation draft saved. No email was sent." : "Change saved.", result: result.data });
}
