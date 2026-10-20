"use client";

import { SmartCartFirstUseGuide, type FirstUseGuidanceProps } from "./smart-cart-first-use-guide";

import { useState } from "react";

import type { GroceryListItem } from "../lib/grocery-list";

type CustomItem = {
  id: string;
  name: string;
  isChecked: boolean;
};

type SmartCartGrocerySidebarProps = FirstUseGuidanceProps & {
  onEnterStoreMode: () => void;
  undoMessage: string | null;
  onUndo: () => void;
  budgetPercentage: number;
  budgetProgressBarClass: string;
  budgetStatusLabel: string;
  budgetStatusTextClass: string;
  checkedItems: Set<string>;
  copied: boolean;
  customItems: CustomItem[];
  displayGroceriesByCategory: [string, GroceryListItem[]][];
  formatCurrency: (value: number) => string;
  isGroceryOpen: boolean;
  newCustomItem: string;
  onAddCustomItem: () => void;
  onChangeCustomItem: (value: string) => void;
  onCopyShoppingList: () => void;
  onRemoveCustomItem: (id: string) => void;
  onRemoveGroceryItem: (itemKey: string) => void;
  onRemoveRestoredItem: (name: string) => void;
  onRestoreSkippedItem: (name: string) => void;
  onSetCustomItemChecked: (id: string, isChecked: boolean) => void;
  onToggleCheckedItem: (key: string) => void;
  onToggleGroceryOpen: () => void;
  parsedBudget: number;
  restoredItems: string[];
  rawBudgetPercentage: number;
  skippedGroceriesByCategory: [string, GroceryListItem[]][];
  totalCost: number;
  hasUnknownPrices?: boolean;
};

const safeTrim = (value: unknown) => (typeof value === "string" ? value.trim() : "");

function formatMealCount(item: GroceryListItem) {
  const count = item.meal_names?.length ?? 0;
  if (count <= 0) {
    return "";
  }
  return count === 1 ? "Used in 1 meal" : `Used in ${count} meals`;
}

