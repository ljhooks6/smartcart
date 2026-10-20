"use client";

import { useId, useState, useEffect, useRef } from "react";
import { normalizePantry, addPantryEntry, type PantryEntry } from "../lib/pantry";
import { ingredientKey, parseQuantity, isPackageUnit } from "../lib/ingredient-quantity";
import { PANTRY_PAGE_SIZE, pantryGroups, pantryPickerMatches, pantrySummary } from "../lib/pantry-picker";
import type { GroceryListItem } from "../lib/grocery-list";

const control = "min-h-11 w-full min-w-0 rounded-xl border border-pine/30 bg-white px-3 py-2 text-base text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine";
const button = "min-h-11 rounded-xl px-3 py-2 text-sm font-semibold text-pine focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine";

// Only mounted for the one open ingredient. Collapsed inventories have no forms.
function PantryDetails({ entry, need, onChange, onRemove, onDone }: {
  entry: PantryEntry; need?: GroceryListItem;
  onChange: (value: PantryEntry) => void; onRemove: () => void; onDone: () => void;
}) {
  const [amount, setAmount] = useState(entry.quantity?.toString() ?? "");
  const [error, setError] = useState("");
  const id = useId();
  const quantityRef = useRef<HTMLInputElement>(null);
  useEffect(() => { quantityRef.current?.focus(); }, []);
  useEffect(() => { setAmount(entry.quantity?.toString() ?? ""); }, [entry.quantity]);
  const units = ["each", "g", "kg", "oz", "lb", "tsp", "tbsp", "cup", "ml", "l", "clove", "bottle", "can", "jar", "pack", "bag", "box"];

  function commitAmount() {
    const q = parseQuantity(amount);
    if (amount.trim() && (!q || q.unit)) {
      setError("Use zero, a positive number or a fraction, or leave blank.");
      return false;
    }
    setError("");
    if (q?.value !== entry.quantity) onChange({ ...entry, quantity: q?.value, unit: entry.unit || "each", confirmedFor: undefined });
    return true;
  }

  return <div className="border-t border-pine/15 bg-cream/50 p-3" onKeyDown={event => {
    if (event.key === "Escape" && event.target instanceof HTMLInputElement) {
      event.preventDefault(); event.stopPropagation();
      if (commitAmount()) onDone();
    }
  }}>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label htmlFor={`${id}-quantity`} className="min-w-0 text-sm">Quantity (optional)
        <input ref={quantityRef} id={`${id}-quantity`} className={control} inputMode="decimal" value={amount} placeholder="Unknown"
          aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined}
          onChange={event => setAmount(event.target.value)} onBlur={commitAmount}
          onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); if (commitAmount()) onDone(); } }} />
      </label>
      <label htmlFor={`${id}-unit`} className="min-w-0 text-sm">Unit
        <select id={`${id}-unit`} className={control} value={entry.unit || "each"} onChange={event => onChange({ ...entry, unit: event.target.value, confirmedFor: undefined })}>
          {[...new Set([...units, ...(entry.unit ? [entry.unit] : [])])].map(unit => <option key={unit} value={unit}>{unit === "cup" ? "cup (US)" : unit}</option>)}
        </select>
      </label>
    </div>
    <label className="mt-3 block text-sm">Stock label
      <select className={control} value={entry.status} onChange={event => onChange({ ...entry, status: event.target.value as PantryEntry["status"], confirmedFor: undefined })}>
        <option value="owned">On hand (amount separate)</option><option value="stocked">Fully stocked (label)</option><option value="low">Running low (label)</option><option value="restock">Restock (label)</option>
      </select>
    </label>
    {error ? <p id={`${id}-error`} role="alert" className="mt-2 text-sm text-berry">{error}</p> : null}
    {need ? <div className="mt-3 text-sm"><p>Selected recipes use: {need.needed_amount}</p>
      {entry.confirmedFor === need.requirement_key ? <p className="font-semibold text-pine">Enough confirmed for the current selection</p> : entry.quantity === undefined ? <button type="button" onClick={() => onChange({ ...entry, confirmedFor: need.requirement_key })} className={`${button} mt-1 underline`}>I have enough for this week</button> : null}
    </div> : null}
    <p className="mt-2 text-xs leading-5 text-ink/75">Stock labels do not measure an amount. Choose the unit you measured; changing units does not convert the quantity.</p>
    {entry.unit && isPackageUnit(entry.unit) ? <p className="mt-1 text-xs leading-5">Package size is unknown. A bottle or can cannot be converted to cups or grams automatically.</p> : null}
    <div className="mt-3 flex flex-wrap justify-between gap-2">
      <button type="button" aria-label={`Remove ${entry.name} from pantry`} onClick={onRemove} className={`${button} text-berry underline`}>Remove</button>
      <button type="button" onClick={() => { if (commitAmount()) onDone(); }} className={`${button} border border-pine/30 bg-white`}>Done editing</button>
    </div>
  </div>;
}

