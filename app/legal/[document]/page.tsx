import Link from "next/link";
import { notFound } from "next/navigation";
import {legalDocuments,legalVersion,legalEffectiveDate,legalPublicationEnabled} from "@/lib/legal-documents";
export const metadata={title:"Legal documents | MealCaddie"};
export default async function LegalPage({params}:{params:Promise<{document:string}>}) {
 if(!legalPublicationEnabled())notFound();
 const {document}=await params;const doc=legalDocuments[document];if(!doc)notFound();
 return <main className="min-h-screen bg-cream p-5 text-ink"><article className="mx-auto max-w-3xl space-y-5"><Link className="inline-block min-h-11 py-3 text-pine underline" href="/">MealCaddie home</Link><h1 className="text-3xl font-bold text-pine">{doc.title}</h1><p>Version {legalVersion}. Effective {legalEffectiveDate}.</p>{doc.sections.map((section,i)=><section className="space-y-3" key={i}>{section.heading?<h2 className="text-xl font-semibold text-pine">{section.heading}</h2>:null}{section.paragraphs.map((p,j)=><p key={j}>{p}</p>)}</section>)}<nav aria-label="Legal documents" className="flex flex-wrap gap-4">{Object.entries(legalDocuments).map(([key,item])=><Link key={key} className="min-h-11 py-3 text-pine underline" href={"/legal/"+key}>{item.title}</Link>)}</nav></article></main>;
}