export function SmartCartGrocerySidebar({
  showGuidance,
  onDismissGuidance,
  onEnterStoreMode,
  undoMessage,
  onUndo,
  budgetPercentage,
  budgetProgressBarClass,
  budgetStatusLabel,
  budgetStatusTextClass,
  checkedItems,
  copied,
  customItems,
  displayGroceriesByCategory,
  formatCurrency,
  isGroceryOpen,
  newCustomItem,
  onAddCustomItem,
  onChangeCustomItem,
  onCopyShoppingList,
  onRemoveCustomItem,
  onRemoveGroceryItem,
  onRemoveRestoredItem,
  onRestoreSkippedItem,
  onSetCustomItemChecked,
  onToggleCheckedItem,
  onToggleGroceryOpen,
  parsedBudget,
  rawBudgetPercentage,
  restoredItems,
  skippedGroceriesByCategory,
  totalCost,
  hasUnknownPrices=false,
}: SmartCartGrocerySidebarProps) {
  const [expandedUsageItems, setExpandedUsageItems] = useState<Set<string>>(new Set());

  function toggleUsageItem(itemKey: string) {
    setExpandedUsageItems((current) => {
      const next = new Set(current);
      if (next.has(itemKey)) {
        next.delete(itemKey);
      } else {
        next.add(itemKey);
      }
      return next;
    });
  }

  return (
    <div className="lg:col-span-4 sticky top-4">
      <aside className="rounded-[2.25rem] border border-stone-200 bg-[#faf7f1] p-6 shadow-xl">
        <button
          className="w-full rounded-lg bg-gray-100 p-4 text-left font-display text-2xl font-bold text-ink"
          onClick={onToggleGroceryOpen}
          type="button"
        >
          <span className="flex items-center justify-between gap-3">
            <span>Grocery List</span>
            <span>{isGroceryOpen ? "▲" : "▼"}</span>
          </span>
        </button>

        <SmartCartFirstUseGuide area="shop" showGuidance={showGuidance} onDismissGuidance={onDismissGuidance} />

        <button type="button" onClick={onEnterStoreMode}
          disabled={!displayGroceriesByCategory.length && !customItems.length}
          className="mt-4 min-h-12 w-full rounded-full bg-pine px-5 py-3 text-sm font-semibold text-white disabled:opacity-40">
          Enter Store Mode
        </button>
        {undoMessage ? <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-white p-3"><p role="status" className="text-sm text-ink/70">{undoMessage}</p><button type="button" onClick={onUndo} className="min-h-11 px-3 font-semibold text-pine underline underline-offset-4">Undo</button></div> : null}

        {isGroceryOpen && (
          <>
            <details className="mt-2 text-sm text-ink/60">
            <summary className="min-h-11 cursor-pointer py-2">About quantities & price estimates</summary>
            <p className="mt-2 text-sm italic leading-6 text-gray-500">
              Recipes use shows the total across all selected meals. Still need subtracts only compatible known pantry amounts, once per ingredient.
            </p>
            <p className="mb-4 mt-2 text-xs italic text-gray-500">
              Package size and store prices must be confirmed. Unknown pantry amounts remain on the list until you confirm sufficiency in Pantry Snapshot.
            </p>
            </details>

            <div className="mt-6 space-y-5">
              <section className="rounded-3xl border border-stone-200 bg-white p-4 shadow-lg">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-display text-xl text-pine">Meal Ingredients</p>
                </div>

                <div className="mt-4 space-y-5">
                  {displayGroceriesByCategory.map(([category, items]) => (
                    <section key={category}>
                      <p className="font-display text-lg text-pine">{category}</p>
                      <ul className="mt-4 space-y-3">
                        {items.map((item) => {
                          const isRestock = item.name.includes("(Includes Restock)");
                          const isUsageExpanded = expandedUsageItems.has(item.item_key);
                          const bellPepperPattern = /bell pepper/i;
                          const bellPepperColorPattern = /\b(red|green|yellow|orange)\b/i;
                          const trimmedName = safeTrim(item.name);
                          const isRestoredItem = restoredItems.includes(
                            item.item_key,
                          );
                          const displayName =
                            bellPepperPattern.test(trimmedName) &&
                            !bellPepperColorPattern.test(trimmedName)
                              ? `${trimmedName} (Any color)`
                              : trimmedName;

                          return (
                            <li
                              key={`${category}-${item.item_key}`}
                              className="flex flex-wrap items-start justify-between gap-3"
                            >
                              <div className="flex min-w-0 items-start gap-3">
                                <label className="flex min-h-11 min-w-11 items-start justify-center pt-1"><span className="sr-only">Collect {displayName}</span>
                                <input
                                  checked={checkedItems.has(item.item_key)}
                                  className="mt-0.5 h-4 w-4 rounded border-pine/30 text-pine focus:ring-pine"
                                  onChange={() => onToggleCheckedItem(item.item_key)}
                                  type="checkbox"
                                />
                                </label>
                                <span className="flex min-w-0 flex-col break-words">
                                  <span
                                    className={`flex items-center gap-2 text-sm font-medium text-ink ${
                                    checkedItems.has(item.item_key)
                                        ? "line-through opacity-60"
                                        : ""
                                    }`}
                                  >
                                    <span>{displayName}</span>
                                    {isRestock && (
                                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-700">
                                        Restock
                                      </span>
                                    )}
                                    {isRestoredItem && (
                                      <button
                                        className="text-xs font-semibold text-red-400 transition hover:text-red-500"
                                        onClick={() => onRemoveRestoredItem(item.name)}
                                        type="button"
                                      >
                                        - Remove
                                      </button>
                                    )}
                                  </span>
                                  {(item.needed_amount || item.buy_amount) && (
                                    <span className="mt-1 text-xs text-ink/55">
                                      {item.needed_amount ? `Recipes use ${item.needed_amount}` : ""}
                                      {item.shortage_amount ? ` · Still need ${item.shortage_amount}` : ""}
                                      {item.buy_amount ? " · " : ""}
                                      {item.buy_amount ? `Buy ${item.buy_amount}` : ""}
                                    </span>
                                  )}
                                  {item.pantry_note ? <span className="mt-1 text-xs leading-5 text-ink/70">{item.pantry_note}</span> : null}
                                  {item.flexibility_note ? (
                                    <span className="mt-1 text-[11px] leading-5 text-ink/45">
                                      {item.flexibility_note}
                                    </span>
                                  ) : null}
                                  {(item.meal_names?.length || item.usage_notes?.length) ? (
                                    <>
                                      <button
                                        className="mt-1 min-h-11 w-fit text-xs font-semibold text-pine transition hover:text-pine/75"
                                        aria-expanded={isUsageExpanded}
                                        onClick={() => toggleUsageItem(item.item_key)}
                                        type="button"
                                      >
                                        {isUsageExpanded
                                          ? "Hide details"
                                          : `Details${formatMealCount(item) ? ` (${formatMealCount(item)})` : ""}`}
                                      </button>
                                      {isUsageExpanded ? (
                                        <div className="mt-2 rounded-2xl bg-cream px-3 py-2 text-[11px] leading-5 text-ink/65">
                                          {item.meal_names && item.meal_names.length > 0 ? (
                                            <p className="font-semibold text-ink/70">
                                              For: {item.meal_names.join(", ")}
                                            </p>
                                          ) : null}
                                          {item.usage_notes && item.usage_notes.length > 0 ? (
                                            item.usage_notes.map((usageNote) => (
                                              <p key={`${item.item_key}-${usageNote.meal}`}>
                                                <span className="font-semibold text-ink/75">
                                                  {usageNote.meal}:
                                                </span>{" "}
                                                {usageNote.usage}
                                              </p>
                                            ))
                                          ) : null}
                                        </div>
                                      ) : null}
                                    </>
                                  ) : null}
                                  <button
                                    className="mt-1 min-h-11 w-fit text-xs font-semibold text-red-400 transition hover:text-red-500"
                                    onClick={() => onRemoveGroceryItem(item.item_key)}
                                    type="button"
                                  >
                                    Remove from list
                                  </button>
                                </span>
                              </div>
                              <span className="flex shrink-0 flex-col items-end text-right">
                                <span className="text-sm font-semibold text-pine">
                                  {item.price_status === "unavailable" ? "Estimate unavailable" : formatCurrency(item.estimated_price)}
                                </span>
                                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/35">
                                  Pkg est.
                                </span>
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  ))}
                </div>
              </section>
            </div>

            {skippedGroceriesByCategory.length > 0 && (
              <div className="mt-6 border-t border-stone-200 pt-6">
                <h4 className="mb-2 mt-6 text-sm font-bold uppercase text-gray-500">
                  Skipped (In Your Pantry)
                </h4>
                <div className="my-3 border-l-4 border-blue-500 bg-blue-50 p-3 text-xs text-blue-900">
                  <strong>Double-Check Your Kitchen!</strong> We skipped buying these items
                  because compatible measured inventory covers the requirement, or you confirmed enough for this selection. Check labels and available quantities; use <strong>+ Add Back</strong> if anything changes.
                </div>
                <div className="space-y-4">
                  {skippedGroceriesByCategory.map(([category, items]) => (
                    <section key={`skipped-${category}`}>
                      <p className="text-sm font-semibold text-gray-400">{category}</p>
                      <ul className="mt-3 space-y-3">
                        {items.map((item) => (
                          <li
                            key={`skipped-${category}-${item.item_key}`}
                            className="flex items-start justify-between gap-4 text-gray-400"
                          >
                            <span className="flex flex-col text-sm">
                              <span className="font-medium">{item.name}</span>
                              {(item.needed_amount || item.buy_amount) && (
                                <span className="mt-1 text-xs text-gray-400">
                                  {item.needed_amount ? `Recipes use ${item.needed_amount}` : ""}
                                  {item.needed_amount && item.buy_amount ? " • " : ""}
                                  {item.buy_amount ? `Buy ${item.buy_amount}` : ""}
                                </span>
                              )}
                              {item.flexibility_note ? (
                                <span className="mt-1 text-[11px] leading-5 text-gray-400">
                                  {item.flexibility_note}
                                </span>
                              ) : null}
                              {(item.meal_names?.length || item.usage_notes?.length) ? (
                                <button
                                  className="mt-1 min-h-11 w-fit text-xs font-semibold text-gray-500 transition hover:text-gray-600"
                                  onClick={() => toggleUsageItem(`skipped-${item.item_key}`)}
                                  type="button"
                                >
                                  {expandedUsageItems.has(`skipped-${item.item_key}`)
                                    ? "Hide details"
                                    : `Details${formatMealCount(item) ? ` (${formatMealCount(item)})` : ""}`}
                                </button>
                              ) : null}
                              {expandedUsageItems.has(`skipped-${item.item_key}`) ? (
                                <div className="mt-2 rounded-2xl bg-white/70 px-3 py-2 text-[11px] leading-5 text-gray-500">
                                  {item.meal_names && item.meal_names.length > 0 ? (
                                    <p className="font-semibold text-gray-600">
                                      For: {item.meal_names.join(", ")}
                                    </p>
                                  ) : null}
                                  {item.usage_notes && item.usage_notes.length > 0 ? (
                                    item.usage_notes.map((note) => (
                                      <p key={`skipped-${item.item_key}-${note.meal}`}>
                                        <span className="font-semibold text-gray-600">
                                          {note.meal}:
                                        </span>{" "}
                                        {note.usage}
                                      </p>
                                    ))
                                  ) : null}
                                </div>
                              ) : null}
                            </span>
                            <button
                              className="text-xs font-semibold text-orange-500 transition hover:text-orange-600"
                              onClick={() => onRestoreSkippedItem(item.name)}
                              type="button"
                            >
                              + Add Back
                            </button>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 border-t border-stone-200 pt-6">
              <h4 className="mb-2 mt-8 text-sm font-bold uppercase text-gray-500">
                Extras & Household (Not in Budget)
              </h4>
              {customItems.length > 0 ? (
                <ul className="space-y-2">
                  {customItems.map((item) => (
                    <li
                      key={`custom-${item.id}`}
                      className="flex items-center justify-between gap-4 text-sm text-ink/75"
                    >
                      <label className="flex items-center gap-3">
                        <input
                          checked={item.isChecked}
                          className="h-4 w-4 rounded border-pine/30 text-pine focus:ring-pine"
                          onChange={() => onSetCustomItemChecked(item.id, !item.isChecked)}
                          type="checkbox"
                        />
                        <span className={item.isChecked ? "line-through opacity-60" : ""}>
                          {item.name}
                        </span>
                      </label>
                      <button
                        className="text-xs font-semibold text-red-400 transition hover:text-red-500"
                        onClick={() => onRemoveCustomItem(item.id)}
                        type="button"
                      >
                        - Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400">
                  Add snacks, paper towels, or any other extras you want to remember.
                </p>
              )}
              <div className="mt-2 flex gap-2">
                <input
                  className="min-w-0 flex-1 rounded border px-2 py-1 text-base" aria-label="Add a shopping extra"
                  onChange={(event) => onChangeCustomItem(event.target.value)}
                  placeholder="Add snacks, paper towels..."
                  type="text"
                  value={newCustomItem}
                />
                <button
                  className="rounded bg-gray-200 px-3 py-1 text-sm font-medium"
                  onClick={onAddCustomItem}
                  type="button"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-stone-200 bg-white px-4 py-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-berry/80">
                    Budget Progress
                  </p>
                  <p className="mt-1 text-base font-bold text-ink">
                    {hasUnknownPrices ? "Estimate unavailable" : formatCurrency(totalCost)} / {formatCurrency(parsedBudget)}
                  </p>
                </div>
                <span className={`text-sm font-semibold ${budgetStatusTextClass}`}>
                  {budgetStatusLabel}
                </span>
              </div>
              {!hasUnknownPrices ? <div className="mt-4 h-4 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${budgetProgressBarClass}`}
                  style={{ width: `${budgetPercentage}%` }}
                />
              </div> : <p className="mt-3 text-sm leading-6 text-ink/70">Confirm package sizes and prices at your store. An incomplete estimate cannot verify your budget.</p>}
              <div className="mt-3 flex items-center justify-between text-xs font-medium text-ink/60">
                <span>{hasUnknownPrices ? "Prices not yet verified" : `${Math.round(rawBudgetPercentage)}% of budget used`}</span>
                <span className={budgetStatusTextClass}>{budgetStatusLabel}</span>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-4">
              <button
                className="inline-flex items-center justify-center rounded-full bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
                onClick={onCopyShoppingList}
                type="button"
              >
                Copy Shopping List
              </button>
              {copied && <span className="text-sm font-semibold text-pine">Copied!</span>}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
