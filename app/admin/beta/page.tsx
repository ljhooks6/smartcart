import { notFound } from "next/navigation";
import { betaPagesEnabled } from "@/lib/beta-domain";
import { BetaAdmin } from "@/components/beta-admin";
export const dynamic = "force-dynamic";
export const metadata = { title: "Beta administration | MealCaddie", robots: { index: false, follow: false } };
export default function BetaAdminPage() { if (!betaPagesEnabled()) notFound(); return <BetaAdmin />; }
