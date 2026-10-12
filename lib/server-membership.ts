import { getSupabaseAdminClient } from "./supabase-admin";
import { resolveRequestMembership } from "./request-membership";
import { loadFeaturePlan } from "./beta-feature-membership";

export function getRequestMembership(request: Request) {
  return resolveRequestMembership(request.headers, {
    async verifyUser(token) {
      const { data, error } = await getSupabaseAdminClient().auth.getUser(token);
      if (error) {
        if (error.status && error.status >= 400 && error.status < 500) return null;
        throw error;
      }
      return data.user?.is_anonymous ? null : data.user?.id ?? null;
    },
    loadPlan: loadFeaturePlan,
  });
}
