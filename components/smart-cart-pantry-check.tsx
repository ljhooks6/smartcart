"use client";

import { useId, useState } from "react";
import type { GroceryListItem } from "../lib/grocery-list";
import type { PantryAnswer } from "../lib/shopping-progress";

export function SmartCartPantryCheck({ items, onAnswer }: {
  items: GroceryListItem[];
  onAnswer: (item: GroceryListItem, answer: PantryAnswer) => void;
}) {
  const id = useId();
  const [mode, setMode] = useState<"quick" | "all" | "skip">("quick");
  const [message, setMessage] = useState("");
  if (!items.length && !message) return null;
  const prioritized = items.filter(item => item.pantry_answer !== "later").sort((a, b) =>
    Number(b.pantry_question === "low") - Number(a.pantry_question === "low")
    || (b.meal_names?.length ?? 0) - (a.meal_names?.length ?? 0)
    || a.name.localeCompare(b.name));
  const questions = mode === "all" ? items : mode === "quick" ? prioritized.slice(0, 3) : [];
  const questionKeys = new Set(questions.map(item => item.item_key));
  const button = "min-h-11 rounded-lg border border-pine/30 px-3 py-2 text-left text-sm font-semibold text-pine";

  return <section aria-labelledby={id} className="min-w-0 space-y-3 rounded-2xl border border-pine/20 bg-cream p-4">
    <h3 id={id} tabIndex={-1} className="font-display text-xl text-pine">Check Pantry</h3>
    <p role="status" className="text-sm">{message}</p>
    {items.length ? <>
      <p className="text-sm">Quick pantry check · Optional. These ingredients stay separate from purchases until you decide.</p>
      {questions.map(item => <fieldset key={item.item_key} className="min-w-0 space-y-2 rounded-xl bg-white p-3">
        <legend className="break-words px-1 text-sm font-semibold text-pine">{item.name}</legend>
        <p className="break-words text-sm">{item.pantry_question === "low"
          ? `You’re running low on ${item.name}. Your selected meals use ${item.needed_amount}. You may need more.`
          : item.review_required
            ? `Check the ingredient or quantity for ${item.name} in your recipes.`
            : `Your selected meals need ${item.needed_amount} of ${item.name}. Do you have enough?`}</p>
        {item.pantry_question === "incompatible" && item.pantry_note ? <p className="text-sm">{item.pantry_note}</p> : null}
        <div className="flex flex-wrap gap-2">
          {([
            ["enough", "Yes, I have enough"], ["buy", "No, add it to my shopping list"], ["later", "I’m not sure — check later"],
          ] as const).filter(([answer]) => answer !== "enough" || !item.review_required).map(([answer, label]) =>
            <button type="button" key={answer} className={button} onClick={event => {
              event.currentTarget.closest("section")?.querySelector("h3")?.focus({ preventScroll: true });
              setMessage(`${item.name}: ${answer === "enough" ? "covered" : answer === "buy" ? "added to purchases" : "left to check later"}.`);
              onAnswer(item, answer);
              if (answer === "later") setMode("quick");
            }}>{label}</button>)}
        </div>
      </fieldset>)}
      <ul className="list-disc space-y-1 pl-5 text-sm">
        {items.filter(item => !questionKeys.has(item.item_key)).map(item =>
          <li key={item.item_key} className="break-words">{item.name} · {item.needed_amount}</li>)}
      </ul>
      <div className="flex flex-wrap gap-2">
        {items.length > questions.length ? <button className={button} type="button" onClick={() => setMode("all")}>Review more</button> : null}
        {questions.length ? <button className={button} type="button" onClick={event => {
          event.currentTarget.closest("section")?.querySelector("h3")?.focus({ preventScroll: true });
          setMode("skip");
        }}>Skip for now</button> : null}
      </div>
    </> : null}
  </section>;
}
