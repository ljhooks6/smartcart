import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { betaPagesEnabled, betaSubmissionsEnabled } from "@/lib/beta-domain";
import { BetaApplication } from "@/components/beta-application";
import { FoundingTestersLanding } from "@/components/founding-testers-landing";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "MealCaddie Founding Testers | Apply for the beta", description: "Help shape easier dinner planning, pantry organization and grocery shopping. Apply for MealCaddie’s invitation-only beta. No payment information required.", robots: { index: false, follow: false } };
export default function BetaPage() {
  if (!betaPagesEnabled()) notFound();
  const accepting = betaSubmissionsEnabled();
  return <FoundingTestersLanding accepting={accepting}><BetaApplication embedded accepting={accepting} siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""} /></FoundingTestersLanding>;
}
