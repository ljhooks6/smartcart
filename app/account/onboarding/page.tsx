import { HouseholdOnboarding } from "@/components/household-onboarding";
import { accountExperienceEnabled } from "@/lib/account-experience";
export const dynamic = "force-dynamic";
export const metadata = { title: "Your kitchen | MealCaddie", robots: { index: false, follow: false } };
export default function Page() { return <HouseholdOnboarding enabled={accountExperienceEnabled()} />; }
