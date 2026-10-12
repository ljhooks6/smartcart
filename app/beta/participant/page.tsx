import { BetaParticipant } from "@/components/beta-participant";
import { onboardingEnabled } from "@/lib/beta-onboarding-domain";
import { notFound } from "next/navigation";
export const dynamic = "force-dynamic";
export const metadata = { title: "Beta feedback | MealCaddie", robots: { index: false, follow: false } };
export default function Page() { if (process.env.VERCEL_ENV === "production" && !onboardingEnabled()) notFound(); return <BetaParticipant enabled={onboardingEnabled()} />; }
