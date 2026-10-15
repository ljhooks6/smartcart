"use client";
import Link from "next/link";
import {assessDiet,readDiet} from "@/lib/dietary-safety";
export function DietarySafetySummary({diet,value,compact=false}:{diet:string;value:unknown;compact?:boolean}) {
 const review=assessDiet(value,diet);
 if(compact) return <aside aria-label="Dietary safety" className="my-3 text-sm leading-6"><p>{review.conflicts.length ? "Detected ingredient conflict: "+review.conflicts.slice(0,3).join("; ") : "AI meal ideas need label, ingredient and cross-contact checks. Allergy-dependent generation remains restricted."} <Link className="underline text-pine" href="/legal/safety">Dietary safety notice</Link></p></aside>;
 const parsed=readDiet(diet);
 const ordinary=!parsed.malformed && !parsed.settings.allergies.length && !parsed.settings.customAllergies && !parsed.settings.intolerances && !parsed.settings.medical && /^(?:|none|no preference|no specific diet provided|vegetarian|vegan|halal|kosher|low sodium|pescatarian)$/i.test(parsed.legacy.trim());
 if(review.status==="not-assessed" || (ordinary && !review.conflicts.length))return <p className="my-3 text-sm text-ink">AI recipes need independent ingredient and preparation checks. <Link className="underline" href="/legal/safety">Dietary safety notice</Link></p>;
 return <aside aria-label="Dietary safety review" className="my-3 w-full max-w-6xl rounded-xl border border-pine/30 bg-cream p-4 text-sm"><h2 className="font-semibold">{review.status==="conflict"?"Known allergy conflict in current or saved content — do not treat it as suitable":review.status==="uncertain"?"Ingredient suitability is uncertain":"No known conflict detected in the supplied text"}</h2><p>{review.notice}</p>{review.conflicts.length?<p>Review or replace affected meals before use. {review.conflicts.slice(0,5).join("; ")}</p>:null}{review.uncertainty.map(t=><p key={t}>{t}</p>)}<Link className="inline-block min-h-11 py-3 text-pine underline" href="/legal/safety">Read the dietary safety notice</Link></aside>;
}
