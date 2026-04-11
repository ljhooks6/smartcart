"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type MealPlanItem = {
  day: string;
  name: string;
  servings: number;
  notes: string;
};

type GroceryListItem = {
  category: string;
  item: string;
  estimated_price: number;
};

type GenerateListResponse = {
  meals: MealPlanItem[];
  grocery_list: GroceryListItem[];
  estimated_total_cost: number;
  budget_summary: string;
  upgrade_available: boolean;
  dessert?: {
    title: string;
    description: string;
  };
};

type RecipeResponse = {
  title: string;
  prep_time_minutes: number;
  ingredients: string[];
  steps: string[];
};

type ReplaceMealResponse = {
  title: string;
  description: string;
  prepTime: number;
  ingredients: string[];
};

type FormState = {
  budget: string;
  diet: string;
  householdSize: string;
  pantryItems: string;
  mustHaveIngredient: string;
  includeDessert: boolean;
  prepTime: string;
  adventureLevel: string;
  isBudgetTight: boolean;
};

const initialFormState: FormState = {
  budget: "75",
  diet: "Vegetarian",
  householdSize: "2",
  pantryItems: "",
  mustHaveIngredient: "",
  includeDessert: false,
  prepTime: "Under 30 mins",
  adventureLevel: "Mix it up",
  isBudgetTight: true,
};

const prepTimeOptions = ["Under 30 mins", "Under 1 hour", "No limit"] as const;
const adventureLevelOptions = [
  "Stick to basics",
  "Mix it up",
  "Try new cuisines",
] as const;

const pantryQuickSelectOptions = {
  "Oils & Condiments": [
    "Olive oil",
    "Vegetable oil",
    "Butter",
    "Soy sauce",
    "Vinegar",
    "Mustard",
    "Hot sauce",
    "Ketchup",
    "Mayo",
    "Honey",
    "Maple syrup",
  ],
  "Spices & Seasonings": [
    "Salt",
    "Black pepper",
    "Garlic powder",
    "Onion powder",
    "Paprika",
    "Cumin",
    "Chili powder",
    "Cinnamon",
    "Oregano",
    "Italian seasoning",
  ],
  "Baking Staples": [
    "White sugar",
    "Brown sugar",
    "All-purpose flour",
    "Baking powder",
    "Baking soda",
    "Vanilla extract",
  ],
  "Canned & Jarred": [
    "Canned tomatoes",
    "Tomato paste",
    "Black beans",
    "Chickpeas",
    "Coconut milk",
    "Peanut butter",
    "Chicken broth",
    "Vegetable broth",
  ],
  "Grains & Carbs": [
    "White rice",
    "Brown rice",
    "Pasta",
    "Oats",
    "Breadcrumbs",
    "Quinoa",
    "Tortillas",
  ],
  "Produce (Long-lasting)": [
    "Onions",
    "Garlic cloves",
    "Potatoes",
    "Carrots",
    "Lemons",
  ],
} as const;

