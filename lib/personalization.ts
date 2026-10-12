type Person = { user_metadata?: Record<string, unknown>; app_metadata?: Record<string, unknown>; created_at?: string };
export function preferredName(value: unknown): string {
  if (typeof value !== "string") return "";
  const name = value.normalize("NFC").trim().replace(/\s+/gu, " ");
  return [...name].length <= 60 && !/[\p{Cc}\p{Cf}<>]/u.test(name) ? name : "";
}
export function googleName(user: Person) {
  const providers = user.app_metadata?.providers;
  if (user.app_metadata?.provider !== "google" && !(Array.isArray(providers) && providers.includes("google"))) return "";
  return preferredName(user.user_metadata?.given_name) || preferredName(user.user_metadata?.full_name) || preferredName(user.user_metadata?.name);
}
export function personalProfile(user: Person, now = Date.now()) {
  const name = preferredName(user.user_metadata?.preferred_name);
  const complete = user.user_metadata?.mealcaddie_setup_complete === true;
  const created = Date.parse(user.created_at ?? "");
  return { name, prefill: name || googleName(user), complete, newAccount: !complete && Number.isFinite(created) && now >= created && now - created < 3600000 };
}
export function welcomeGreeting(name: unknown, firstVisit = false) {
  const chosen = preferredName(name);
  return `${firstVisit ? "Welcome to MealCaddie" : "Welcome back"}${chosen ? `, ${chosen}` : ""}!`;
}
export function firstWelcome(storage: Pick<Storage, "getItem" | "removeItem">, owner: string, seen: Map<string, boolean>) {
  if (seen.has(owner)) return seen.get(owner)!;
  let first = false;
  try { const key = `mealcaddie-first-welcome:${owner}`; first = storage.getItem(key) === "yes"; storage.removeItem(key); } catch { /* Storage is optional for a greeting. */ }
  seen.set(owner, first); return first;
}
