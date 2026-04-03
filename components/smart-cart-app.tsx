"use client";

import { FormEvent, useMemo, useRef, useState } from "react";

import {
  adventureLevelOptions,
  prepTimeOptions,
  type MealPlanRequest,
  type MealPlanResponse,
} from "@/lib/meal-plan-schema";
import WaitlistForm from "@/components/WaitlistForm";

type FormState = {
  weeklyBudget: string;
  householdSize: string;
  dietaryRestrictions: string;
  prepTimeAvailable: MealPlanRequest["prepTimeAvailable"];
  adventureLevel: MealPlanRequest["adventureLevel"];
  pantryCheck: string;
  strictStretchMode: boolean;
};

const initialFormState: FormState = {
  weeklyBudget: "75",
  householdSize: "2",
  dietaryRestrictions: "",
  prepTimeAvailable: "Under 30 mins",
  adventureLevel: "Mix it up",
  pantryCheck: "Rice, black beans, garlic, soy sauce, canned tomatoes",
  strictStretchMode: true,
};

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
  const [serverError, setServerError] = useState<string | null>(null);
  const [result, setResult] = useState<MealPlanResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const resultsRef = useRef<HTMLElement | null>(null);

  const pantryHints = useMemo(
    () => formState.pantryCheck.split(",").map((item) => item.trim()).filter(Boolean),
    [formState.pantryCheck],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError(null);
    setServerError(null);

    const weeklyBudget = Number(formState.weeklyBudget);
    const householdSize = Number(formState.householdSize);

    if (!Number.isFinite(weeklyBudget) || weeklyBudget <= 0) {
      setValidationError("Enter a weekly budget greater than $0.");
      return;
    }

    if (!Number.isInteger(householdSize) || householdSize <= 0) {
      setValidationError("Household size must be a whole number greater than 0.");
      return;
    }

    if (formState.pantryCheck.trim().length < 3) {
      setValidationError("Add 3 to 5 pantry ingredients so SmartCart can anchor the plan.");
      return;
    }

    const payload: MealPlanRequest = {
      weeklyBudget,
      householdSize,
      dietaryRestrictions: formState.dietaryRestrictions.trim(),
      prepTimeAvailable: formState.prepTimeAvailable,
      adventureLevel: formState.adventureLevel,
      pantryCheck: formState.pantryCheck.trim(),
      strictStretchMode: formState.strictStretchMode,
    };

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/meal-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as MealPlanResponse | { error?: string };

      if (!response.ok) {
        setServerError(data && "error" in data ? data.error || "Request failed." : "Request failed.");
        setResult(null);
        return;
      }

      setResult(data as MealPlanResponse);

      requestAnimationFrame(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch {
      setServerError("Network error. Please try again once the app server is running.");
      setResult(null);
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
                SmartCart turns your pantry, budget, and time constraints into a cross-utilized
                5-day dinner plan with a practical grocery checklist you can actually shop.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-pine/10 bg-cream p-4">
                <p className="font-display text-3xl text-pine">5 days</p>
                <p className="mt-2 text-sm text-ink/70">Dinner-focused planning built for the workweek.</p>
              </div>
              <div className="rounded-3xl border border-pine/10 bg-cream p-4">
                <p className="font-display text-3xl text-pine">Zero waste</p>
                <p className="mt-2 text-sm text-ink/70">Ingredient overlap is prioritized to avoid leftovers dying in the fridge.</p>
              </div>
              <div className="rounded-3xl border border-pine/10 bg-cream p-4">
                <p className="font-display text-3xl text-pine">Pantry first</p>
                <p className="mt-2 text-sm text-ink/70">Meals are anchored to what you already own before anything new gets added.</p>
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
                Give the planner enough context to keep meals affordable, realistic, and worth repeating.
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
                      className="w-full rounded-2xl border border-ink/10 bg-white px-8 py-3 text-base outline-none transition focus:border-apricot focus:ring-4 focus:ring-apricot/15"
                      inputMode="decimal"
                      min="1"
                      name="weeklyBudget"
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          weeklyBudget: event.target.value,
                        }))
                      }
                      placeholder="75"
                      type="number"
                      value={formState.weeklyBudget}
                    />
                  </div>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-ink">Household Size</span>
                  <input
                    className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-base outline-none transition focus:border-apricot focus:ring-4 focus:ring-apricot/15"
                    min="1"
                    name="householdSize"
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
                  className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-base outline-none transition focus:border-apricot focus:ring-4 focus:ring-apricot/15"
                  name="dietaryRestrictions"
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      dietaryRestrictions: event.target.value,
                    }))
                  }
                  placeholder="Vegetarian, nut-free, halal, low-sodium..."
                  type="text"
                  value={formState.dietaryRestrictions}
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-ink">Prep Time Available</span>
                  <select
                    className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-base outline-none transition focus:border-apricot focus:ring-4 focus:ring-apricot/15"
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        prepTimeAvailable: event.target.value as MealPlanRequest["prepTimeAvailable"],
                      }))
                    }
                    value={formState.prepTimeAvailable}
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
                    className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-base outline-none transition focus:border-apricot focus:ring-4 focus:ring-apricot/15"
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        adventureLevel: event.target.value as MealPlanRequest["adventureLevel"],
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
                  className="min-h-32 w-full rounded-3xl border border-ink/10 bg-white px-4 py-3 text-base outline-none transition focus:border-apricot focus:ring-4 focus:ring-apricot/15"
                  name="pantryCheck"
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      pantryCheck: event.target.value,
                    }))
                  }
                  placeholder="List 3-5 ingredients you already own..."
                  value={formState.pantryCheck}
                />
              </label>

              <div className="flex items-center justify-between rounded-[1.75rem] border border-pine/10 bg-cream px-4 py-4">
                <div className="pr-4">
                  <p className="text-sm font-semibold text-ink">Budget Tightness / Stretch</p>
                  <p className="mt-1 text-sm leading-6 text-ink/65">
                    Enforce strict ingredient cross-utilization to squeeze the most out of your cart.
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

              {(validationError || serverError) && (
                <div className="rounded-2xl border border-berry/20 bg-berry/10 px-4 py-3 text-sm text-berry">
                  {validationError || serverError}
                </div>
              )}

              <button
                className="w-full rounded-[1.5rem] bg-ink px-6 py-4 font-display text-lg text-cream transition hover:-translate-y-0.5 hover:bg-pine disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? "Building your plan..." : "Generate my 5-day plan"}
              </button>
            </form>
          </div>
        </div>

        <section className="mt-10 space-y-6 pb-16" ref={resultsRef}>
          {result ? (
            <>
              <div className="flex flex-col gap-4 rounded-[2rem] border border-pine/10 bg-white/80 p-6 shadow-halo backdrop-blur sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="font-display text-3xl text-ink">Your SmartCart plan</p>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/70">
                    Five budget-conscious dinners, one cross-utilized grocery list, and a built-in savings tip.
                  </p>
                </div>
                <div className="rounded-[1.5rem] bg-pine px-5 py-4 text-cream">
                  <p className="text-sm uppercase tracking-[0.2em] text-cream/70">Estimated total</p>
                  <p className="mt-1 font-display text-3xl">{formatCurrency(result.estimated_total_cost)}</p>
                </div>
              </div>

              <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                    {result.meal_plan.map((meal, index) => (
                      <article
                        key={`${meal.day}-${meal.meal_name}-${index}`}
                        className="rounded-[1.75rem] border border-ink/10 bg-[#fffaf4] p-5 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-berry/70">
                              {meal.day}
                            </p>
                            <h2 className="mt-2 font-display text-2xl text-ink">{meal.meal_name}</h2>
                          </div>
                          <span className="rounded-full bg-apricot/15 px-3 py-1 text-sm font-semibold text-berry">
                            {meal.prep_time_minutes} min
                          </span>
                        </div>
                        <p className="mt-4 text-sm leading-7 text-ink/75">{meal.quick_instructions}</p>
                      </article>
                    ))}
                  </div>
                </div>

                <aside className="rounded-[2rem] border border-ink/10 bg-cream p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-display text-3xl text-ink">Grocery checklist</p>
                      <p className="mt-2 text-sm leading-6 text-ink/70">
                        Organized so you can shop once and cook through the week.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-6">
                    {[
                      {
                        title: "Produce",
                        items: result.grocery_list.produce,
                      },
                      {
                        title: "Meat & Dairy",
                        items: result.grocery_list.meat_and_dairy,
                      },
                      {
                        title: "Pantry Staples",
                        items: result.grocery_list.pantry_staples,
                      },
                    ].map((group) => (
                      <section key={group.title} className="rounded-[1.5rem] border border-pine/10 bg-white px-4 py-4">
                        <p className="font-display text-xl text-pine">{group.title}</p>
                        <ul className="mt-4 space-y-3">
                          {group.items.map((item) => (
                            <li key={`${group.title}-${item}`} className="flex items-start gap-3 text-sm text-ink/80">
                              <input
                                checked
                                className="mt-0.5 h-4 w-4 rounded border-pine/30 text-pine focus:ring-pine"
                                readOnly
                                type="checkbox"
                              />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </section>
                    ))}
                  </div>

                  <div className="mt-6 rounded-[1.5rem] bg-apricot/15 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-berry/80">Savings tip</p>
                    <p className="mt-2 text-sm leading-7 text-ink/80">{result.savings_tip}</p>
                  </div>

                  <a
                    className="mt-6 inline-flex w-full items-center justify-center rounded-[1.5rem] bg-pine px-6 py-4 text-center font-display text-xl text-cream transition hover:-translate-y-0.5 hover:bg-berry"
                    href="https://www.instacart.com"
                    rel="noreferrer"
                    target="_blank"
                  >
                    🛒 Shop this list on Instacart
                  </a>
                </aside>
              </div>
            </>
          ) : (
            <div className="rounded-[2rem] border border-dashed border-pine/20 bg-white/40 p-10 text-center text-ink/60">
              <p className="font-display text-2xl text-ink">Your plan will appear here</p>
              <p className="mt-3 text-sm leading-7">
                Submit the Smart Context Form to generate dinner cards, a categorized grocery list,
                estimated spend, and one app-based savings tip.
              </p>
            </div>
          )}

          <WaitlistForm />
        </section>
      </section>
    </main>
  );
}
