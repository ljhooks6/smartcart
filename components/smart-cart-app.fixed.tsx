"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type IngredientItem = {
  name: string;
  amount: string;
  price: number;
};

type MealPlanItem = {
  day: string;
  name: string;
  servings: number;
  notes: string;
  ingredients?: IngredientItem[];
  imageUrl?: string;
};

type GroceryListItem = {
  category: string;
  name: string;
  amount?: string;
  estimated_price: number;
};

type GenerateListResponse = {
  meals: MealPlanItem[];
  restock_items: GroceryListItem[];
  estimated_total_cost: number;
  budget_summary: string;
  upgrade_available: boolean;
  desserts: Array<{
    title: string;
    description: string;
    ingredients: IngredientItem[];
    imageUrl?: string;
  }>;
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

type ReplaceDessertResponse = {
  title: string;
  description: string;
  ingredients: IngredientItem[];
  imageUrl?: string;
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

const clearedFormState: FormState = {
  budget: "",
  diet: "",
  householdSize: "",
  pantryItems: "",
  mustHaveIngredient: "",
  includeDessert: false,
  prepTime: "Under 30 mins",
  adventureLevel: "Stick to basics",
  isBudgetTight: true,
};

const prepTimeOptions = ["Under 30 mins", "Under 1 hour", "No limit"] as const;
const adventureLevelOptions = [
  "Stick to basics",
  "Mix it up",
  "Try new cuisines",
] as const;

const pantryQuickSelectOptions = {
  "Proteins (Freezer & Fridge)": [
    "Chicken breast",
    "Chicken thighs",
    "Ground beef",
    "Steak",
    "Pork chops",
    "Ground turkey",
    "Bacon",
    "Shrimp",
    "Salmon",
    "Tofu",
  ],
  "DAIRY & REFRIGERATED": [
    "Milk",
    "Heavy cream",
    "Cheddar cheese",
    "Parmesan",
    "Mozzarella",
    "Yogurt",
    "Eggs",
    "Butter",
  ],
  "Oils & Condiments": [
    "Olive oil",
    "Vegetable oil",
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
  VEGETABLES: [
    "Onions",
    "Garlic cloves",
    "Potatoes",
    "Carrots",
    "Bell peppers",
    "Tomatoes",
    "Spinach",
    "Broccoli",
  ],
  FRUITS: [
    "Lemons",
    "Limes",
    "Apples",
    "Bananas",
    "Berries",
    "Avocados",
  ],
} as const;

const SMART_CART_FORM_STORAGE_KEY = "smartcart-smart-context-form";
const SMART_CART_WEEKLY_MENU_STORAGE_KEY = "smartcart-weekly-menu";
const SMART_CART_WAITLIST_ENDPOINT = "https://formspree.io/f/mqegdoly";
const featureDescriptions = {
  "Budget first":
    "Strictly enforces your weekly budget so you never overspend at the checkout.",
  "Pantry aware":
    "Uses your existing ingredients first to reduce waste and lower your grocery bill.",
  "Fast setup":
    "Skip the endless scrolling and get a personalized, 5-day dinner plan in seconds.",
} as const;
const pantryCategoryStyles: Record<string, string> = {
  "Proteins (Freezer & Fridge)": "border-rose-200 bg-rose-50",
  "DAIRY & REFRIGERATED": "border-cyan-200 bg-cyan-50",
  "Oils & Condiments": "border-orange-200 bg-orange-50",
  "Spices & Seasonings": "border-rose-200 bg-rose-50",
  "Baking Staples": "border-amber-200 bg-amber-50",
  "Canned & Jarred": "border-sky-200 bg-sky-50",
  "Grains & Carbs": "border-violet-200 bg-violet-50",
  VEGETABLES: "border-emerald-200 bg-emerald-50",
  FRUITS: "border-lime-200 bg-lime-50",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCardEyebrow(day: string) {
  return day.trim().toLowerCase().startsWith("sweet treat")
    ? "SWEET TREAT"
    : day;
}

function estimateRestockPrice(itemName: string) {
  const normalized = itemName.trim().toLowerCase();
  let estimate = 3;

  if (
    normalized.includes("steak") ||
    normalized.includes("salmon") ||
    normalized.includes("shrimp") ||
    normalized.includes("seafood")
  ) {
    estimate = 10;
  } else if (
    normalized.includes("chicken") ||
    normalized.includes("pork") ||
    normalized.includes("beef") ||
    normalized.includes("cheese")
  ) {
    estimate = 6;
  } else if (
    normalized.includes("oil") ||
    normalized.includes("sauce") ||
    normalized.includes("butter") ||
    normalized.includes("milk")
  ) {
    estimate = 4;
  } else if (
    normalized.includes("rice") ||
    normalized.includes("pasta") ||
    normalized.includes("beans") ||
    normalized.includes("carrots") ||
    normalized.includes("produce") ||
    normalized.includes("potatoes")
  ) {
    estimate = 2;
  }

  return Math.max(1, estimate);
}

function normalizeIngredientName(itemName: string) {
  return itemName.trim().toLowerCase();
}

function getAmountParts(amount: string) {
  const normalizedAmount = amount.trim().toLowerCase();
  const match = normalizedAmount.match(/^(\d+(?:\.\d+)?)\s*(.+)$/);

  if (!match) {
    return null;
  }

  return {
    value: Number(match[1]),
    unit: match[2].trim(),
  };
}

function mergeAmounts(baseAmount: string | undefined, nextAmount: string) {
  if (!baseAmount) {
    return nextAmount.trim();
  }

  const normalizedBase = baseAmount.trim();
  const normalizedNext = nextAmount.trim();
  const baseParts = getAmountParts(normalizedBase);
  const nextParts = getAmountParts(normalizedNext);

  if (!baseParts || !nextParts) {
    return normalizedBase === normalizedNext
      ? normalizedBase
      : `${normalizedBase} + ${normalizedNext}`;
  }

  if (baseParts.unit !== nextParts.unit) {
    return normalizedBase;
  }

  const totalValue = baseParts.value + nextParts.value;
  const displayValue = Number.isInteger(totalValue) ? totalValue : totalValue.toFixed(2);
  return `${displayValue} ${baseParts.unit}`;
}

function groupIngredientList(ingredients: IngredientItem[]) {
  const groupedItems = new Map<string, GroceryListItem>();

  ingredients.forEach((ingredient) => {
    const normalizedKey = normalizeIngredientName(ingredient.name);
    const existingItem = groupedItems.get(normalizedKey);
    const adjustedPrice = Math.max(1, Number(ingredient.price));

    if (!existingItem) {
      groupedItems.set(normalizedKey, {
        category: "Meal Ingredients",
        name: ingredient.name.trim(),
        amount: ingredient.amount.trim(),
        estimated_price: adjustedPrice,
      });
      return;
    }

    groupedItems.set(normalizedKey, {
      ...existingItem,
      amount: mergeAmounts(existingItem.amount, ingredient.amount),
      estimated_price: existingItem.estimated_price + adjustedPrice,
    });
  });

  return groupedItems;
}

export function SmartCartApp() {
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [cloudSyncMessage, setCloudSyncMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedPlan, setGeneratedPlan] =
    useState<GenerateListResponse | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [fullyStocked, setFullyStocked] = useState<Set<string>>(new Set());
  const [runningLow, setRunningLow] = useState<Set<string>>(new Set());
  const [restock, setRestock] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [hasAppliedUpgrades, setHasAppliedUpgrades] = useState(false);
  const [isPremiumMode, setIsPremiumMode] = useState(false);
  const [restoredItems, setRestoredItems] = useState<string[]>([]);
  const [customItems, setCustomItems] = useState<string[]>([]);
  const [newCustomItem, setNewCustomItem] = useState("");
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistStatus, setWaitlistStatus] = useState<
    "idle" | "submitting" | "success"
  >("idle");
  const [recipeCache, setRecipeCache] = useState<Record<string, RecipeResponse>>(
    {},
  );
  const [activeRecipeMeal, setActiveRecipeMeal] = useState<MealPlanItem | null>(
    null,
  );
  const [recipeError, setRecipeError] = useState<string | null>(null);
  const [recipeLoadingMeal, setRecipeLoadingMeal] = useState<string | null>(null);
  const [weeklyMenu, setWeeklyMenu] = useState<MealPlanItem[]>([]);
  const [savedDesserts, setSavedDesserts] = useState<MealPlanItem[]>([]);
  const [replacingMealKey, setReplacingMealKey] = useState<string | null>(null);
  const [replacingDessertKey, setReplacingDessertKey] = useState<string | null>(null);
  const [expandedIngredientsMeals, setExpandedIngredientsMeals] = useState<
    Set<string>
  >(new Set());
  const [expandedDetailCards, setExpandedDetailCards] = useState<Set<string>>(
    new Set(),
  );
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const [hiddenCardImages, setHiddenCardImages] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user?.id) {
        void loadSessionFromCloud(session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user?.id) {
        void loadSessionFromCloud(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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
        fullyStocked?: string[];
        runningLow?: string[];
        restock?: string[];
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

      if (parsed.fullyStocked || parsed.runningLow) {
        setFullyStocked(new Set(parsed.fullyStocked ?? []));
        setRunningLow(new Set());
        setRestock(new Set());
      } else {
        setFullyStocked(new Set(parsed.selectedQuickItems ?? []));
        setRunningLow(new Set());
        setRestock(new Set());
      }
    } catch {
      window.localStorage.removeItem(SMART_CART_FORM_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      SMART_CART_FORM_STORAGE_KEY,
      JSON.stringify({
        ...formState,
        fullyStocked: Array.from(fullyStocked),
        runningLow: Array.from(runningLow),
        restock: Array.from(restock),
      }),
    );
  }, [formState, fullyStocked, runningLow, restock]);

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

    return Array.from(
      new Set([
        ...Array.from(fullyStocked),
        ...typedItems,
      ]),
    );
  }, [formState.pantryItems, fullyStocked]);

  const { derivedGroceryList, skippedGroceryList } = useMemo(() => {
    const pantry = [...Array.from(fullyStocked), ...Array.from(runningLow)];

    // 1. Sanitize Pantry
    const validPantry = pantry
      .map((p) => p.toLowerCase().trim())
      .filter((p) => p.length > 2);

    // 2. Combine ALL saved items (Dinners + Desserts)
    const savedMeals = weeklyMenu;
    const allMeals = [...savedMeals, ...savedDesserts];
    const rawGroceryList: IngredientItem[] = [];
    const rawSkippedList: IngredientItem[] = [];

    // 3. The Strict 'NOT OWNED' Filter
    allMeals.forEach((meal) => {
      (meal.ingredients ?? []).forEach((ingredient) => {
        const ingName = ingredient.name.toLowerCase();
        const isForced = restoredItems.includes(ingredient.name);

        const isOwned = validPantry.some((pItem) => {
          const singularPItem = pItem.endsWith("s") ? pItem.slice(0, -1) : pItem;
          // Strict boundary check so "oil" doesn't match "foil"
          return ingName.includes(pItem) || ingName.includes(singularPItem);
        });

        if (!isOwned || isForced) {
          rawGroceryList.push(ingredient);
        } else {
          rawSkippedList.push(ingredient);
        }
      });
    });

    // 4. Aggregation (Optional but recommended)
    const groupedItems = groupIngredientList(rawGroceryList);
    const groupedSkippedItems = groupIngredientList(rawSkippedList);

    // 5. Clean Restock Append
    Array.from(restock).forEach((restockItem) => {
      const normalizedKey = normalizeIngredientName(restockItem);
      const restockPrice = Math.max(1, estimateRestockPrice(restockItem));
      const existingItem = groupedItems.get(normalizedKey);

      if (existingItem) {
        groupedItems.set(normalizedKey, {
          ...existingItem,
          name: `${existingItem.name.replace(/\s*\(Includes Restock\)$/i, "")} (Includes Restock)`,
          estimated_price: existingItem.estimated_price + restockPrice,
        });
        return;
      }

      groupedItems.set(normalizedKey, {
        category: "Restock",
        name: restockItem.trim(),
        amount: "1",
        estimated_price: restockPrice,
      });
    });

    return {
      derivedGroceryList: Array.from(groupedItems.values()),
      skippedGroceryList: Array.from(groupedSkippedItems.values()),
    };
  }, [fullyStocked, restock, restoredItems, runningLow, savedDesserts, weeklyMenu]);

  const groceriesByCategory = useMemo(() => {
    const grouped = derivedGroceryList.reduce<Record<string, GroceryListItem[]>>(
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
  }, [derivedGroceryList]);

  const displayGroceryList = useMemo(() => {
    if (!isPremiumMode) {
      return derivedGroceryList;
    }

    return derivedGroceryList.map((item) => {
      const lowerName = item.name.toLowerCase();
      let prefix = "Premium ";

      if (
        lowerName.includes("beef") ||
        lowerName.includes("chicken") ||
        lowerName.includes("turkey") ||
        lowerName.includes("pork") ||
        lowerName.includes("eggs")
      ) {
        prefix = "Organic Pasture-Raised ";
      } else if (
        lowerName.includes("milk") ||
        lowerName.includes("cheese") ||
        lowerName.includes("butter")
      ) {
        prefix = "Organic Grass-Fed ";
      } else if (
        lowerName.includes("pasta") ||
        lowerName.includes("rice") ||
        lowerName.includes("bread")
      ) {
        prefix = "Artisanal ";
      } else if (
        lowerName.includes("broccoli") ||
        lowerName.includes("spinach") ||
        lowerName.includes("tomatoes") ||
        lowerName.includes("apples") ||
        lowerName.includes("berries")
      ) {
        prefix = "Local Organic ";
      }

      return {
        ...item,
        name: `${prefix}${item.name}`,
        estimated_price: Number((item.estimated_price * 1.5).toFixed(2)),
      };
    });
  }, [derivedGroceryList, isPremiumMode]);

  const displayGroceriesByCategory = useMemo(() => {
    const grouped = displayGroceryList.reduce<Record<string, GroceryListItem[]>>(
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
  }, [displayGroceryList]);

  const skippedGroceriesByCategory = useMemo(() => {
    const grouped = skippedGroceryList.reduce<Record<string, GroceryListItem[]>>(
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
  }, [skippedGroceryList]);

  const shoppingListText = useMemo(() => {
    let listText = displayGroceriesByCategory
      .map(([category, items]) =>
        `${category}\n${items
          .map((item) => `- ${item.amount ? `${item.amount} ` : ""}${item.name} (${formatCurrency(item.estimated_price)})`)
          .join("\n")}`,
      )
      .join("\n\n");

    if (customItems.length > 0) {
      listText += "\n\nEXTRAS & HOUSEHOLD:\n";
      listText += customItems.map((item) => `- [ ] ${item}`).join("\n");
    }

    return listText;
  }, [customItems, displayGroceriesByCategory]);

  const activeRecipe = activeRecipeMeal
    ? recipeCache[activeRecipeMeal.name]
    : undefined;

  const savedMealKeys = useMemo(
    () => new Set(weeklyMenu.map((meal) => `${meal.day}::${meal.name}`)),
    [weeklyMenu],
  );
  const savedDessertKeys = useMemo(
    () => new Set(savedDesserts.map((dessert) => dessert.name)),
    [savedDesserts],
  );

  const parsedBudget = Number(formState.budget);
  const isBudgetValid =
    formState.budget.trim().length > 0 &&
    Number.isFinite(parsedBudget) &&
    parsedBudget > 0;
  const totalCost = useMemo(
    () =>
      displayGroceryList.reduce(
        (sum, item) => sum + item.estimated_price,
        0,
      ),
    [displayGroceryList],
  );
  const targetBudget = Math.max(parsedBudget || 0, 1);
  const rawBudgetPercentage = (totalCost / targetBudget) * 100;
  const budgetPercentage = Math.min(rawBudgetPercentage, 100);
  const budgetProgressBarClass =
    rawBudgetPercentage > 100
      ? "bg-red-500"
      : rawBudgetPercentage >= 80
        ? "bg-yellow-500"
        : "bg-green-500";
  const budgetStatusLabel =
    rawBudgetPercentage > 100
      ? "Over Budget"
      : rawBudgetPercentage >= 80
        ? "Nearing Limit"
        : "On Track";
  const budgetStatusTextClass =
    rawBudgetPercentage > 100
      ? "text-red-600"
      : rawBudgetPercentage >= 80
        ? "text-yellow-600"
        : "text-green-600";

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
          fullyStocked: Array.from(fullyStocked),
          runningLow: Array.from(runningLow),
          restock: Array.from(restock),
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
      setSavedDesserts([]);
      setRestoredItems([]);
      setExpandedDetailCards(new Set());
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
    const isFullyStocked = fullyStocked.has(item);

    setFullyStocked((current) => {
      const next = new Set(current);
      if (isFullyStocked) {
        next.delete(item);
      } else {
        next.add(item);
      }
      return next;
    });
    setRunningLow(new Set());
    setRestock(new Set());
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

  function handleUpgradePlan() {
    setIsPremiumMode((current) => !current);
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

  async function handleGetDessertRecipe(
    dessert: GenerateListResponse["desserts"][number],
    index: number,
  ) {
    const dessertMeal: MealPlanItem = {
      day: `Sweet Treat ${index + 1}`,
      name: dessert.title,
      servings: Number(formState.householdSize) || 2,
      notes: dessert.description,
      ingredients: dessert.ingredients,
      imageUrl: dessert.imageUrl,
    };

    await handleGetRecipe(dessertMeal);
  }

  async function handleReplaceDessert(
    dessert: GenerateListResponse["desserts"][number],
    index: number,
  ) {
    if (!generatedPlan) {
      return;
    }

    const dessertKey = `${dessert.title}-${index}`;
    setReplacingDessertKey(dessertKey);
    setRequestError(null);

    try {
      const response = await fetch("/api/replace-dessert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rejectedDessertTitle: dessert.title,
          budget: Number(formState.budget),
          diet: formState.diet.trim() || "No specific diet provided",
          householdSize: Number(formState.householdSize),
          combinedPantryItems: combinedPantryItems.join(", "),
        }),
      });

      const data = (await response.json()) as ReplaceDessertResponse & {
        error?: string;
      };

      if (!response.ok) {
        setRequestError(`Error ${response.status}: ${data.error || "Request failed."}`);
        return;
      }

      setGeneratedPlan((current) =>
        current
          ? {
              ...current,
              desserts: current.desserts.map((currentDessert, dessertIndex) =>
                dessertIndex === index
                  ? {
                      title: data.title,
                      description: data.description,
                      ingredients: data.ingredients,
                      imageUrl: data.imageUrl,
                    }
                  : currentDessert,
              ),
            }
          : current,
      );

      setSavedDesserts((current) =>
        current.map((savedDessert) =>
          savedDessert.name === dessert.title
            ? {
                ...savedDessert,
                day: `Sweet Treat ${index + 1}`,
                name: data.title,
                notes: data.description,
                ingredients: data.ingredients,
                imageUrl: data.imageUrl,
              }
            : savedDessert,
        ),
      );

      if (activeRecipeMeal?.name === dessert.title) {
        setActiveRecipeMeal({
          day: `Sweet Treat ${index + 1}`,
          name: data.title,
          servings: Number(formState.householdSize) || 2,
          notes: data.description,
          ingredients: data.ingredients,
          imageUrl: data.imageUrl,
        });
      }
    } catch (error) {
      setRequestError(
        error instanceof Error ? error.message : "Failed to replace dessert.",
      );
    } finally {
      setReplacingDessertKey(null);
    }
  }

  function handleSaveToWeeklyMenu(meal: MealPlanItem) {
    const mealKey = `${meal.day}::${meal.name}`;

    setWeeklyMenu((current) => {
      if (current.some((savedMeal) => `${savedMeal.day}::${savedMeal.name}` === mealKey)) {
        return current;
      }

      if (current.length >= 5) {
        return current;
      }

      return [...current, meal];
    });
  }

  function handleRemoveFromWeeklyMenu(meal: MealPlanItem) {
    const mealKey = `${meal.day}::${meal.name}`;

    setWeeklyMenu((current) =>
      current.filter(
        (savedMeal) => `${savedMeal.day}::${savedMeal.name}` !== mealKey,
      ),
    );
  }

  function handleToggleDessertSave(
    dessert: GenerateListResponse["desserts"][number],
    index: number,
  ) {
    const dessertMeal: MealPlanItem = {
      day: `Sweet Treat ${index + 1}`,
      name: dessert.title,
      servings: Number(formState.householdSize) || 2,
      notes: dessert.description,
      ingredients: dessert.ingredients,
      imageUrl: dessert.imageUrl,
    };

    setSavedDesserts((current) =>
      current.some((savedDessert) => savedDessert.name === dessert.title)
        ? current.filter((savedDessert) => savedDessert.name !== dessert.title)
        : [...current, dessertMeal],
    );
  }

  function handleToggleCardDetails(cardKey: string) {
    setExpandedDetailCards((current) => {
      const next = new Set(current);
      if (next.has(cardKey)) {
        next.delete(cardKey);
      } else {
        next.add(cardKey);
      }
      return next;
    });
  }

  function handleClearForm() {
    setFormState(clearedFormState);
    setValidationError(null);
    setRequestError(null);
    setIsLoading(false);
    setGeneratedPlan(null);
    setCheckedItems(new Set());
    setFullyStocked(new Set());
    setRunningLow(new Set());
    setRestock(new Set());
    setCopied(false);
    setHasAppliedUpgrades(false);
    setIsPremiumMode(false);
    setRestoredItems([]);
    setRecipeCache({});
    setActiveRecipeMeal(null);
    setRecipeError(null);
    setRecipeLoadingMeal(null);
    setWeeklyMenu([]);
    setSavedDesserts([]);
    setReplacingMealKey(null);
    setReplacingDessertKey(null);
    setExpandedIngredientsMeals(new Set());
    setExpandedDetailCards(new Set());

    window.localStorage.removeItem(SMART_CART_FORM_STORAGE_KEY);
    window.localStorage.removeItem(SMART_CART_WEEKLY_MENU_STORAGE_KEY);
  }

  function handleFeatureToggle(feature: keyof typeof featureDescriptions) {
    setActiveFeature((current) => (current === feature ? null : feature));
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsAuthLoading(true);
    setAuthMessage("");

    const { error } = await supabase.auth.signInWithOtp({ email });

    if (error) {
      setAuthMessage(error.message);
    } else {
      setAuthMessage("✨ Check your email for the magic link!");
    }

    setIsAuthLoading(false);
  }

  async function loadSessionFromCloud(userId: string) {
    try {
      const [{ data: pantryData, error: pantryError }, { data: menuData, error: menuError }] =
        await Promise.all([
          supabase
            .from("pantry_inventory")
            .select("ingredient_name, is_owned")
            .eq("user_id", userId),
          supabase
            .from("weekly_menus")
            .select("meal_title, type, status, recipe_data")
            .eq("user_id", userId)
            .eq("status", "active_week"),
        ]);

      if (pantryError) {
        throw pantryError;
      }

      if (menuError) {
        throw menuError;
      }

      const ownedPantryItems = (pantryData ?? [])
        .filter((item) => item.is_owned)
        .map((item) => item.ingredient_name.trim())
        .filter(Boolean);

      setFullyStocked(new Set(ownedPantryItems));
      setRunningLow(new Set());
      setRestock(new Set());
      setFormState((current) => ({
        ...current,
        pantryItems: "",
      }));

      const activeMenuRows = menuData ?? [];
      const hydratedDinners: MealPlanItem[] = activeMenuRows
        .filter((item) => item.type === "dinner")
        .map((item) => item.recipe_data as MealPlanItem)
        .filter(Boolean);

      const hydratedDessertRecipes = activeMenuRows
        .filter((item) => item.type === "sweet_treat")
        .map(
          (item) =>
            item.recipe_data as GenerateListResponse["desserts"][number],
        )
        .filter(Boolean);

      const hydratedDesserts: MealPlanItem[] = hydratedDessertRecipes.map(
        (dessert, index) => ({
          day: `Sweet Treat ${index + 1}`,
          name: dessert.title,
          servings: Number(formState.householdSize) || 2,
          notes: dessert.description,
          ingredients: dessert.ingredients,
          imageUrl: dessert.imageUrl,
        }),
      );

      setWeeklyMenu(hydratedDinners);
      setSavedDesserts(hydratedDesserts);

      if (hydratedDinners.length > 0 || hydratedDesserts.length > 0) {
        setGeneratedPlan({
          meals: hydratedDinners,
          restock_items: [],
          estimated_total_cost: 0,
          budget_summary: "Loaded from your saved cloud menu.",
          upgrade_available: false,
          desserts: hydratedDessertRecipes,
        });
      } else {
        setGeneratedPlan(null);
      }
    } catch (error) {
      setCloudSyncMessage(
        error instanceof Error ? error.message : "Failed to load cloud data.",
      );
    }
  }

  async function saveSessionToCloud() {
    if (!user) {
      return;
    }

    if (!generatedPlan) {
      setCloudSyncMessage("Generate a plan before saving it to the cloud.");
      return;
    }

    setIsSaving(true);
    setCloudSyncMessage("");

    try {
      const { error: archiveError } = await supabase
        .from("weekly_menus")
        .update({ status: "archived" })
        .eq("user_id", user.id)
        .eq("status", "active_week");

      if (archiveError) {
        throw archiveError;
      }

      const weeklyMenuRows = [
        ...generatedPlan.meals.map((meal) => ({
          meal_title: meal.name,
          recipe_data: meal,
          type: "dinner",
          status: "active_week",
          user_id: user.id,
        })),
        ...generatedPlan.desserts.map((dessert) => ({
          meal_title: dessert.title,
          recipe_data: dessert,
          type: "sweet_treat",
          status: "active_week",
          user_id: user.id,
        })),
      ];

      if (weeklyMenuRows.length > 0) {
        const { error: insertMenuError } = await supabase
          .from("weekly_menus")
          .insert(weeklyMenuRows);

        if (insertMenuError) {
          throw insertMenuError;
        }
      }

      const { error: deletePantryError } = await supabase
        .from("pantry_inventory")
        .delete()
        .eq("user_id", user.id);

      if (deletePantryError) {
        throw deletePantryError;
      }

      const pantryRows = combinedPantryItems.map((ingredient) => ({
        ingredient_name: ingredient,
        is_owned: true,
        user_id: user.id,
      }));

      if (pantryRows.length > 0) {
        const { error: insertPantryError } = await supabase
          .from("pantry_inventory")
          .insert(pantryRows);

        if (insertPantryError) {
          throw insertPantryError;
        }
      }

      setCloudSyncMessage("✨ Cloud sync complete! Your week is saved.");
    } catch (error) {
      setCloudSyncMessage(
        error instanceof Error ? error.message : "Cloud sync failed.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleWaitlistSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!waitlistEmail.trim()) {
      return;
    }

    setWaitlistStatus("submitting");

    try {
      const response = await fetch(SMART_CART_WAITLIST_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email: waitlistEmail.trim() }),
      });

      if (!response.ok) {
        throw new Error("Failed to join the waitlist.");
      }

      setWaitlistStatus("success");
      setWaitlistEmail("");
    } catch (error) {
      setWaitlistStatus("idle");
      setRequestError(
        error instanceof Error ? error.message : "Failed to join the waitlist.",
      );
    }
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
        ingredients: data.ingredients.map((ingredient) => ({
          name: ingredient,
          amount: "1 pack",
          price: Math.max(1, estimateRestockPrice(ingredient)),
        })),
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
    <main className="min-h-screen bg-gray-50 flex flex-col items-center py-8 px-4">
      <div className="w-full max-w-7xl mx-auto flex flex-col gap-8 font-body">
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
              {(Object.keys(featureDescriptions) as Array<
                keyof typeof featureDescriptions
              >).map((feature) => (
                <button
                  key={feature}
                  className={`rounded-3xl border p-4 text-left transition ${
                    activeFeature === feature
                      ? "border-orange-400 bg-orange-100 shadow-md"
                      : "border-pine/10 bg-cream hover:border-orange-300 hover:bg-orange-50"
                  }`}
                  onClick={() => handleFeatureToggle(feature)}
                  type="button"
                >
                  <p className="font-display text-3xl text-pine">{feature}</p>
                </button>
              ))}
            </div>

            <div
              className={`overflow-hidden rounded-3xl border border-stone-200 bg-white/80 px-5 py-4 text-sm leading-7 text-ink/75 transition-all ${
                activeFeature ? "max-h-40 opacity-100 shadow-md" : "max-h-0 border-transparent px-0 py-0 opacity-0"
              }`}
            >
              {activeFeature ? featureDescriptions[activeFeature as keyof typeof featureDescriptions] : null}
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
                  <div className="mb-4 space-y-2 rounded-md bg-gray-50 p-3 text-xs text-gray-700">
                    <p>
                      <strong>
                        <span
                          aria-hidden="true"
                          className="mr-1 inline-block h-4 w-4 rounded border border-green-800 bg-green-700 align-middle shadow-sm"
                        />
                        Clicked (Owned):
                      </strong>{" "}
                      You have a good amount. (App will <strong>SKIP</strong> buying this).
                    </p>
                    <p>
                      <strong>
                        <span
                          aria-hidden="true"
                          className="mr-1 inline-block h-4 w-4 rounded border border-gray-300 bg-white align-middle shadow-sm"
                        />
                        Unclicked (Need to Buy):
                      </strong>{" "}
                      Leave unclicked if you have none OR very little. (App will{" "}
                      <strong>ADD</strong> it to your list).
                    </p>
                  </div>
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
                        {items.map((item) => {
                          const isFullyStocked = fullyStocked.has(item);
                          const stateClass = isFullyStocked
                            ? "border-green-800 bg-green-700 text-white"
                            : "border-gray-300 bg-white text-ink hover:border-orange-300 hover:bg-orange-50";

                          return (
                            <button
                              key={item}
                              className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${stateClass}`}
                              onClick={() => toggleQuickItem(item)}
                              type="button"
                            >
                              {item}
                            </button>
                          );
                        })}
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
                  Include 2 Weekly Dessert Options (If budget allows)
                </span>
              </label>

              {(validationError || requestError) && (
                <div className="rounded-2xl border border-berry/20 bg-berry/10 px-4 py-3 text-sm text-berry">
                  {validationError || requestError}
                </div>
              )}

              <div className="flex items-center justify-between gap-4">
                <button
                  className="flex-1 rounded-full bg-orange-500 px-6 py-4 font-display text-lg text-white transition hover:-translate-y-0.5 hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isLoading || !isBudgetValid}
                  type="submit"
                >
                  {isLoading ? "Cooking up your plan..." : "Generate"}
                </button>
                <button
                  className="shrink-0 text-sm text-gray-500 underline decoration-gray-300 underline-offset-4 transition hover:text-red-500"
                  onClick={handleClearForm}
                  type="button"
                >
                  Clear Form
                </button>
              </div>
          </form>
        </div>

        <section className="mt-10 pb-16">
          {generatedPlan ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-8 flex flex-col gap-6">
                <div className="rounded-[2.25rem] border border-stone-200 bg-white/85 p-6 shadow-xl backdrop-blur">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="font-display text-3xl text-ink">Your 8 meal picks</p>
                    <p className="mt-2 text-sm italic leading-6 text-ink/70">
                      Images are dynamically sourced for visual inspiration and may not perfectly
                      reflect the specific AI-generated recipe.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-pine px-4 py-3 text-cream">
                    <p className="text-xs uppercase tracking-[0.2em] text-cream/75">Estimated total</p>
                    <p className="font-display text-2xl">
                      {formatCurrency(totalCost)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-[1.5rem] border border-sky-200 bg-sky-50 px-4 py-4 text-sm font-semibold text-sky-900 shadow-sm">
                  <span aria-hidden="true">🍽️ </span>
                  Build Your Menu: Pick up to 5 meals below and watch your grocery
                  list build in real-time!
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {generatedPlan.meals.map((meal, index) => {
                    const mealCardKey = `generated-${meal.day}::${meal.name}`;
                    const mealEyebrow = formatCardEyebrow(meal.day);
                    const showMealImage =
                      Boolean(meal.imageUrl?.trim()) &&
                      !hiddenCardImages.has(mealCardKey);

                    return (
                      <article
                        key={`${meal.day}-${meal.name}-${index}`}
                        className="overflow-hidden rounded-3xl border border-stone-200 bg-[#fffdf9] shadow-xl"
                      >
                        {showMealImage ? (
                          <div className="relative h-48 overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              alt={meal.name}
                              className="h-full w-full object-cover"
                              onError={() =>
                                setHiddenCardImages((current) =>
                                  new Set(current).add(mealCardKey),
                                )
                              }
                              src={meal.imageUrl}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent" />
                            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cream/80">
                                  {mealEyebrow}
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
                        ) : (
                          <div className="flex items-start justify-between gap-3 p-5 pb-0">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-berry/70">
                                {mealEyebrow}
                              </p>
                              <h2 className="mt-2 font-display text-2xl text-ink">
                                {meal.name}
                              </h2>
                            </div>
                            <span className="rounded-full bg-stone-100 px-3 py-1 text-sm font-semibold text-ink/80">
                              Serves {meal.servings}
                            </span>
                          </div>
                        )}

                        <div className="space-y-4 p-5">
                          {expandedDetailCards.has(mealCardKey) && (
                            <p className="text-sm leading-7 text-ink/75">{meal.notes}</p>
                          )}
                          <button
                            className="inline-flex items-center justify-center rounded-full bg-stone-100 px-4 py-3 text-sm font-semibold text-ink transition hover:bg-stone-200"
                            onClick={() => handleToggleCardDetails(mealCardKey)}
                            type="button"
                          >
                            {expandedDetailCards.has(mealCardKey)
                              ? "Hide Details"
                              : "Show Details"}
                          </button>
                          <div className="flex flex-wrap gap-3">
                            <button
                              className={`inline-flex items-center justify-center rounded-full px-4 py-3 text-sm font-semibold transition ${
                                savedMealKeys.has(`${meal.day}::${meal.name}`)
                                  ? "bg-orange-500 text-white"
                                  : weeklyMenu.length >= 5
                                    ? "bg-stone-100 text-stone-400"
                                    : "bg-orange-50 text-orange-700 hover:bg-orange-100"
                              }`}
                              disabled={
                                weeklyMenu.length >= 5 &&
                                !savedMealKeys.has(`${meal.day}::${meal.name}`)
                              }
                              onClick={() => handleSaveToWeeklyMenu(meal)}
                              type="button"
                            >
                              {savedMealKeys.has(`${meal.day}::${meal.name}`)
                                ? "Saved"
                                : weeklyMenu.length >= 5
                                  ? "Menu Full"
                                  : "Save to Menu"}
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
                    );
                  })}
                </div>
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
                            {formatCardEyebrow(meal.day)}
                          </p>
                          <h3 className="mt-2 font-display text-xl text-ink">
                            {meal.name}
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-ink/70">
                            Serves {meal.servings}
                          </p>
                          {expandedDetailCards.has(`saved-${meal.day}::${meal.name}`) && (
                            <p className="mt-3 text-sm leading-7 text-ink/75">{meal.notes}</p>
                          )}
                          <button
                            className="mt-4 inline-flex items-center justify-center rounded-full bg-stone-100 px-3 py-2 text-sm font-semibold text-ink transition hover:bg-orange-50"
                            onClick={() =>
                              handleToggleCardDetails(`saved-${meal.day}::${meal.name}`)
                            }
                            type="button"
                          >
                            {expandedDetailCards.has(`saved-${meal.day}::${meal.name}`)
                              ? "Hide Details"
                              : "Show Details"}
                          </button>
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
                            <button
                              className="inline-flex items-center justify-center rounded-full px-3 py-2 text-sm font-semibold text-red-500 transition hover:bg-red-50 hover:text-red-600"
                              onClick={() => handleRemoveFromWeeklyMenu(meal)}
                              type="button"
                            >
                              Remove
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

                {generatedPlan.desserts.length > 0 && (
                  <section className="mt-6 rounded-[1.75rem] border border-rose-200 bg-rose-50 p-5 shadow-lg">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-berry/80">
                      Sweet Treat
                    </p>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      {generatedPlan.desserts.map((dessert, index) => {
                        const dessertCardKey = `dessert-${dessert.title}-${index}`;
                        const isDessertSaved = savedDessertKeys.has(dessert.title);
                        const isReplacingThisDessert =
                          replacingDessertKey === `${dessert.title}-${index}`;
                        const showDessertImage =
                          Boolean(dessert.imageUrl?.trim()) &&
                          !hiddenCardImages.has(dessertCardKey);

                        return (
                          <article
                            key={dessertCardKey}
                            className="overflow-hidden rounded-[1.5rem] border border-rose-200 bg-white p-4 shadow-md"
                          >
                            {showDessertImage ? (
                              <div className="overflow-hidden rounded-[1.25rem]">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  alt={dessert.title}
                                  className="h-48 w-full rounded-[1.25rem] object-cover"
                                  onError={() =>
                                    setHiddenCardImages((current) =>
                                      new Set(current).add(dessertCardKey),
                                    )
                                  }
                                  src={dessert.imageUrl}
                                />
                              </div>
                            ) : null}
                            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.25em] text-berry/70">
                              SWEET TREAT
                            </p>
                            <h3 className="mt-3 font-display text-2xl text-ink">
                              {dessert.title}
                            </h3>
                            {expandedDetailCards.has(dessertCardKey) && (
                              <p className="mt-3 text-sm leading-7 text-ink/80">
                                {dessert.description}
                              </p>
                            )}
                            <button
                              className="mt-4 inline-flex items-center justify-center rounded-full bg-stone-100 px-4 py-3 text-sm font-semibold text-ink transition hover:bg-stone-200"
                              onClick={() => handleToggleCardDetails(dessertCardKey)}
                              type="button"
                            >
                              {expandedDetailCards.has(dessertCardKey)
                                ? "Hide Details"
                                : "Show Details"}
                            </button>
                            <button
                              className="mt-4 ml-3 inline-flex items-center justify-center rounded-full bg-stone-100 px-4 py-3 text-sm font-semibold text-ink transition hover:bg-orange-50"
                              onClick={() =>
                                handleToggleIngredients({
                                  day: `Sweet Treat ${index + 1}`,
                                  name: dessert.title,
                                  servings: Number(formState.householdSize) || 2,
                                  notes: dessert.description,
                                  ingredients: dessert.ingredients,
                                  imageUrl: dessert.imageUrl,
                                })
                              }
                              type="button"
                            >
                              {expandedIngredientsMeals.has(`Sweet Treat ${index + 1}::${dessert.title}`)
                                ? "Hide Ingredients"
                                : "View Ingredients"}
                            </button>
                            {expandedIngredientsMeals.has(
                              `Sweet Treat ${index + 1}::${dessert.title}`,
                            ) && (
                              <div className="mt-4 w-full rounded-[1rem] bg-cream px-3 py-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-berry/70">
                                  Ingredients
                                </p>
                                <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/75">
                                  {dessert.ingredients.map((ingredient) => (
                                    <li
                                      key={`${dessert.title}-${ingredient.name}-${ingredient.amount}`}
                                      className="flex gap-2"
                                    >
                                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-berry" />
                                      <span>
                                        {ingredient.amount} {ingredient.name}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            <div className="mt-4 flex flex-wrap gap-3">
                              <button
                                className={`inline-flex items-center justify-center rounded-full px-4 py-3 text-sm font-semibold transition ${
                                  isDessertSaved
                                    ? "bg-orange-500 text-white"
                                    : "bg-orange-50 text-orange-700 hover:bg-orange-100"
                                }`}
                                onClick={() => handleToggleDessertSave(dessert, index)}
                                type="button"
                              >
                                {isDessertSaved ? "Remove" : "Save Dessert to Menu"}
                              </button>
                              <button
                                className="inline-flex items-center justify-center rounded-full bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={
                                  recipeLoadingMeal === dessert.title ||
                                  isReplacingThisDessert
                                }
                                onClick={() => handleGetDessertRecipe(dessert, index)}
                                type="button"
                              >
                                {recipeLoadingMeal === dessert.title
                                  ? "Loading recipe..."
                                  : "Get Recipe"}
                              </button>
                              <button
                                className="inline-flex items-center justify-center rounded-full bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={isReplacingThisDessert}
                                onClick={() => handleReplaceDessert(dessert, index)}
                                type="button"
                              >
                                {isReplacingThisDessert ? "Replacing..." : "Replace"}
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                )}
              </div>

              <div className="lg:col-span-4 sticky top-4">
                <aside className="rounded-[2.25rem] border border-stone-200 bg-[#faf7f1] p-6 shadow-xl">
                <p className="font-display text-3xl text-ink">Grocery list</p>
                <p className="mt-2 text-sm italic leading-6 text-gray-500">
                  Prices are AI-generated national averages for estimation. Actual costs may be
                  higher or lower depending on your location and local store.
                </p>
                <p className="mb-4 mt-2 text-xs italic text-gray-500">
                  *Note: Quantities reflect the exact amount needed for your selected meals. Buy
                  the standard package size available at your store.*
                </p>

                <div className="mt-6 space-y-5">
                  {displayGroceriesByCategory.map(([category, items]) => (
                    <section
                      key={category}
                      className="rounded-3xl border border-stone-200 bg-white p-4 shadow-lg"
                    >
                      <p className="font-display text-xl text-pine">{category}</p>
                      <ul className="mt-4 space-y-3">
                        {items.map((item) => {
                          const isRestock = item.name.includes("(Includes Restock)");
                          const bellPepperPattern = /bell pepper/i;
                          const bellPepperColorPattern = /\b(red|green|yellow|orange)\b/i;
                          const trimmedName = item.name.trim();
                          const isRestoredItem = restoredItems.includes(item.name);
                          const displayName =
                            bellPepperPattern.test(trimmedName) &&
                            !bellPepperColorPattern.test(trimmedName)
                              ? `${trimmedName} (Any color)`
                              : trimmedName;

                          return (
                            <li
                              key={`${category}-${item.name}`}
                              className="flex items-center justify-between gap-4"
                            >
                              <label className="flex items-start gap-3">
                                <input
                                  checked={checkedItems.has(`${category}-${item.name}`)}
                                  className="mt-0.5 h-4 w-4 rounded border-pine/30 text-pine focus:ring-pine"
                                  onChange={() => toggleCheckedItem(`${category}-${item.name}`)}
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
                                    {item.amount && (
                                      <span className="font-semibold text-ink">
                                        {item.amount}
                                      </span>
                                    )}
                                    <span>{displayName}</span>
                                    {isRestock && (
                                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-700">
                                        Restock
                                      </span>
                                    )}
                                    {isRestoredItem && (
                                      <button
                                        className="text-xs font-semibold text-red-400 transition hover:text-red-500"
                                        onClick={() =>
                                          setRestoredItems((current) =>
                                            current.filter((name) => name !== item.name),
                                          )
                                        }
                                        type="button"
                                      >
                                        - Remove
                                      </button>
                                    )}
                                  </span>
                                </span>
                              </label>
                              <span className="text-sm font-semibold text-pine">
                                {formatCurrency(item.estimated_price)}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  ))}
                </div>

                {skippedGroceriesByCategory.length > 0 && (
                  <div className="mt-6 border-t border-stone-200 pt-6">
                    <h4 className="mb-2 mt-6 text-sm font-bold uppercase text-gray-500">
                      Skipped (In Your Pantry)
                    </h4>
                    <div className="my-3 border-l-4 border-blue-500 bg-blue-50 p-3 text-xs text-blue-900">
                      <strong>
                        <span aria-hidden="true">{"⚠️ "}</span>
                        Double-Check Your Kitchen!
                      </strong>{" "}
                      We skipped buying these items
                      because you marked them as owned. The amounts listed below are exactly what
                      you need to cook your selected meals. If your current stash is smaller than
                      the amount shown, click <strong>[+ Add Back]</strong> so you don&apos;t run
                      out!
                    </div>
                    <div className="space-y-4">
                      {skippedGroceriesByCategory.map(([category, items]) => (
                        <section key={`skipped-${category}`}>
                          <p className="text-sm font-semibold text-gray-400">{category}</p>
                          <ul className="mt-3 space-y-3">
                            {items.map((item) => (
                              <li
                                key={`skipped-${category}-${item.name}`}
                                className="flex items-center justify-between gap-4 text-gray-400"
                              >
                                <span className="flex items-center gap-2 text-sm">
                                  {item.amount && <span className="font-medium">{item.amount}</span>}
                                  <span>{item.name}</span>
                                </span>
                                <button
                                  className="text-xs font-semibold text-orange-500 transition hover:text-orange-600"
                                  onClick={() =>
                                    setRestoredItems((current) =>
                                      current.includes(item.name)
                                        ? current
                                        : [...current, item.name],
                                    )
                                  }
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
                          key={`custom-${item}`}
                          className="flex items-center justify-between gap-4 text-sm text-ink/75"
                        >
                          <span>{item}</span>
                          <button
                            className="text-xs font-semibold text-red-400 transition hover:text-red-500"
                            onClick={() =>
                              setCustomItems((current) =>
                                current.filter((currentItem) => currentItem !== item),
                              )
                            }
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
                      type="text"
                      value={newCustomItem}
                      onChange={(e) => setNewCustomItem(e.target.value)}
                      placeholder="Add snacks, paper towels..."
                      className="flex-1 rounded border px-2 py-1 text-sm"
                    />
                    <button
                      onClick={() => {
                        if (newCustomItem.trim()) {
                          setCustomItems([...customItems, newCustomItem.trim()]);
                          setNewCustomItem("");
                        }
                      }}
                      className="rounded bg-gray-200 px-3 py-1 text-sm font-medium"
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
                  <div className="mt-4 w-full h-4 overflow-hidden rounded-full bg-gray-200">
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
                    onClick={() => setIsPremiumMode(!isPremiumMode)}
                    className="mb-2 w-full rounded-md bg-orange-100 px-4 py-3 font-bold text-orange-700"
                    type="button"
                  >
                    {isPremiumMode ? (
                      <>
                        <span aria-hidden="true">{"↩ "}</span>
                        Revert to Standard
                      </>
                    ) : (
                      <>
                        <span aria-hidden="true">{"✨ "}</span>
                        Upgrade to Premium Ingredients
                      </>
                    )}
                  </button>
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

                <div className="mt-5 rounded-[1.5rem] border border-stone-200 bg-white px-4 py-4 shadow-sm">
                  {!user ? (
                    <>
                      <h4 className="font-display text-xl text-ink">
                        Save your pantry &amp; settings for next week
                      </h4>
                      <p className="mt-2 text-sm leading-6 text-ink/70">
                        Drop in your email and we&apos;ll send a magic link so you can come back
                        to SmartCart without creating a password.
                      </p>
                      <form className="mt-4 space-y-3" onSubmit={handleLogin}>
                        <input
                          className="w-full rounded-full border border-ink/10 bg-white px-4 py-3 text-base text-ink outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-200"
                          onChange={(event) => setEmail(event.target.value)}
                          placeholder="Enter your email"
                          type="email"
                          value={email}
                        />
                        <button
                          className="w-full rounded-full bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={isAuthLoading}
                          type="submit"
                        >
                          {isAuthLoading ? "Sending magic link..." : "Send Magic Link"}
                        </button>
                      </form>
                      {authMessage ? (
                        <p className="mt-3 text-sm font-medium text-ink/70">{authMessage}</p>
                      ) : null}
                    </>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h4 className="font-display text-xl text-ink">
                            Save your pantry &amp; settings for next week
                          </h4>
                          <p className="mt-2 text-sm leading-6 text-ink/70">
                            Signed in as: {user.email}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            className="rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={isSaving}
                            onClick={saveSessionToCloud}
                            type="button"
                          >
                            {isSaving
                              ? "Saving..."
                              : "💾 Save This Week's Menu & Pantry"}
                          </button>
                          <button
                            className="rounded-full border border-stone-200 px-4 py-2 text-sm font-semibold text-ink transition hover:bg-stone-100"
                            onClick={() => supabase.auth.signOut()}
                            type="button"
                          >
                            Sign Out
                          </button>
                        </div>
                      </div>
                      {cloudSyncMessage ? (
                        <p className="mt-3 text-sm font-medium text-ink/70">
                          {cloudSyncMessage}
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>
                </aside>
              </div>
            </div>
          ) : (
            <div className="rounded-[2rem] border border-dashed border-pine/20 bg-white/40 p-10 text-center text-ink/60">
              <p className="font-display text-2xl text-ink">Your generated plan will appear here</p>
              <p className="mt-3 text-sm leading-7">
                Select your preferences and pantry items above to get started.
              </p>
            </div>
          )}

          <section className="mt-6 rounded-[2.25rem] border border-stone-200 bg-white/80 p-6 shadow-xl backdrop-blur xl:p-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="font-display text-3xl text-ink">
                The Ultimate Grocery Map is Coming
              </p>
              <p className="mt-3 text-sm leading-7 text-ink/70 sm:text-base">
                We are building an advanced routing engine to scan local store shelves and find
                the absolute cheapest places to buy your AI meal plan. Join the waitlist for early
                access!
              </p>

              {waitlistStatus === "success" ? (
                <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-800">
                  Thanks for joining! You are now a part of something fantastic! Phase 2 coming
                  soon!
                </div>
              ) : (
                <form
                  className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center"
                  onSubmit={handleWaitlistSubmit}
                >
                  <input
                    className="w-full rounded-full border border-ink/10 bg-white px-4 py-3 text-base text-ink outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-200 sm:max-w-md"
                    name="email"
                    onChange={(event) => setWaitlistEmail(event.target.value)}
                    placeholder="Enter your email address*"
                    required
                    type="email"
                    value={waitlistEmail}
                  />
                  <button
                    className="rounded-full bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={waitlistStatus === "submitting"}
                    type="submit"
                  >
                    {waitlistStatus === "submitting" ? "Joining..." : "Join Waitlist"}
                  </button>
                </form>
              )}
            </div>
          </section>
        </section>
      </div>

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



