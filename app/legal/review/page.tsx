import {AgreementReview} from "@/components/agreement-review"; import {notFound} from "next/navigation"; import {legalGateEnabled} from "@/lib/legal-agreements"; export default function Page(){if(process.env.VERCEL_ENV==="production")notFound();return <AgreementReview enabled={legalGateEnabled()}/>;}
export const metadata={title:"Agreement review | MealCaddie",robots:{index:false,follow:false}};
