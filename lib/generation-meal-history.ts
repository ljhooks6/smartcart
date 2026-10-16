import { getSupabaseAdminClient } from "./supabase-admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import { mealTitles, type MealVarietyContext } from "./meal-variety";

type HistoryOwner = { id: string; owner_key: string; user_id: string | null; created_at: string };
export async function recentGenerationMeals(job: HistoryOwner, client?: SupabaseClient, includeRejected=false): Promise<MealVarietyContext> {
  // Only the claimed, server-created job supplies identity. Never query a quota
  // key: guests sharing a network must not share meal history.
  if (!job.owner_key || (job.user_id ? job.owner_key !== `user:${job.user_id}` : !/^guest:[a-f0-9]{64}$/.test(job.owner_key))) return {};
  const before = Date.parse(job.created_at);
  if (!Number.isFinite(before)) return {};
  const after = new Date(before - 14 * 86400000).toISOString();
  try {
    let query = (client??getSupabaseAdminClient() as SupabaseClient).from("smartcart_generation_jobs")
      .select("id,owner_key,user_id,status,created_at,dinners:result->meals"+(includeRejected?",rejected:input->recentRejectedMeals":""))
      .eq("owner_key", job.owner_key).eq("status", "completed")
      .gte("created_at", after).lt("created_at", job.created_at).neq("id", job.id);
    query = job.user_id ? query.eq("user_id", job.user_id) : query.is("user_id", null);
    const { data, error } = await query.order("created_at", { ascending: false }).limit(3).abortSignal(AbortSignal.timeout(2000));
    if (error) throw error;
    const rows = (data || []) as unknown as Array<{ id: string; owner_key: string; user_id: string | null; status: string; created_at: string; dinners: unknown; rejected?:unknown }>;
    const owned=rows.filter(row => row.owner_key === job.owner_key && row.user_id === job.user_id && row.id !== job.id && row.status === "completed" && Date.parse(row.created_at) >= Date.parse(after) && Date.parse(row.created_at) < before).slice(0,3);
    return { recentPlans:owned.map(row => mealTitles(row.dinners)).filter(titles => titles.length > 0),
      ...(includeRejected?{recentRejectedMeals:[...new Set(owned.flatMap(row=>Array.isArray(row.rejected)?row.rejected.filter((v):v is string=>typeof v==="string"&&v.length<=180):[]))].slice(0,12)}:{}) };
  } catch {
    // Variety is optional context, not a reason to break planning. Do not log
    // titles, dietary inputs, raw database errors or another user's identifiers.
    console.warn("Recent meal variety context unavailable; using current request context.");
    return {};
  }
}
