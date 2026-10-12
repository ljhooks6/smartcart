import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { pilotIntakeEnabled } from "@/lib/beta-pilot";
import { BetaPilotApplication } from "@/components/beta-pilot-application";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Controlled pilot application | MealCaddie", robots: { index: false, follow: false } };
export default function PilotApplyPage() {
  if (!pilotIntakeEnabled()) notFound();
  return <BetaPilotApplication siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""} />;
}
