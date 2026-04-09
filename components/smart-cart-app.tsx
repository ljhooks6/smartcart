"use client";

import { FormEvent, useMemo, useState } from "react";

import WaitlistForm from "@/components/WaitlistForm";

type GenerateListResponse = {
  meals: Array<{
    name: string;
    servings: number;
    notes: string;
  }>;
  grocery_list: Array<{
    item: string;
    estimated_price: number;
  }>;
};

type FormState = {
  budget: string;
  diet: string;
  householdSize: string;
  pantryItems: string;
  prepTime: string;
  adventureLevel: string;
  strictStretchMode: boolean;
};

const initialFormState: FormState = {
  budget: "75",
  diet: "Vegetarian",
  householdSize: "2",
  pantryItems: "Rice, black beans, garlic, soy sauce, canned tomatoes",
  prepTime: "Under 30 mins",
  adventureLevel: "Mix it up",
  strictStretchMode: true,
};

const prepTimeOptions = ["Under 30 mins", "Under 1 hour", "No limit"] as const;
const adventureLevelOptions = [
  "Stick to basics",
  "Mix it up",
  "Try new cuisines",
] as const;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function SmartCartApp() {
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedPlan, setGeneratedPlan] =
    useState<GenerateListResponse | null>(null);

  const pantryHints = useMemo(
    () =>
      formState.pantryItems
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    [formState.pantryItems],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError(null);

    const budget = Number(formState.budget);
    const householdSize = Number(formState.householdSize);
    const pantryItems = formState.pantryItems
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (!Number.isFinite(budget) || budget <= 0) {
      setValidationError("Enter a weekly budget greater than $0.");
      return;
    }

    if (!Number.isInteger(householdSize) || householdSize <= 0) {
      setValidationError("Household size must be a whole number greater than 0.");
      return;
    }

    if (pantryItems.length === 0) {
      setValidationError("Add at least one pantry item before generating a plan.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/generate-list", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          budget,
          diet: formState.diet.trim() || "No specific diet provided",
          householdSize,
          pantryItems,
        }),
      });

      const data = (await response.json()) as {
        meals?: GenerateListResponse["meals"];
        grocery_list?: GenerateListResponse["grocery_list"];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Request failed.");
      }

      console.log(data);
      setGeneratedPlan({
        meals: data.meals ?? [],
        grocery_list: data.grocery_list ?? [],
      });
    } catch {
      alert("Oops! There was a problem generating your plan. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 -z-10 h-[32rem] bg-grain-glow blur-3xl" />

      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-8 rounded-[2rem] border border-white/60 bg-white/70 p-6 shadow-halo backdrop-blur xl:p-10">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-pine/15 bg-cream px-4 py-2 text-sm font-semibold text-pine">
              SmartCart
              <span className="h-2.5 w-2.5 rounded-full bg-sage" />
            </div>

            <div className="space-y-5">
              <p className="font-display text-sm uppercase tracking-[0.35em] text-berry/75">
                Budget-conscious meal planning
              </p>
              <h1 className="max-w-3xl font-display text-4xl leading-tight text-ink sm:text-5xl lg:text-6xl">
                Stretch every grocery dollar without defaulting to the same tired dinners.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-ink/75">
                SmartCart turns your pantry, budget, and time constraints into a practical dinner
                plan with a grocery checklist you can actually shop.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-pine/10 bg-cream p-4">
                <p className="font-display text-3xl text-pine">Budget first</p>
                <p className="mt-2 text-sm text-ink/70">
                  Plans are shaped around what you can realistically spend this week.
                </p>
              </div>
              <div className="rounded-3xl border border-pine/10 bg-cream p-4">
                <p className="font-display text-3xl text-pine">Pantry aware</p>
                <p className="mt-2 text-sm text-ink/70">
                  Existing ingredients are surfaced first so fewer groceries go to waste.
                </p>
              </div>
              <div className="rounded-3xl border border-pine/10 bg-cream p-4">
                <p className="font-display text-3xl text-pine">Fast setup</p>
                <p className="mt-2 text-sm text-ink/70">
                  A few context inputs are enough to generate a usable plan.
                </p>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-pine/10 bg-pine px-6 py-5 text-cream">
              <p className="font-display text-xl">Pantry snapshot</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {pantryHints.length > 0 ? (
                  pantryHints.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm"
                    >
                      {item}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-cream/80">
                    Add a few pantry ingredients and they&apos;ll show up here.
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-ink/10 bg-[#fff9f0]/90 p-6 shadow-halo backdrop-blur xl:p-8">
            <div className="mb-6">
              <p className="font-display text-3xl text-ink">The Smart Context Form</p>
              <p className="mt-2 text-sm leading-6 text-ink/70">
                Give the planner enough context to keep meals affordable and realistic.
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-ink">Weekly Budget</span>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/50">
                      $
                    </span>
                    <input
                      className="w-full rounded-2xl border border-ink/10 bg-white px-8 py-3 text-base text-ink outline-none transition focus:border-apricot focus:ring-4 focus:ring-apricot/15"
                      inputMode="decimal"
                      min="1"
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          budget: event.target.value,
                        }))
                      }
                      placeholder="75"
                      type="number"
                      value={formState.budget}
                    />
                  </div>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-ink">Household Size</span>
                  <input
                    className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-base text-ink outline-none transition focus:border-apricot focus:ring-4 focus:ring-apricot/15"
                    min="1"
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        householdSize: event.target.value,
                      }))
                    }
                    placeholder="2"
                    type="number"
                    value={formState.householdSize}
                  />
                </label>
              </div>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-ink">Dietary Restrictions</span>
                <input
                  className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-base text-ink outline-none transition focus:border-apricot focus:ring-4 focus:ring-apricot/15"
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      diet: event.target.value,
                    }))
                  }
                  placeholder="Vegetarian, nut-free, halal, low-sodium..."
                  type="text"
                  value={formState.diet}
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-ink">Prep Time Available</span>
                  <select
                    className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-base text-ink outline-none transition focus:border-apricot focus:ring-4 focus:ring-apricot/15"
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        prepTime: event.target.value,
                      }))
                    }
                    value={formState.prepTime}
                  >
                    {prepTimeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-ink">Adventure Level</span>
                  <select
                    className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-base text-ink outline-none transition focus:border-apricot focus:ring-4 focus:ring-apricot/15"
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        adventureLevel: event.target.value,
                      }))
                    }
                    value={formState.adventureLevel}
                  >
                    {adventureLevelOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-ink">Pantry Check</span>
                <textarea
                  className="min-h-32 w-full rounded-3xl border border-ink/10 bg-white px-4 py-3 text-base text-ink outline-none transition focus:border-apricot focus:ring-4 focus:ring-apricot/15"
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      pantryItems: event.target.value,
                    }))
                  }
                  placeholder="List 3-5 ingredients you already own..."
                  value={formState.pantryItems}
                />
              </label>

              <div className="flex items-center justify-between rounded-[1.75rem] border border-pine/10 bg-cream px-4 py-4">
                <div className="pr-4">
                  <p className="text-sm font-semibold text-ink">Budget Tightness / Stretch</p>
                  <p className="mt-1 text-sm leading-6 text-ink/65">
                    Keep ingredient overlap high so the cart stays lean and flexible.
                  </p>
                </div>
                <button
                  aria-label="Toggle strict stretch mode"
                  className={`relative inline-flex h-10 w-20 items-center rounded-full transition ${
                    formState.strictStretchMode ? "bg-pine" : "bg-ink/20"
                  }`}
                  onClick={() =>
                    setFormState((current) => ({
                      ...current,
                      strictStretchMode: !current.strictStretchMode,
                    }))
                  }
                  type="button"
                >
                  <span
                    className={`inline-block h-8 w-8 rounded-full bg-white shadow-md transition ${
                      formState.strictStretchMode ? "translate-x-11" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {validationError && (
                <div className="rounded-2xl border border-berry/20 bg-berry/10 px-4 py-3 text-sm text-berry">
                  {validationError}
                </div>
              )}

              <button
                className="w-full rounded-[1.5rem] bg-ink px-6 py-4 font-display text-lg text-cream transition hover:-translate-y-0.5 hover:bg-pine disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? "Generating Plan..." : "Generate"}
              </button>
            </form>
          </div>
        </div>

        <section className="mt-10 space-y-6 pb-16">
          {generatedPlan ? (
            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-[2rem] border border-pine/10 bg-white/80 p-6 shadow-halo backdrop-blur">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="font-display text-3xl text-ink">Suggested meals</p>
                    <p className="mt-2 text-sm leading-6 text-ink/70">
                      These results are coming directly from <code>/api/generate-list</code>.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-pine px-4 py-3 text-cream">
                    <p className="text-xs uppercase tracking-[0.2em] text-cream/75">Budget</p>
                    <p className="font-display text-2xl">
                      {formatCurrency(Number(formState.budget) || 0)}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {generatedPlan.meals.map((meal) => (
                    <article
                      key={meal.name}
                      className="rounded-[1.5rem] border border-ink/10 bg-[#fffaf4] p-5 shadow-sm"
                    >
                      <h2 className="font-display text-2xl text-ink">{meal.name}</h2>
                      <p className="mt-2 text-sm font-semibold text-pine">
                        Serves {meal.servings}
                      </p>
                      <p className="mt-3 text-sm leading-7 text-ink/75">{meal.notes}</p>
                    </article>
                  ))}
                </div>
              </div>

              <aside className="rounded-[2rem] border border-ink/10 bg-cream p-6 shadow-sm">
                <p className="font-display text-3xl text-ink">Grocery list</p>
                <p className="mt-2 text-sm leading-6 text-ink/70">
                  Estimated prices are included so you can spot-check the cart quickly.
                </p>

                <ul className="mt-6 space-y-3">
                  {generatedPlan.grocery_list.map((item) => (
                    <li
                      key={item.item}
                      className="flex items-center justify-between gap-4 rounded-2xl border border-pine/10 bg-white px-4 py-3"
                    >
                      <span className="text-sm font-medium text-ink">{item.item}</span>
                      <span className="text-sm font-semibold text-pine">
                        {formatCurrency(item.estimated_price)}
                      </span>
                    </li>
                  ))}
                </ul>
              </aside>
            </div>
          ) : (
            <div className="rounded-[2rem] border border-dashed border-pine/20 bg-white/40 p-10 text-center text-ink/60">
              <p className="font-display text-2xl text-ink">Your generated plan will appear here</p>
              <p className="mt-3 text-sm leading-7">
                Submitting the form sends a POST request to <code>/api/generate-list</code> with
                your budget, diet, household size, and pantry items.
              </p>
            </div>
          )}

          <WaitlistForm />
        </section>
      </section>
    </main>
  );
}
