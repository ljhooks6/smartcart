import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const fallbackSupabaseUrl = "https://placeholder-project.supabase.co";
const fallbackSupabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIn0.placeholder";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Missing Supabase environment variables");
}

// Capture only a navigation hint before the SDK consumes the callback fragment.
// No tokens are retained here; every password update still requires a verified caller.
export const initialRecoveryCallback = typeof window !== "undefined" && new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery";
// Retain only an error-presence bit before the SDK consumes a callback. Never
// echo provider descriptions, addresses, tokens or callback URLs into the UI.
export const initialAuthFailure = typeof window !== "undefined" && [window.location.search, window.location.hash.slice(1)].some(value => {
  const params = new URLSearchParams(value);
  return params.has("error") || params.has("error_code");
});
export const supabase = createClient(
  supabaseUrl || fallbackSupabaseUrl,
  supabaseAnonKey || fallbackSupabaseAnonKey,
);
