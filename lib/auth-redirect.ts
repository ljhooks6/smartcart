// Exact origins already allowed by the shared Supabase project's redirect list.
// Do not accept arbitrary returnTo values or widen this to wildcard Vercel URLs.
const emailAuthOrigins = new Set([
  "https://mealcaddie.app",
  "https://preview.mealcaddie.app",
  "https://smartcart-git-feature-beta-recruitment-ljhooks6s-projects.vercel.app",
  "https://mealcaddie.vercel.app",
  "https://smartcart-lovat.vercel.app",
  "http://localhost:3000",
  "http://localhost:3001",
]);

export function emailAuthRedirect(origin: string) {
  const url = new URL(origin);
  const isolatedLab = process.env.NODE_ENV !== "production" && ["http://localhost:5501", "http://127.0.0.1:5501"].includes(url.origin);
  if ((!emailAuthOrigins.has(url.origin) && !isolatedLab) || url.username || url.password ||
      url.pathname !== "/" || url.search || url.hash) {
    throw new Error("Please sign in from the official MealCaddie website or approved preview.");
  }
  return `${url.origin}/`;
}

type EmailAuthClient = {
  signInWithOtp: (input: { email: string; options: { emailRedirectTo: string } }) =>
    Promise<{ error: { message: string } | null }>;
};

export function signInMealCaddieEmail(auth: EmailAuthClient, email: string, origin: string) {
  return auth.signInWithOtp({ email, options: { emailRedirectTo: emailAuthRedirect(origin) } });
}
type GoogleAuthClient = { signInWithOAuth: (input: { provider: "google"; options: { redirectTo: string; queryParams: { prompt: string } } }) => Promise<{ error: { message: string } | null }> };
export function signInMealCaddieGoogle(auth: GoogleAuthClient, origin: string) {
  return auth.signInWithOAuth({ provider: "google", options: { redirectTo: emailAuthRedirect(origin), queryParams: { prompt: "consent select_account" } } });
}
