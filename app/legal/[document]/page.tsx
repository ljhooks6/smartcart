import Link from "next/link";
import { notFound } from "next/navigation";
import {legalDocuments,legalVersion} from "@/lib/legal-documents";
export const metadata={title:"Legal review | MealCaddie",robots:{index:false,follow:false}};
export default async function LegalPage({params}:{params:Promise<{document:string}>}) {
 if(process.env.VERCEL_ENV==="production")notFound();
 const {document}=await params;const doc=legalDocuments[document];if(!doc)notFound();
 return <main className="min-h-screen bg-cream p-5 text-ink"><article className="mx-auto max-w-3xl space-y-5"><Link className="text-pine underline" href="/legal/review">All legal drafts</Link><h1 className="text-3xl font-bold text-pine">{doc.title}</h1><p role="note" className="rounded-xl border border-berry bg-white p-4">Draft {legalVersion}. Requires qualified counsel review before production use. Not an active agreement.</p>{doc.paragraphs.map((p,i)=><p key={i}>{p}</p>)}</article></main>;
}
