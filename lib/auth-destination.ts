const destinations = new Set(["/", "/beta/pilot-apply", "/beta/accept", "/beta/participant", "/admin/beta", "/admin/beta/onboarding"]);
export function authDestination(value: unknown): string {
  return typeof value === "string" && destinations.has(value) ? value : "/";
}
export function signInPath(destination: string) { return `/auth/sign-in?next=${encodeURIComponent(authDestination(destination))}`; }
export function requestedDestination(search: string) {
  const params = new URLSearchParams(search);
  return params.getAll("next").length === 1 ? authDestination(params.get("next")) : "/";
}
