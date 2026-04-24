"use client";

type GroceryListItem = {
  category: string;
  buy_amount?: string;
  name: string;
  estimated_price: number;
  needed_amount?: string;
};

type CustomItem = {
  id: string;
  name: string;
  isChecked: boolean;
};

type SmartCartGrocerySidebarProps = {
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
  isPremiumMode: boolean;
  newCustomItem: string;
  onAddCustomItem: () => void;
  onChangeCustomItem: (value: string) => void;
  onCopyShoppingList: () => void;
  onRemoveCustomItem: (id: string) => void;
  onRemoveRestoredItem: (name: string) => void;
  onRestoreSkippedItem: (name: string) => void;
  onSetCustomItemChecked: (id: string, isChecked: boolean) => void;
  onToggleCheckedItem: (key: string) => void;
  onToggleGroceryOpen: () => void;
  onTogglePremiumMode: () => void;
  parsedBudget: number;
  restoredItems: string[];
  rawBudgetPercentage: number;
  skippedGroceriesByCategory: [string, GroceryListItem[]][];
  totalCost: number;
};

const safeTrim = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export function SmartCartGrocerySidebar({
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
  isPremiumMode,
  newCustomItem,
  onAddCustomItem,
  onChangeCustomItem,
  onCopyShoppingList,
  onRemoveCustomItem,
  onRemoveRestoredItem,
  onRestoreSkippedItem,
  onSetCustomItemChecked,
  onToggleCheckedItem,
  onToggleGroceryOpen,
  onTogglePremiumMode,
  parsedBudget,
  rawBudgetPercentage,
  restoredItems,
  skippedGroceriesByCategory,
  totalCost,
}: SmartCartGrocerySidebarProps) {
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

        {isGroceryOpen && (
          <>
            <p className="mt-2 text-sm italic leading-6 text-gray-500">
              Prices reflect estimated standard package costs, not exact recipe-use cost.
              Actual totals may still vary by store and location.
            </p>
            <p className="mb-4 mt-2 text-xs italic text-gray-500">
              *Need shows what your selected meals use. Buy shows the likely package you
              would grab at the store.*
            </p>

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
                          const bellPepperPattern = /bell pepper/i;
                          const bellPepperColorPattern = /\b(red|green|yellow|orange)\b/i;
                          const trimmedName = safeTrim(item.name);
                          const isRestoredItem = restoredItems.includes(trimmedName.toLowerCase());
                          const displayName =
                            bellPepperPattern.test(trimmedName) &&
                            !bellPepperColorPattern.test(trimmedName)
                              ? `${trimmedName} (Any color)`
                              : trimmedName;

                          return (
                            <li
                              key={`${category}-${item.name}`}
                              className="flex items-start justify-between gap-4"
                            >
                              <label className="flex items-start gap-3">
                                <input
                                  checked={checkedItems.has(`${category}-${item.name}`)}
                                  className="mt-0.5 h-4 w-4 rounded border-pine/30 text-pine focus:ring-pine"
                                  onChange={() => onToggleCheckedItem(`${category}-${item.name}`)}
                                  type="checkbox"
                                />
                                <span className="flex flex-col">
                                  <span
                                    className={`flex items-center gap-2 text-sm font-medium text-ink ${
                                    checkedItems.has(`${category}-${item.name}`)
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
                                    <span className="mt-1 flex flex-col text-xs text-ink/55">
                                      {item.needed_amount && (
                                        <span>Need: {item.needed_amount}</span>
                                      )}
                                      {item.buy_amount && <span>Buy: {item.buy_amount}</span>}
                                    </span>
                                  )}
                                </span>
                              </label>
                              <span className="flex shrink-0 flex-col items-end text-right">
                                <span className="text-sm font-semibold text-pine">
                                  {formatCurrency(item.estimated_price)}
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
                  because you marked them as owned. The amounts listed below are exactly what
                  you need to cook your selected meals. If your current stash is smaller than
                  the amount shown, click <strong>[+ Add Back]</strong> so you do not run out.
                </div>
                <div className="space-y-4">
                  {skippedGroceriesByCategory.map(([category, items]) => (
                    <section key={`skipped-${category}`}>
                      <p className="text-sm font-semibold text-gray-400">{category}</p>
                      <ul className="mt-3 space-y-3">
                        {items.map((item) => (
                          <li
                            key={`skipped-${category}-${item.name}`}
                            className="flex items-start justify-between gap-4 text-gray-400"
                          >
                            <span className="flex flex-col text-sm">
                              <span className="font-medium">{item.name}</span>
                              {(item.needed_amount || item.buy_amount) && (
                                <span className="mt-1 flex flex-col text-xs text-gray-400">
                                  {item.needed_amount && (
                                    <span>Need: {item.needed_amount}</span>
                                  )}
                                  {item.buy_amount && <span>Buy: {item.buy_amount}</span>}
                                </span>
                              )}
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
                  className="flex-1 rounded border px-2 py-1 text-sm"
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
                    {formatCurrency(totalCost)} / {formatCurrency(parsedBudget)}
                  </p>
                </div>
                <span className={`text-sm font-semibold ${budgetStatusTextClass}`}>
                  {budgetStatusLabel}
                </span>
              </div>
              <div className="mt-4 h-4 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${budgetProgressBarClass}`}
                  style={{ width: `${budgetPercentage}%` }}
                />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs font-medium text-ink/60">
                <span>{Math.round(rawBudgetPercentage)}% of budget used</span>
                <span className={budgetStatusTextClass}>{budgetStatusLabel}</span>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-4">
              <button
                className="mb-2 w-full rounded-md bg-orange-100 px-4 py-3 font-bold text-orange-700"
                onClick={onTogglePremiumMode}
                type="button"
              >
                {isPremiumMode ? "Revert to Standard" : "Upgrade to Premium Ingredients"}
              </button>
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
