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
  if (!emailAuthOrigins.has(url.origin) || url.username || url.password ||
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
