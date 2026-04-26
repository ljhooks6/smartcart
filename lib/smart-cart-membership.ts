import { supabase } from "./supabase";

export type SmartCartPlan = "free" | "plus";

export type SmartCartProfile = {
  id: string;
  email: string;
  plan: SmartCartPlan;
  beta_status: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type SmartCartProfileRow = {
  id?: string | null;
  email?: string | null;
  plan?: SmartCartPlan | null;
  beta_status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function isMissingProfileTableError(error: { code?: string; message?: string } | null) {
  if (!error) {
    return false;
  }

  return (
    error.code === "42P01" ||
    error.message?.toLowerCase().includes("smartcart_profiles") ||
    error.message?.toLowerCase().includes("relation") ||
    false
  );
}

function normalizeProfile(row: SmartCartProfileRow | null, fallbackEmail = ""): SmartCartProfile | null {
  if (!row?.id) {
    return null;
  }

  return {
    beta_status: row.beta_status ?? null,
    created_at: row.created_at ?? null,
    email: row.email ?? fallbackEmail,
    id: row.id,
    plan: row.plan === "plus" ? "plus" : "free",
    updated_at: row.updated_at ?? null,
  };
}

export async function fetchSmartCartProfile(userId: string) {
  if (!userId) {
    return null;
  }

  const { data, error } = await supabase
    .from("smartcart_profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    if (isMissingProfileTableError(error)) {
      console.warn("smartcart_profiles table is not set up yet.");
      return null;
    }

    throw error;
  }

  return normalizeProfile((data ?? null) as SmartCartProfileRow | null);
}

export async function ensureSmartCartProfile(userId: string, email: string) {
  if (!userId) {
    return null;
  }

  const normalizedEmail = typeof email === "string" ? email.trim() : "";

  const { data, error } = await supabase
    .from("smartcart_profiles")
    .upsert(
      {
        email: normalizedEmail,
        id: userId,
        plan: "free" as SmartCartPlan,
      },
      { onConflict: "id" },
    )
    .select("*")
    .single();

  if (error) {
    if (isMissingProfileTableError(error)) {
      console.warn("smartcart_profiles table is not set up yet.");
      return null;
    }

    throw error;
  }

  return normalizeProfile((data ?? null) as SmartCartProfileRow | null, normalizedEmail);
}