function InventoryRow({ entry, expanded, searching, need, onOpen, onClose, onChange, onRemove }: {
  entry: PantryEntry; expanded: boolean; searching: boolean; need?: GroceryListItem;
  onOpen: () => void; onClose: () => void; onChange: (value: PantryEntry) => void; onRemove: () => void;
}) {
  const id = useId();
  const rowRef = useRef<HTMLButtonElement>(null);
  return <li className="min-w-0 overflow-hidden rounded-xl border border-pine/15 bg-white">
    <button ref={rowRef} type="button" aria-expanded={expanded} aria-controls={expanded ? id : undefined}
      onClick={expanded ? onClose : onOpen} className="flex min-h-14 w-full min-w-0 items-center justify-between gap-3 px-3 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-pine">
      <span className="min-w-0"><span className="block break-words text-sm font-semibold text-ink">{entry.name}</span><span className="block break-words text-xs leading-5 text-ink/75">{searching ? "Already added · " : ""}{pantrySummary(entry)}</span></span>
      <span className="shrink-0 text-xs font-semibold text-pine">{expanded ? "Close" : "Edit"}<span className="sr-only"> {entry.name}</span></span>
    </button>
    {expanded ? <div id={id}><PantryDetails entry={entry} need={need} onChange={onChange} onRemove={onRemove}
      onDone={() => { onClose(); rowRef.current?.focus(); }} /></div> : null}
  </li>;
}

