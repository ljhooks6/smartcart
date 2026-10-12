import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { betaPagesEnabled, betaSubmissionsEnabled } from "@/lib/beta-domain";
import { BetaApplication } from "@/components/beta-application";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Help shape MealCaddie | Beta application", robots: { index: false, follow: false } };
export default function BetaPage() {
  if (!betaPagesEnabled()) notFound();
  return <BetaApplication accepting={betaSubmissionsEnabled()} siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""} />;
}
