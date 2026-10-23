import { AuthSignIn } from "@/components/auth-sign-in";
import { accountExperienceEnabled } from "@/lib/account-experience";
export const metadata = { title: "Sign in | MealCaddie", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default function SignIn() { return <AuthSignIn enabled={accountExperienceEnabled()} />; }
