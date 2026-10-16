import { notFound } from "next/navigation";
import { allergyLabEnabled } from "@/lib/allergy-aware-planner";
import { AllergyAwareLab } from "@/components/allergy-aware-lab";
export const dynamic="force-dynamic";
export default function AllergyAwareLabPage(){
  if(!allergyLabEnabled())notFound();
  return <AllergyAwareLab />;
}
