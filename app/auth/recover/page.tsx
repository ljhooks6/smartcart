import { CredentialAccess } from "@/components/credential-access";
import { accountExperienceEnabled } from "@/lib/account-experience";
export const dynamic = "force-dynamic";
export const metadata = { title: "Password recovery | MealCaddie", robots: { index: false, follow: false } };
export default function Page() { return <CredentialAccess mode="recover" enabled={accountExperienceEnabled()} />; }
