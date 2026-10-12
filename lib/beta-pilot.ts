// Server-only pilot controls. Neither public applications nor profile tiers are changed.
type Env = Record<string, string | undefined>;
export function pilotMode(env: Env = process.env) { return env.BETA_PILOT_MODE === "true"; }
export function pilotIntakeEnabled(env: Env = process.env) {
  return pilotMode(env) && env.BETA_PILOT_INTAKE_ENABLED === "true" &&
    env.VERCEL_ENV !== "production" && (!env.VERCEL || env.VERCEL_ENV === "preview");
}
function identities(env: Env): Record<string, string | null> {
  try {
    const value = JSON.parse(env.BETA_PILOT_IDENTITIES ?? "{}");
    if (!value || Array.isArray(value) || typeof value !== "object" || Object.keys(value).length !== 2) return {};
    if (!Object.entries(value).every(([email, id]) => email === email.trim().toLowerCase() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (id === null || (typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id))))) return {};
    return value;
  } catch { return {}; }
}
export function pilotIdentityAllowed(id: string, email: string | undefined, env: Env = process.env) {
  if (!pilotMode(env)) return true;
  const expected = identities(env)[email?.trim().toLowerCase() ?? ""];
  return typeof expected === "string" && expected === id;
}
function list(key: string, env: Env): string[] {
  try { const value = JSON.parse(env[key] ?? "[]"); return Array.isArray(value) && value.length <= 2 && value.every(v => typeof v === "string") ? value : []; } catch { return []; }
}
export function pilotInvitationApproved(id: string, email: string, env: Env = process.env) {
  if (!pilotMode(env)) return true;
  const allowed = identities(env);
  return Object.hasOwn(allowed, email) && list("BETA_PILOT_CONSENT_EMAILS", env).includes(email) && list("BETA_PILOT_INVITATION_IDS", env).includes(id);
}