const SMART_CART_FORM_STORAGE_KEY = "smartcart-smart-context-form";
const SMART_CART_WEEKLY_MENU_STORAGE_KEY = "smartcart-weekly-menu";
const fallbackFoodImages = [
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80",
  "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=600&q=80",
  "https://images.unsplash.com/photo-1490645935967-10de6ba8232e?w=600&q=80",
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80",
  "https://images.unsplash.com/photo-1432139555190-58524dae6a5a?w=600&q=80",
];
const pantryCategoryStyles: Record<string, string> = {
  "Oils & Condiments": "border-orange-200 bg-orange-50",
  "Spices & Seasonings": "border-rose-200 bg-rose-50",
  "Baking Staples": "border-amber-200 bg-amber-50",
  "Canned & Jarred": "border-sky-200 bg-sky-50",
  "Grains & Carbs": "border-violet-200 bg-violet-50",
  "Produce (Long-lasting)": "border-emerald-200 bg-emerald-50",
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
  const [requestError, setRequestError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedPlan, setGeneratedPlan] =
    useState<GenerateListResponse | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [selectedQuickItems, setSelectedQuickItems] = useState<Set<string>>(
    new Set(),
  );
  const [copied, setCopied] = useState(false);
  const [hasAppliedUpgrades, setHasAppliedUpgrades] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [recipeCache, setRecipeCache] = useState<Record<string, RecipeResponse>>(
    {},
  );
  const [activeRecipeMeal, setActiveRecipeMeal] = useState<MealPlanItem | null>(
    null,
  );
  const [recipeError, setRecipeError] = useState<string | null>(null);
  const [recipeLoadingMeal, setRecipeLoadingMeal] = useState<string | null>(null);
  const [weeklyMenu, setWeeklyMenu] = useState<MealPlanItem[]>([]);
  const [replacingMealKey, setReplacingMealKey] = useState<string | null>(null);
  const [expandedIngredientsMeals, setExpandedIngredientsMeals] = useState<
    Set<string>
  >(new Set());

  useEffect(() => {
    try {
      const savedFormState = window.localStorage.getItem(
        SMART_CART_FORM_STORAGE_KEY,
      );

      if (!savedFormState) {
        return;
      }

      const parsed = JSON.parse(savedFormState) as Partial<FormState> & {
        selectedQuickItems?: string[];
      };

      setFormState((current) => ({
        ...current,
        budget: parsed.budget ?? current.budget,
        diet: parsed.diet ?? current.diet,
        householdSize: parsed.householdSize ?? current.householdSize,
        pantryItems: parsed.pantryItems ?? current.pantryItems,
        mustHaveIngredient:
          parsed.mustHaveIngredient ?? current.mustHaveIngredient,
        includeDessert: parsed.includeDessert ?? current.includeDessert,
        prepTime: parsed.prepTime ?? current.prepTime,
        adventureLevel: parsed.adventureLevel ?? current.adventureLevel,
        isBudgetTight: parsed.isBudgetTight ?? current.isBudgetTight,
      }));

      setSelectedQuickItems(new Set(parsed.selectedQuickItems ?? []));
    } catch {
      window.localStorage.removeItem(SMART_CART_FORM_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      SMART_CART_FORM_STORAGE_KEY,
      JSON.stringify({
        ...formState,
        selectedQuickItems: Array.from(selectedQuickItems),
      }),
    );
  }, [formState, selectedQuickItems]);

  useEffect(() => {
    try {
      const savedWeeklyMenu = window.localStorage.getItem(
        SMART_CART_WEEKLY_MENU_STORAGE_KEY,
      );

      if (!savedWeeklyMenu) {
        return;
      }

      const parsed = JSON.parse(savedWeeklyMenu) as MealPlanItem[];
      if (Array.isArray(parsed)) {
        setWeeklyMenu(parsed);
      }
    } catch {
      window.localStorage.removeItem(SMART_CART_WEEKLY_MENU_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      SMART_CART_WEEKLY_MENU_STORAGE_KEY,
      JSON.stringify(weeklyMenu),
    );
  }, [weeklyMenu]);

  useEffect(() => {
    if (!activeRecipeMeal) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveRecipeMeal(null);
        setRecipeError(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeRecipeMeal]);

  const combinedPantryItems = useMemo(() => {
    const typedItems = formState.pantryItems
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    return Array.from(new Set([...Array.from(selectedQuickItems), ...typedItems]));
  }, [formState.pantryItems, selectedQuickItems]);

  const groceriesByCategory = useMemo(() => {
    if (!generatedPlan) {
      return [];
    }

    const grouped = generatedPlan.grocery_list.reduce<Record<string, GroceryListItem[]>>(
      (accumulator, item) => {
        const category = item.category || "Other";
        if (!accumulator[category]) {
          accumulator[category] = [];
        }
        accumulator[category].push(item);
        return accumulator;
      },
      {},
    );

    return Object.entries(grouped);
  }, [generatedPlan]);

  const shoppingListText = useMemo(() => {
    return groceriesByCategory
      .map(([category, items]) =>
        `${category}\n${items
          .map((item) => `- ${item.item} (${formatCurrency(item.estimated_price)})`)
          .join("\n")}`,
      )
      .join("\n\n");
  }, [groceriesByCategory]);

  const activeRecipe = activeRecipeMeal
    ? recipeCache[activeRecipeMeal.name]
    : undefined;

  const savedMealKeys = useMemo(
    () => new Set(weeklyMenu.map((meal) => `${meal.day}::${meal.name}`)),
    [weeklyMenu],
  );

  const parsedBudget = Number(formState.budget);
  const isBudgetValid =
    formState.budget.trim().length > 0 &&
    Number.isFinite(parsedBudget) &&
    parsedBudget > 0;

  async function submitPlan(applyUpgrades = false) {
    setValidationError(null);
    setRequestError(null);
    setCopied(false);

    const budget = Number(formState.budget);
    const householdSize = Number(formState.householdSize);

    if (!Number.isFinite(budget) || budget <= 0) {
      setValidationError("Enter a weekly budget greater than $0.");
      return;
    }

    if (!Number.isInteger(householdSize) || householdSize <= 0) {
      setValidationError("Household size must be a whole number greater than 0.");
      return;
    }

    if (combinedPantryItems.length === 0) {
      setValidationError("Add at least one pantry item before generating a plan.");
      return;
    }

    setIsLoading(true);

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
          combinedPantryItems: combinedPantryItems.join(", "),
          mustHaveIngredient: formState.mustHaveIngredient.trim(),
          includeDessert: formState.includeDessert,
          adventureLevel: formState.adventureLevel,
          budgetTightness: formState.isBudgetTight,
          apply_upgrades: applyUpgrades,
        }),
      });

      const data = (await response.json()) as GenerateListResponse & {
        error?: string;
      };

      if (!response.ok) {
        setGeneratedPlan(null);
        setRequestError(`Error ${response.status}: ${data.error || "Request failed."}`);
        return;
      }
      setGeneratedPlan(data);
      setCheckedItems(new Set());
      setRecipeCache({});
      setActiveRecipeMeal(null);
      setRecipeError(null);
      setHasAppliedUpgrades(applyUpgrades);
    } catch (error) {
      setGeneratedPlan(null);
      setRequestError(
        error instanceof Error ? error.message : "Failed to fetch",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitPlan(false);
  }

  function toggleCheckedItem(itemKey: string) {
    setCheckedItems((current) => {
      const next = new Set(current);
      if (next.has(itemKey)) {
        next.delete(itemKey);
      } else {
        next.add(itemKey);
      }
      return next;
    });
  }

  function toggleQuickItem(item: string) {
    setSelectedQuickItems((current) => {
      const next = new Set(current);
      if (next.has(item)) {
        next.delete(item);
      } else {
        next.add(item);
      }
      return next;
    });
  }

  async function handleCopyShoppingList() {
    try {
      await navigator.clipboard.writeText(shoppingListText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      setRequestError(
        error instanceof Error ? error.message : "Failed to copy shopping list.",
      );
    }
  }

  async function handleUpgradePlan() {
    await submitPlan(true);
  }

  function handleWaitlistSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  async function fetchRecipeForMeal(meal: MealPlanItem) {
    if (recipeCache[meal.name]) {
      return recipeCache[meal.name];
    }

    setRecipeError(null);
    setRecipeLoadingMeal(meal.name);

    try {
      const response = await fetch("/api/get-recipe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mealTitle: meal.name,
          mealNotes: meal.notes,
          servings: meal.servings,
        }),
      });

      const data = (await response.json()) as RecipeResponse & { error?: string };

      if (!response.ok) {
        setRecipeError(`Error ${response.status}: ${data.error || "Request failed."}`);
        return null;
      }

      const recipeData = {
        title: data.title,
        prep_time_minutes: data.prep_time_minutes,
        ingredients: data.ingredients,
        steps: data.steps,
      };

      setRecipeCache((current) => ({
        ...current,
        [meal.name]: recipeData,
      }));

      return recipeData;
    } catch (error) {
      setRecipeError(
        error instanceof Error ? error.message : "Failed to fetch recipe.",
      );
      return null;
    } finally {
      setRecipeLoadingMeal(null);
    }
  }

  async function handleGetRecipe(meal: MealPlanItem) {
    setActiveRecipeMeal(meal);
    await fetchRecipeForMeal(meal);
  }

  async function handleGetDessertRecipe() {
    if (!generatedPlan?.dessert) {
      return;
    }

    const dessertMeal: MealPlanItem = {
      day: "Sweet Treat",
      name: generatedPlan.dessert.title,
      servings: Number(formState.householdSize) || 2,
      notes: generatedPlan.dessert.description,
    };

    await handleGetRecipe(dessertMeal);
  }

  function handleSaveToWeeklyMenu(meal: MealPlanItem) {
    const mealKey = `${meal.day}::${meal.name}`;

    setWeeklyMenu((current) => {
      if (current.some((savedMeal) => `${savedMeal.day}::${savedMeal.name}` === mealKey)) {
        return current;
      }

      return [...current, meal];
    });
  }

  async function handleReplaceMeal(meal: MealPlanItem, index: number) {
    if (!generatedPlan) {
      return;
    }

    const mealKey = `${meal.day}::${meal.name}`;
    const budget = Number(formState.budget);
    const householdSize = Number(formState.householdSize);

    setReplacingMealKey(mealKey);
    setRequestError(null);

    try {
      const response = await fetch("/api/replace-meal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          budget,
          diet: formState.diet.trim() || "No specific diet provided",
          householdSize,
          combinedPantryItems: combinedPantryItems.join(", "),
          rejectedMealTitle: meal.name,
          prepTime: formState.prepTime,
          adventureLevel: formState.adventureLevel,
          mustHaveIngredient: formState.mustHaveIngredient.trim(),
        }),
      });

      const data = (await response.json()) as ReplaceMealResponse & {
        error?: string;
      };

      if (!response.ok) {
        setRequestError(`Error ${response.status}: ${data.error || "Request failed."}`);
        return;
      }

      const replacementMeal: MealPlanItem = {
        day: meal.day,
        name: data.title,
        servings: meal.servings,
        notes: `${data.description} Ingredients: ${data.ingredients.join(", ")}. Approx. prep time: ${data.prepTime} minutes.`,
      };

      setGeneratedPlan((current) => {
        if (!current) {
          return current;
        }

        const nextMeals = [...current.meals];
        nextMeals[index] = replacementMeal;

        return {
          ...current,
          meals: nextMeals,
        };
      });

      setWeeklyMenu((current) =>
        current.map((savedMeal) =>
          `${savedMeal.day}::${savedMeal.name}` === mealKey
            ? replacementMeal
            : savedMeal,
        ),
      );

      if (
        activeRecipeMeal &&
        `${activeRecipeMeal.day}::${activeRecipeMeal.name}` === mealKey
      ) {
        setActiveRecipeMeal(replacementMeal);
      }
    } catch (error) {
      setRequestError(
        error instanceof Error ? error.message : "Failed to replace meal.",
      );
    } finally {
      setReplacingMealKey(null);
    }
  }

  async function handleToggleIngredients(meal: MealPlanItem) {
    const mealKey = `${meal.day}::${meal.name}`;

    if (expandedIngredientsMeals.has(mealKey)) {
      setExpandedIngredientsMeals((current) => {
        const next = new Set(current);
        next.delete(mealKey);
        return next;
      });
      return;
    }

    const recipe = await fetchRecipeForMeal(meal);
    if (!recipe) {
      return;
    }

    setExpandedIngredientsMeals((current) => {
      const next = new Set(current);
      next.add(mealKey);
      return next;
    });
  }

  return (
    <main className="relative overflow-hidden bg-stone-50 font-body">
      <div className="absolute inset-x-0 top-0 -z-10 h-[32rem] bg-grain-glow blur-3xl" />

      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-8 rounded-[2.25rem] border border-stone-200/80 bg-white/85 p-6 shadow-xl backdrop-blur xl:p-10">
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
              </div>
              <div className="rounded-3xl border border-pine/10 bg-cream p-4">
                <p className="font-display text-3xl text-pine">Pantry aware</p>
              </div>
              <div className="rounded-3xl border border-pine/10 bg-cream p-4">
                <p className="font-display text-3xl text-pine">Fast setup</p>
              </div>
            </div>
          </div>

          <div className="rounded-[2.25rem] border border-stone-200 bg-[#fcfaf6]/95 p-6 shadow-xl backdrop-blur xl:p-8">
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
                      className="w-full rounded-full border border-ink/10 bg-white px-8 py-3 text-base text-ink outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-200"
                      inputMode="decimal"
                      min="1"
                      required
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
                    className="w-full rounded-full border border-ink/10 bg-white px-4 py-3 text-base text-ink outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-200"
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
                  className="w-full rounded-full border border-ink/10 bg-white px-4 py-3 text-base text-ink outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-200"
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
                    className="w-full rounded-full border border-ink/10 bg-white px-4 py-3 text-base text-ink outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-200"
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
                    className="w-full rounded-full border border-ink/10 bg-white px-4 py-3 text-base text-ink outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-200"
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

              <div className="rounded-[1.75rem] border border-pine/10 bg-pine px-6 py-5 text-cream">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-display text-xl">Pantry Snapshot</p>
                  <span className="text-xs uppercase tracking-[0.2em] text-cream/70">
                    Live update
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {combinedPantryItems.length > 0 ? (
                    combinedPantryItems.map((item) => (
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

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-ink">Pantry Quick-Select</p>
                  <p className="mt-1 text-sm leading-6 text-ink/65">
                    Tap common staples to add them before typing anything custom.
                  </p>
                </div>
                <div className="space-y-3">
                  {Object.entries(pantryQuickSelectOptions).map(([category, items]) => (
                    <div
                      key={category}
                      className={`rounded-3xl border p-4 ${pantryCategoryStyles[category] ?? "border-stone-200 bg-white"}`}
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-berry/70">
                        {category}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {items.map((item) => (
                          <button
                            key={item}
                            className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                              selectedQuickItems.has(item)
                                ? "border-orange-500 bg-orange-500 text-white"
                                : "border-white/80 bg-white text-ink hover:border-orange-300 hover:bg-orange-50"
                            }`}
                            onClick={() => toggleQuickItem(item)}
                            type="button"
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-ink">Pantry Check</span>
                <textarea
                  className="min-h-32 w-full rounded-3xl border border-ink/10 bg-white px-4 py-3 text-base text-ink outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-200"
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      pantryItems: event.target.value,
                    }))
                  }
                  placeholder="Type any additional ingredients you have that are not listed above (e.g., leftover chicken, half an onion)..."
                  value={formState.pantryItems}
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-ink">
                  Must-Have Ingredient (Optional)
                </span>
                <input
                  className="w-full rounded-full border border-ink/10 bg-white px-4 py-3 text-base text-ink outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-200"
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      mustHaveIngredient: event.target.value,
                    }))
                  }
                  placeholder="e.g., Chicken breast, heavy cream"
                  type="text"
                  value={formState.mustHaveIngredient}
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
                    formState.isBudgetTight ? "bg-pine" : "bg-ink/20"
                  }`}
                  onClick={() =>
                    setFormState((current) => ({
                      ...current,
                      isBudgetTight: !current.isBudgetTight,
                    }))
                  }
                  type="button"
                >
                  <span
                    className={`inline-block h-8 w-8 rounded-full bg-white shadow-md transition ${
                      formState.isBudgetTight ? "translate-x-11" : "translate-x-1"
                    }`}
                  />
                </button>
                <span className="min-w-10 text-right text-xs font-semibold uppercase tracking-[0.2em] text-ink/60">
                  {formState.isBudgetTight ? "ON" : "OFF"}
                </span>
              </div>

              <label className="flex items-center gap-3 rounded-[1.5rem] border border-pine/10 bg-cream px-4 py-4">
                <input
                  checked={formState.includeDessert}
                  className="h-4 w-4 rounded border-pine/30 text-pine focus:ring-pine"
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      includeDessert: event.target.checked,
                    }))
                  }
                  type="checkbox"
                />
                <span className="text-sm font-semibold text-ink">
                  Include a Weekly Dessert (If budget allows)
                </span>
              </label>

              {(validationError || requestError) && (
                <div className="rounded-2xl border border-berry/20 bg-berry/10 px-4 py-3 text-sm text-berry">
                  {validationError || requestError}
                </div>
              )}

              <button
                className="w-full rounded-full bg-orange-500 px-6 py-4 font-display text-lg text-white transition hover:-translate-y-0.5 hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isLoading || !isBudgetValid}
                type="submit"
              >
                {isLoading ? "Cooking up your plan..." : "Generate"}
              </button>
            </form>
          </div>
        </div>

        <section className="mt-10 space-y-6 pb-16">
          {generatedPlan ? (
            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-[2.25rem] border border-stone-200 bg-white/85 p-6 shadow-xl backdrop-blur">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="font-display text-3xl text-ink">Your 5-day plan</p>
                    <p className="mt-2 text-sm leading-6 text-ink/70">
                      These results are coming directly from <code>/api/generate-list</code>.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-pine px-4 py-3 text-cream">
                    <p className="text-xs uppercase tracking-[0.2em] text-cream/75">Estimated total</p>
                    <p className="font-display text-2xl">
                      {formatCurrency(generatedPlan.estimated_total_cost)}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {generatedPlan.meals.map((meal, index) => (
                    <article
                      key={`${meal.day}-${meal.name}-${index}`}
                      className="overflow-hidden rounded-3xl border border-stone-200 bg-[#fffdf9] shadow-xl"
                    >
                      <div className="relative h-48 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          alt={meal.name}
                          className="h-full w-full object-cover"
                          onError={(event) => {
                            event.currentTarget.onerror = null;
                            event.currentTarget.src = fallbackFoodImages[0];
                          }}
                          src={fallbackFoodImages[index % fallbackFoodImages.length]}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent" />
                        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cream/80">
                              {meal.day}
                            </p>
                            <h2 className="mt-2 font-display text-2xl text-white">
                              {meal.name}
                            </h2>
                          </div>
                          <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-semibold text-white backdrop-blur">
                            Serves {meal.servings}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-4 p-5">
                        <p className="text-sm leading-7 text-ink/75">{meal.notes}</p>
                        <div className="flex flex-wrap gap-3">
                          <button
                            className={`inline-flex items-center justify-center rounded-full px-4 py-3 text-sm font-semibold transition ${
                              savedMealKeys.has(`${meal.day}::${meal.name}`)
                                ? "bg-orange-500 text-white"
                                : "bg-orange-50 text-orange-700 hover:bg-orange-100"
                            }`}
                            onClick={() => handleSaveToWeeklyMenu(meal)}
                            type="button"
                          >
                            {savedMealKeys.has(`${meal.day}::${meal.name}`)
                              ? "♥ Saved"
                              : "♡ Save to Menu"}
                          </button>
                          <button
                            className="inline-flex items-center justify-center rounded-full bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={replacingMealKey === `${meal.day}::${meal.name}`}
                            onClick={() => handleReplaceMeal(meal, index)}
                            type="button"
                          >
                            {replacingMealKey === `${meal.day}::${meal.name}`
                              ? "Replacing..."
                              : "Replace"}
                          </button>
                          <button
                            className="inline-flex items-center justify-center rounded-full bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={
                              recipeLoadingMeal === meal.name ||
                              replacingMealKey === `${meal.day}::${meal.name}`
                            }
                            onClick={() => handleGetRecipe(meal)}
                            type="button"
                          >
                            {recipeLoadingMeal === meal.name
                              ? "Loading recipe..."
                              : "Get Recipe"}
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                <section className="mt-8 rounded-3xl border border-stone-200 bg-[#f8f4ec] p-5 shadow-xl">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-display text-2xl text-ink">Your Weekly Menu</p>
                      <p className="mt-1 text-sm leading-6 text-ink/70">
                        Save the dinners you want to keep in rotation this week.
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-pine">
                      {weeklyMenu.length} saved
                    </span>
                  </div>

                  {weeklyMenu.length > 0 ? (
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      {weeklyMenu.map((meal) => (
                        <article
                          key={`saved-${meal.day}-${meal.name}`}
                          className="rounded-3xl border border-stone-200 bg-white px-4 py-4 shadow-lg"
                        >
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-berry/70">
                            {meal.day}
                          </p>
                          <h3 className="mt-2 font-display text-xl text-ink">
                            {meal.name}
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-ink/70">
                            Serves {meal.servings}
                          </p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              className="inline-flex items-center justify-center rounded-full bg-orange-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                              disabled={recipeLoadingMeal === meal.name}
                              onClick={() => handleGetRecipe(meal)}
                              type="button"
                            >
                              {recipeLoadingMeal === meal.name
                                ? "Loading recipe..."
                                : "Get Recipe"}
                            </button>
                            <button
                              className="inline-flex items-center justify-center rounded-full bg-stone-100 px-3 py-2 text-sm font-semibold text-ink transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60"
                              disabled={recipeLoadingMeal === meal.name}
                              onClick={() => handleToggleIngredients(meal)}
                              type="button"
                            >
                              {expandedIngredientsMeals.has(`${meal.day}::${meal.name}`)
                                ? "Hide Ingredients"
                                : "View Ingredients"}
                            </button>
                          </div>
                          {expandedIngredientsMeals.has(`${meal.day}::${meal.name}`) &&
                            recipeCache[meal.name] && (
                              <div className="mt-4 rounded-[1rem] bg-cream px-3 py-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-berry/70">
                                  Ingredients
                                </p>
                                <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/75">
                                  {recipeCache[meal.name].ingredients.map((ingredient) => (
                                    <li key={`${meal.name}-${ingredient}`} className="flex gap-2">
                                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-berry" />
                                      <span>{ingredient}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-5 rounded-[1.25rem] border border-dashed border-pine/20 bg-white px-4 py-5 text-sm text-ink/60">
                      Tap the heart on any meal card to build your weekly menu.
                    </div>
                  )}
                </section>

                {generatedPlan.dessert && (
                  <section className="mt-6 rounded-[1.75rem] border border-rose-200 bg-rose-50 p-5 shadow-lg">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-berry/80">
                      Sweet Treat
                    </p>
                    <h3 className="mt-2 font-display text-2xl text-ink">
                      {generatedPlan.dessert.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-ink/80">
                      {generatedPlan.dessert.description}
                    </p>
                    <button
                      className="mt-4 inline-flex items-center justify-center rounded-full bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={recipeLoadingMeal === generatedPlan.dessert.title}
                      onClick={handleGetDessertRecipe}
                      type="button"
                    >
                      {recipeLoadingMeal === generatedPlan.dessert.title
                        ? "Loading recipe..."
                        : "Get Recipe"}
                    </button>
                  </section>
                )}
              </div>

              <aside className="rounded-[2.25rem] border border-stone-200 bg-[#faf7f1] p-6 shadow-xl">
                <p className="font-display text-3xl text-ink">Grocery list</p>
                <p className="mt-2 text-sm italic leading-6 text-gray-500">
                  Prices are AI-generated national averages for estimation. Actual costs may be
                  higher or lower depending on your location and local store.
                </p>

                <div className="mt-6 space-y-5">
                  {groceriesByCategory.map(([category, items]) => (
                    <section
                      key={category}
                      className="rounded-3xl border border-stone-200 bg-white p-4 shadow-lg"
                    >
                      <p className="font-display text-xl text-pine">{category}</p>
                      <ul className="mt-4 space-y-3">
                        {items.map((item) => (
                          <li
                            key={`${category}-${item.item}`}
                            className="flex items-center justify-between gap-4"
                          >
                            <label className="flex items-center gap-3">
                              <input
                                checked={checkedItems.has(`${category}-${item.item}`)}
                                className="h-4 w-4 rounded border-pine/30 text-pine focus:ring-pine"
                                onChange={() => toggleCheckedItem(`${category}-${item.item}`)}
                                type="checkbox"
                              />
                              <span
                                className={`text-sm font-medium text-ink ${
                                  checkedItems.has(`${category}-${item.item}`)
                                    ? "line-through opacity-60"
                                    : ""
                                }`}
                              >
                                {item.item}
                              </span>
                            </label>
                            <span className="text-sm font-semibold text-pine">
                              {formatCurrency(item.estimated_price)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>

                <div className="mt-6 rounded-[1.5rem] bg-apricot/15 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-berry/80">
                    Budget note
                  </p>
                  <p className="mt-2 text-sm leading-7 text-ink/80">
                    {generatedPlan.budget_summary}
                  </p>
                  {generatedPlan.upgrade_available && !hasAppliedUpgrades && (
                    <button
                      className="mt-4 inline-flex items-center justify-center rounded-full bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isLoading}
                      onClick={handleUpgradePlan}
                      type="button"
                    >
                      {isLoading
                        ? "Cooking up your plan..."
                        : "You have extra budget! Click to upgrade ingredients."}
                    </button>
                  )}
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <button
                    className="inline-flex items-center justify-center rounded-full bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
                    onClick={handleCopyShoppingList}
                    type="button"
                  >
                    Copy Shopping List
                  </button>
                  {copied && (
                    <span className="text-sm font-semibold text-pine">Copied!</span>
                  )}
                </div>
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

          <section className="rounded-[2.25rem] border border-stone-200 bg-white/80 p-6 shadow-xl backdrop-blur xl:p-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="font-display text-3xl text-ink">
                The Ultimate Grocery Map is Coming
              </p>
              <p className="mt-3 text-sm leading-7 text-ink/70 sm:text-base">
                We are building an advanced routing engine to scan local store shelves and find
                the absolute cheapest places to buy your AI meal plan. Join the waitlist for early
                access!
              </p>

              <form
                className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center"
                onSubmit={handleWaitlistSubmit}
              >
                <input
                  className="w-full rounded-full border border-ink/10 bg-white px-4 py-3 text-base text-ink outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-200 sm:max-w-md"
                  onChange={(event) => setWaitlistEmail(event.target.value)}
                  placeholder="Enter your email address*"
                  required
                  type="email"
                  value={waitlistEmail}
                />
                <button
                  className="rounded-full bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600"
                  type="submit"
                >
                  Join Waitlist
                </button>
              </form>
            </div>
          </section>
        </section>
      </section>

      {activeRecipeMeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/55 px-4 py-8 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-stone-200 bg-white p-6 shadow-xl sm:p-8">
            <button
              aria-label="Close recipe"
              className="absolute right-4 top-4 rounded-full border border-ink/10 bg-white px-3 py-2 text-sm font-semibold text-ink transition hover:bg-cream"
              onClick={() => {
                setActiveRecipeMeal(null);
                setRecipeError(null);
              }}
              type="button"
            >
              Close
            </button>

            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-berry/70">
              Recipe detail
            </p>
            <h3 className="mt-3 max-w-xl font-display text-3xl text-ink">
              {activeRecipeMeal.name}
            </h3>

            {recipeLoadingMeal === activeRecipeMeal.name && !activeRecipe ? (
              <div className="mt-6 rounded-[1.5rem] border border-pine/10 bg-cream px-5 py-6 text-sm text-ink/70">
                Building a fast, step-by-step recipe...
              </div>
            ) : recipeError ? (
              <div className="mt-6 rounded-[1.5rem] border border-berry/20 bg-berry/10 px-5 py-6 text-sm text-berry">
                {recipeError}
              </div>
            ) : activeRecipe ? (
              <div className="mt-6 space-y-6">
                <div className="rounded-[1.5rem] bg-pine px-5 py-4 text-cream">
                  <p className="text-xs uppercase tracking-[0.2em] text-cream/75">
                    Prep time
                  </p>
                  <p className="mt-2 font-display text-2xl">
                    {activeRecipe.prep_time_minutes} minutes
                  </p>
                </div>

                <div className="grid gap-6 md:grid-cols-[0.95fr_1.05fr]">
                  <section className="rounded-[1.5rem] border border-pine/10 bg-cream px-5 py-5">
                    <p className="font-display text-2xl text-pine">Ingredients</p>
                    <ul className="mt-4 space-y-3 text-sm leading-7 text-ink/80">
                      {activeRecipe.ingredients.map((ingredient) => (
                        <li key={ingredient} className="flex gap-3">
                          <span className="mt-2 h-2 w-2 rounded-full bg-berry" />
                          <span>{ingredient}</span>
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section className="rounded-[1.5rem] border border-ink/10 bg-[#fffaf4] px-5 py-5">
                    <p className="font-display text-2xl text-ink">Steps</p>
                    <ol className="mt-4 space-y-4 text-sm leading-7 text-ink/80">
                      {activeRecipe.steps.map((step, index) => (
                        <li
                          key={`${activeRecipe.title}-step-${index + 1}`}
                          className="flex gap-4"
                        >
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-apricot/20 text-xs font-semibold text-berry">
                            {index + 1}
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </section>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </main>
  );
}
