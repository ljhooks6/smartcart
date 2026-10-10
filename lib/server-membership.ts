import { getSupabaseAdminClient } from "./supabase-admin";
import { resolveRequestMembership } from "./request-membership";

export function getRequestMembership(request: Request) {
  return resolveRequestMembership(request.headers, {
    async verifyUser(token) {
      const { data, error } = await getSupabaseAdminClient().auth.getUser(token);
      if (error) {
        if (error.status && error.status >= 400 && error.status < 500) return null;
        throw error;
      }
      return data.user?.id ?? null;
    },
    async loadPlan(userId) {
      const { data, error } = await getSupabaseAdminClient().from("smartcart_profiles").select("plan").eq("id", userId).maybeSingle();
      if (error) throw error;
      return (data as { plan?: unknown } | null)?.plan;
    },
  });
}
