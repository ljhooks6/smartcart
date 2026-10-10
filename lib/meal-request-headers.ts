import { supabase } from "./supabase";

export async function getMealRequestHeaders(userId?: string): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (!userId) return headers;
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token || data.session.user.id !== userId) throw new Error("Please sign in again before planning meals.");
  headers.Authorization = `Bearer ${data.session.access_token}`;
  return headers;
}
