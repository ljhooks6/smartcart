"use client";
import { useId, useState, useEffect } from "react";
import { normalizePantry, addPantryEntry, searchPantry, type PantryEntry } from "../lib/pantry";
import { ingredientKey, parseQuantity } from "../lib/ingredient-quantity";
import type { GroceryListItem } from "../lib/grocery-list";
const control = "min-h-11 w-full min-w-0 rounded-xl border border-pine/30 bg-white px-3 py-2 text-base text-ink";
function PantryRow({ entry, need, onChange, onRemove }: {
    entry: PantryEntry;
    need?: GroceryListItem;
    onChange: (value: PantryEntry) => void;
    onRemove: () => void;
}) {
    const [amount, setAmount] = useState(entry.quantity?.toString() ?? ""), [error, setError] = useState("");
    const id = useId();
    useEffect(() => { setAmount(entry.quantity?.toString() ?? ""); }, [entry.quantity]);
    const units = ["each", "g", "kg", "oz", "lb", "tsp", "tbsp", "cup", "ml", "l", "clove", "bottle", "can", "jar", "pack", "bag", "box"];
    return <article className="min-w-0 rounded-2xl border border-pine/20 bg-white p-3 text-ink"><div className="flex items-start justify-between gap-3"><h4 className="break-words font-semibold">{entry.name}</h4><button type="button" aria-label={`Remove ${entry.name} from pantry`} onClick={onRemove} className="min-h-11 shrink-0 px-2 text-sm text-berry underline">Remove</button></div>
 <p className="text-sm text-ink/70">{entry.quantity === undefined ? "Amount unknown" : `${entry.quantity} ${entry.unit || "each"} available`}</p>
 <div className="mt-2 grid grid-cols-2 gap-2"><label htmlFor={`${id}-quantity`} className="min-w-0 text-sm">Quantity (optional)<input id={`${id}-quantity`} className={control} inputMode="decimal" value={amount} placeholder="Unknown" onChange={e => setAmount(e.target.value)} onBlur={() => { const q = parseQuantity(amount); if (amount.trim() && (!q || q.unit)) {
        setError("Use zero, a positive number or a fraction, or leave blank.");
        return;
    } setError(""); onChange({ ...entry, quantity: q?.value, unit: entry.unit || "each", confirmedFor: undefined }); }}/></label><label htmlFor={`${id}-unit`} className="min-w-0 text-sm">Unit<select id={`${id}-unit`} className={control} value={entry.unit || "each"} onChange={e => onChange({ ...entry, unit: e.target.value, confirmedFor: undefined })}>{[...new Set([...units, ...(entry.unit ? [entry.unit] : [])])].map(u => <option key={u} value={u}>{u === "cup" ? "cup (US)" : u}</option>)}</select></label></div>
 <label className="mt-2 block text-sm">Stock label<select className={control} value={entry.status} onChange={e => onChange({ ...entry, status: e.target.value as PantryEntry["status"], confirmedFor: undefined })}><option value="owned">Owned</option><option value="stocked">Fully stocked (label)</option><option value="low">Running low (label)</option><option value="restock">Restock (label)</option></select></label>
 {error ? <p role="alert" className="mt-2 text-sm text-berry">{error}</p> : null}
 {need ? <><p className="mt-2 text-sm">Selected recipes use: {need.needed_amount}</p>{entry.confirmedFor === need.requirement_key ? <p className="text-sm font-semibold text-pine">Enough confirmed for the current selection</p> : entry.quantity === undefined ? <button type="button" onClick={() => onChange({ ...entry, confirmedFor: need.requirement_key })} className="min-h-11 py-2 text-sm font-semibold text-pine underline">I have enough for this week</button> : null}</> : null}
 {entry.unit && /bottle|can|jar|pack|bag|box/.test(entry.unit) ? <p className="mt-2 text-xs">Package size is unknown. A bottle or can cannot be converted to cups or grams automatically.</p> : null}
 </article>;
}
export function SmartCartPantryEditor({ entries, options, onChange, requirements = [] }: {
    entries: PantryEntry[];
    options: Record<string, readonly string[]>;
    onChange: (entries: PantryEntry[]) => void;
    requirements?: GroceryListItem[];
}) {
    const [query, setQuery] = useState(""), [message, setMessage] = useState("");
    const id = useId();
    const needle = ingredientKey(query);
    const matches = searchPantry(Object.values(options).flat(), entries, query), visible = entries.filter(e => !needle || ingredientKey(e.name).includes(needle));
    function add(name: string) { const next = addPantryEntry(entries, name); setMessage(next === entries ? `${name} is already in your pantry.` : `${name} added. Enter an amount or leave it unknown.`); onChange(next); setQuery(""); }
    return <section className="min-w-0 space-y-3 text-ink" aria-label="Ingredient search and pantry quantities"><label htmlFor={id} className="block text-sm font-semibold">Search pantry ingredients<input id={id} className={control} type="search" value={query} maxLength={200} onChange={e => setQuery(e.target.value)} placeholder="Search by name or alias"/></label>
 <p className="text-xs leading-5">Amounts are optional. Owned, stocked, low and restock are labels, not measurements. Unknown amounts stay on the list until you confirm enough for the current meals. Quantities are your current snapshot; update them after cooking.</p>
 {query.trim() ? <div className="space-y-2">{matches.slice(0, 12).map(name => <button key={ingredientKey(name)} type="button" onClick={() => add(name)} className="mr-2 min-h-11 rounded-xl border border-pine/30 bg-white px-3 py-2 text-sm">{entries.some(e => ingredientKey(e.name) === ingredientKey(name)) ? "Already added: " : "Add "}{name}</button>)}{!matches.some(n => ingredientKey(n) === needle) ? <button type="button" onClick={() => add(query.trim())} className="min-h-11 rounded-xl bg-pine px-3 py-2 text-sm text-white">Add custom ingredient: {query.trim()}</button> : null}</div> : <p className="text-sm">Search common staples or add your own ingredient.</p>}
 <p role="status" aria-live="polite" className="text-sm">{message}</p>
 <div className="grid gap-3 lg:grid-cols-2">{visible.map(entry => <PantryRow key={ingredientKey(entry.name)} entry={entry} need={requirements.find(n => n.item_key === ingredientKey(entry.name))} onChange={value => onChange(normalizePantry(entries.map(e => ingredientKey(e.name) === ingredientKey(entry.name) ? value : e)))} onRemove={() => onChange(entries.filter(e => ingredientKey(e.name) !== ingredientKey(entry.name)))}/>)}</div>
 </section>;
}