export function SmartCartPantryEditor({ entries, options, onChange, requirements = [] }: {
  entries: PantryEntry[]; options: Record<string, readonly string[]>;
  onChange: (entries: PantryEntry[]) => void; requirements?: GroceryListItem[];
}) {
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const [limits, setLimits] = useState<Record<string, number>>({});
  const [searchLimit, setSearchLimit] = useState(PANTRY_PAGE_SIZE);
  const id = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLUListElement>(null);
  const groups = pantryGroups(entries, options);
  const searching = !!query.trim();
  const matches = searching ? pantryPickerMatches(entries, options, query) : [];
  const canAddCustom = searching && !!ingredientKey(query) && !matches.some(match => match.key === ingredientKey(query));

  function add(name: string) {
    const next = addPantryEntry(entries, name);
    const key = ingredientKey(name);
    const entry = next.find(item => ingredientKey(item.name) === key);
    if (!entry) { setMessage("Pantry limit reached. Remove an ingredient before adding another."); return; }
    if (next !== entries) onChange(next);
    setMessage(next === entries ? `${entry.name} is already added. Edit it below.` : `${entry.name} added. Its amount is unknown until you enter a quantity or confirm enough for this week.`);
    const group = pantryGroups(next, options).find(group => group.entries.some(item => ingredientKey(item.name) === key));
    if (group) {
      setOpenCategories(current => ({ ...current, [group.name]: true }));
      const position = group.entries.findIndex(item => ingredientKey(item.name) === key);
      setLimits(current => ({ ...current, [group.name]: Math.max(current[group.name] ?? PANTRY_PAGE_SIZE, position + 1) }));
    }
    setQuery(""); setExpanded(key);
  }
  function row(entry: PantryEntry) {
    const key = ingredientKey(entry.name);
    return <InventoryRow key={key} entry={entry} expanded={expanded === key} searching={searching} need={requirements.find(need => need.item_key === key)}
      onOpen={() => setExpanded(key)} onClose={() => setExpanded(null)}
      onChange={value => onChange(normalizePantry(entries.map(item => ingredientKey(item.name) === key ? value : item)))}
      onRemove={() => { onChange(entries.filter(item => ingredientKey(item.name) !== key)); setExpanded(null); setMessage(`${entry.name} removed from pantry.`); searchRef.current?.focus(); }} />;
  }

  return <section className="min-w-0 space-y-3 text-ink" aria-label="Pantry ingredients">
    <div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="font-display text-xl text-pine">Your pantry</h3><p className="text-xs text-ink/75">{entries.length} ingredients</p></div>
    <label htmlFor={id} className="block text-sm font-semibold">Search or add ingredients
      <input ref={searchRef} id={id} className={`${control} mt-1`} type="search" value={query} maxLength={200}
        aria-describedby={`${id}-help ${id}-status`} aria-controls={searching ? `${id}-results` : undefined}
        onChange={event => { setQuery(event.target.value); setExpanded(null); setSearchLimit(PANTRY_PAGE_SIZE); setMessage(""); }}
        onKeyDown={event => {
          if (event.key === "Enter") event.preventDefault();
          if (event.key === "ArrowDown") { event.preventDefault(); resultsRef.current?.querySelector<HTMLButtonElement>("button")?.focus(); }
          if (event.key === "Escape") { event.preventDefault(); setQuery(""); setExpanded(null); }
        }} placeholder="Search your pantry and ingredient suggestions" />
    </label>
    <p id={`${id}-help`} className="text-xs leading-5 text-ink/75">Search by name or alias, then choose Edit or Add. Amount unknown means the ingredient is on hand, not that you have enough. Update quantities after cooking.</p>
    <p id={`${id}-status`} role="status" aria-live="polite" className="text-sm">{message || (searching ? `${matches.length} matches. Already-added ingredients appear first.` : "Open a category to view or edit ingredients.")}</p>
    {searching ? <div onKeyDown={event => { if (event.key === "Escape" && event.target instanceof HTMLButtonElement) { event.preventDefault(); setQuery(""); setExpanded(null); searchRef.current?.focus(); } }}>
      <ul id={`${id}-results`} ref={resultsRef} aria-label="Ingredient search results" className="space-y-2">
        {matches.slice(0, searchLimit).map(match => match.entry ? row(match.entry) : <li key={match.key}>
          <button type="button" onClick={() => add(match.name)} className={`${button} flex w-full min-w-0 items-center justify-between gap-3 border border-pine/20 bg-white text-left`}>
            <span className="min-w-0 break-words">{match.name}</span><span className="shrink-0">Add<span className="sr-only"> {match.name} to pantry</span></span>
          </button>
        </li>)}
        {canAddCustom ? <li><button type="button" onClick={() => add(query.trim())} className={`${button} w-full break-words border border-pine/30 bg-orange-50 text-left`}>Add custom ingredient: {query.trim()}</button></li> : null}
      </ul>
      {matches.some(match => !!match.entry) ? <p className="mt-2 text-xs text-ink/75">Ingredients with Edit are already added to your pantry.</p> : null}
      {matches.length > searchLimit ? <button type="button" className={`${button} mt-2 underline`} onClick={() => setSearchLimit(current => current + PANTRY_PAGE_SIZE)}>Show more matches ({matches.length - searchLimit} remaining)</button> : null}
      {!matches.length && !canAddCustom ? <p className="text-sm">Enter an ingredient name to see suggestions.</p> : null}
      <button type="button" className={`${button} mt-2 underline`} onClick={() => { setQuery(""); setExpanded(null); searchRef.current?.focus(); }}>Clear search</button>
    </div> : <div className="space-y-2">
      {!entries.length ? <p className="rounded-xl bg-cream p-3 text-sm">Your pantry is empty. Search above to add an ingredient.</p> : null}
      {groups.map((group, index) => {
        const isOpen = !!openCategories[group.name];
        const limit = limits[group.name] ?? PANTRY_PAGE_SIZE;
        return <div key={group.name} className="min-w-0 rounded-2xl border border-pine/15 bg-white/60">
          <h4><button type="button" aria-expanded={isOpen} aria-controls={isOpen ? `${id}-category-${index}` : undefined}
            onClick={() => { setOpenCategories(current => ({ ...current, [group.name]: !isOpen })); if (isOpen && group.entries.some(entry => ingredientKey(entry.name) === expanded)) setExpanded(null); }}
            className={`${button} flex w-full min-w-0 items-center justify-between gap-3 text-left`}>
            <span className="min-w-0 break-words">{group.name} <span className="font-normal">({group.entries.length})</span></span><span aria-hidden="true" className="shrink-0">{isOpen ? "−" : "+"}</span>
          </button></h4>
          {isOpen ? <div id={`${id}-category-${index}`} className="px-2 pb-2"><ul aria-label={`${group.name} inventory`} className="space-y-1">{group.entries.slice(0, limit).map(row)}</ul>
            {group.entries.length > limit ? <button type="button" className={`${button} mt-2 underline`} onClick={() => setLimits(current => ({ ...current, [group.name]: limit + PANTRY_PAGE_SIZE }))}>Show more in {group.name} ({group.entries.length - limit} remaining)</button> : null}
          </div> : null}
        </div>;
      })}
    </div>}
  </section>;
}
