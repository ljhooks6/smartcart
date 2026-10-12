import { PrivacyAdmin } from "@/components/privacy-admin";
import { betaPagesEnabled } from "@/lib/beta-domain";
import { notFound } from "next/navigation";
export const metadata={title:"Private privacy requests | MealCaddie",robots:{index:false,follow:false}};
export default function Page(){if(!betaPagesEnabled())notFound();return <PrivacyAdmin/>;}
