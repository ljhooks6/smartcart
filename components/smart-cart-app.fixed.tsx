"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { SmartCartContextForm } from "./smart-cart-context-form";
import { SmartCartGrocerySidebar } from "./smart-cart-grocery-sidebar";
import { SmartCartHeroHeader } from "./smart-cart-hero-header";
import { SmartCartLibrarySections } from "./smart-cart-library-sections";
import { SmartCartMealSections } from "./smart-cart-meal-sections";
import {
  clearStoredJson,
  fetchArchivedMealRows,
  fetchOwnedPantryItems,
  fetchSavedMealRows,
  replaceActiveWeeklyMenuRows,
  replacePantryInventory,
  saveStoredJson,
  SMART_CART_FORM_STORAGE_KEY,
  SMART_CART_GENERATED_PLAN_STORAGE_KEY,
  SMART_CART_SAVED_DESSERTS_STORAGE_KEY,
  SMART_CART_WEEKLY_MENU_STORAGE_KEY,
  type SmartCartArchivedMealRow,
  type SmartCartSavedMealRow,
  loadStoredJson,
} from "../lib/smart-cart-persistence";

type IngredientItem = {
  name: string;
  amount: string;
  price?: number;
  checked?: boolean;
  skipped?: boolean;
};

type MealPlanItem = {
  dbId?: number | string;
  user_id: string;
  day: string;
  name: string;
  servings: number;
  notes: string;
  ingredients?: IngredientItem[];
  instructions?: string[];
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

type CustomItem = {
  id: string;
  name: string;
  isChecked: boolean;
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
  availableEquipment: string[];
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
  availableEquipment: ["Oven", "Stovetop", "Microwave"],
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
  availableEquipment: ["Oven", "Stovetop", "Microwave"],
};

const prepTimeOptions = ["Under 30 mins", "Under 1 hour", "No limit"] as const;
const adventureLevelOptions = [
  "Stick to basics",
  "Mix it up",
  "Try new cuisines",
] as const;
const equipmentOptions = [
  "Oven",
  "Stovetop",
  "Microwave",
  "Grill",
  "Air Fryer",
  "Slow Cooker",
  "Blender",
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

const safeTrim = (val: any) => (typeof val === "string" ? val.trim() : "");

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCardEyebrow(day: string) {
  return safeTrim(day).toLowerCase().startsWith("sweet treat")
    ? "SWEET TREAT"
    : safeTrim(day);
}

function getMealEstimatedPrice(meal: MealPlanItem) {
  return (meal.ingredients ?? []).reduce((sum, ingredient) => {
    const price = typeof ingredient?.price === "number" ? ingredient.price : 0;
    return sum + price;
  }, 0);
}

function isSweetTreatMeal(meal: MealPlanItem) {
  return safeTrim(meal.day).toLowerCase().startsWith("sweet treat");
}

function estimateRestockPrice(itemName: string) {
  const normalized = safeTrim(itemName).toLowerCase();
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
  return safeTrim(itemName).toLowerCase();
}

function getAmountParts(amount: string) {
  const normalizedAmount = safeTrim(amount).toLowerCase();
  const match = normalizedAmount.match(/^(\d+(?:\.\d+)?)\s*(.+)$/);

  if (!match) {
    return null;
  }

  return {
    value: Number(match[1]),
    unit: safeTrim(match[2]),
  };
}

function mergeAmounts(baseAmount: string | undefined, nextAmount: string) {
  if (!baseAmount) {
    return safeTrim(nextAmount);
  }

  const normalizedBase = safeTrim(baseAmount);
  const normalizedNext = safeTrim(nextAmount);
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
  const [isGroceryOpen, setIsGroceryOpen] = useState(false);
  const [isPantryOpen, setIsPantryOpen] = useState(false);
  const [isPantrySelectionOpen, setIsPantrySelectionOpen] = useState(false);
  const [restoredItems, setRestoredItems] = useState<string[]>([]);
  const [customItems, setCustomItems] = useState<CustomItem[]>([]);
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
  const [archivedMeals, setArchivedMeals] = useState<MealPlanItem[]>([]);
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [replacingMealKey, setReplacingMealKey] = useState<string | null>(null);
  const [replacingDessertKey, setReplacingDessertKey] = useState<string | null>(null);
  const [expandedIngredientsMeals, setExpandedIngredientsMeals] = useState<
    Set<string>
  >(new Set());
  const [expandedDetailCards, setExpandedDetailCards] = useState<Set<string>>(
    new Set(),
  );
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const [hasLoadedGeneratedPlan, setHasLoadedGeneratedPlan] = useState(false);

  const persistGeneratedPlan = useCallback((plan: GenerateListResponse | null) => {
    if (!plan) {
      clearStoredJson(SMART_CART_GENERATED_PLAN_STORAGE_KEY);
      return;
    }

    saveStoredJson(SMART_CART_GENERATED_PLAN_STORAGE_KEY, plan);
  }, []);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        setUser(session?.user ?? null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    try {
      const parsed = loadStoredJson<
        Partial<FormState> & {
          selectedQuickItems?: string[];
          fullyStocked?: string[];
          runningLow?: string[];
          restock?: string[];
        }
      >(SMART_CART_FORM_STORAGE_KEY);

      if (!parsed) {
        return;
      }

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
        availableEquipment:
          parsed.availableEquipment ?? current.availableEquipment,
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
      clearStoredJson(SMART_CART_FORM_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    saveStoredJson(
      SMART_CART_FORM_STORAGE_KEY,
      {
        ...formState,
        fullyStocked: Array.from(fullyStocked),
        runningLow: Array.from(runningLow),
        restock: Array.from(restock),
      },
    );
  }, [formState, fullyStocked, runningLow, restock]);

  useEffect(() => {
    try {
      const parsed = loadStoredJson<MealPlanItem[]>(
        SMART_CART_WEEKLY_MENU_STORAGE_KEY,
      );

      if (!parsed || !Array.isArray(parsed)) {
        return;
      }
      setWeeklyMenu(parsed);
    } catch {
      clearStoredJson(SMART_CART_WEEKLY_MENU_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    saveStoredJson(SMART_CART_WEEKLY_MENU_STORAGE_KEY, weeklyMenu);
  }, [weeklyMenu]);

  useEffect(() => {
    try {
      const parsed = loadStoredJson<MealPlanItem[]>(
        SMART_CART_SAVED_DESSERTS_STORAGE_KEY,
      );

      if (!parsed || !Array.isArray(parsed)) {
        return;
      }
      setSavedDesserts(parsed);
    } catch {
      clearStoredJson(SMART_CART_SAVED_DESSERTS_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    saveStoredJson(SMART_CART_SAVED_DESSERTS_STORAGE_KEY, savedDesserts);
  }, [savedDesserts]);

  useEffect(() => {
    try {
      const parsed = loadStoredJson<GenerateListResponse | null>(
        SMART_CART_GENERATED_PLAN_STORAGE_KEY,
      );

      if (!parsed || typeof parsed !== "object") {
        return;
      }
      setGeneratedPlan(parsed);
    } catch {
      clearStoredJson(SMART_CART_GENERATED_PLAN_STORAGE_KEY);
    } finally {
      setHasLoadedGeneratedPlan(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedGeneratedPlan) {
      return;
    }

    persistGeneratedPlan(generatedPlan);
  }, [generatedPlan, hasLoadedGeneratedPlan, persistGeneratedPlan]);

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
      .filter((item) => typeof item === "string")
      .map((item) => safeTrim(item))
      .filter(Boolean);

    return Array.from(
      new Set([
        ...Array.from(fullyStocked),
        ...typedItems,
      ]),
    );
  }, [formState.pantryItems, fullyStocked]);

  const selectedPantryItems = useMemo(
    () => Array.from(fullyStocked).map((item) => safeTrim(item)).filter(Boolean),
    [fullyStocked],
  );

  const { derivedGroceryList, skippedGroceryList } = useMemo(() => {
    const pantry = [...Array.from(fullyStocked), ...Array.from(runningLow)];

    // 1. Sanitize Pantry
    const validPantry = pantry
      .filter((p) => typeof p === "string")
      .map((p) => safeTrim(p).toLowerCase())
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

    const directGroceryList: GroceryListItem[] = rawGroceryList.map((ingredient) => ({
      category: "Meal Ingredients",
      name: safeTrim(ingredient.name),
      amount: safeTrim(ingredient.amount),
      estimated_price: Math.max(1, Number(ingredient.price ?? 0)),
    }));

    const directSkippedList: GroceryListItem[] = rawSkippedList.map((ingredient) => ({
      category: "Meal Ingredients",
      name: safeTrim(ingredient.name),
      amount: safeTrim(ingredient.amount),
      estimated_price: Math.max(1, Number(ingredient.price ?? 0)),
    }));

    const restockItems: GroceryListItem[] = Array.from(restock).map((restockItem) => ({
      category: "Restock",
      name: safeTrim(restockItem),
      amount: "1",
      estimated_price: Math.max(1, estimateRestockPrice(restockItem)),
    }));

    return {
      derivedGroceryList: [...directGroceryList, ...restockItems],
      skippedGroceryList: directSkippedList,
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
      listText += customItems
        .map((item) => `- [${item.isChecked ? "x" : " "}] ${item.name}`)
        .join("\n");
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
  const existingMealTitles = useMemo(
    () =>
      [...(generatedPlan?.meals ?? []), ...weeklyMenu]
        .map((meal) => meal?.name || "")
        .filter(Boolean)
        .join(", "),
    [generatedPlan?.meals, weeklyMenu],
  );

  const parsedBudget = Number(formState.budget);
  const isBudgetValid =
    safeTrim(formState.budget).length > 0 &&
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
          diet: safeTrim(formState.diet) || "No specific diet provided",
          householdSize,
          combinedPantryItems: combinedPantryItems.join(", "),
          fullyStocked: Array.from(fullyStocked),
          runningLow: Array.from(runningLow),
          restock: Array.from(restock),
          mustHaveIngredient: safeTrim(formState.mustHaveIngredient),
          includeDessert: formState.includeDessert,
          adventureLevel: formState.adventureLevel,
          budgetTightness: formState.isBudgetTight,
          availableEquipment: formState.availableEquipment,
          apply_upgrades: applyUpgrades,
          existingMeals: existingMealTitles,
        }),
      });

      const data = (await response.json()) as GenerateListResponse & {
        error?: string;
      };

      if (!response.ok) {
        setGeneratedPlan(null);
        persistGeneratedPlan(null);
        setRequestError(`Error ${response.status}: ${data.error || "Request failed."}`);
        return;
      }
      setGeneratedPlan(data);
      persistGeneratedPlan(data);
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
      persistGeneratedPlan(null);
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
      user_id: safeTrim(user?.id),
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
          diet: safeTrim(formState.diet) || "No specific diet provided",
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

      setGeneratedPlan((current) => {
        if (!current) {
          return current;
        }

        const nextPlan = {
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
        };

        persistGeneratedPlan(nextPlan);
        return nextPlan;
      });

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
          user_id: safeTrim(user?.id),
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

    setGeneratedPlan((current) =>
      current
        ? {
            ...current,
            meals: current.meals.filter(
              (generatedMeal) =>
                `${generatedMeal.day}::${generatedMeal.name}` !== mealKey,
            ),
          }
        : current,
    );
    persistGeneratedPlan(
      generatedPlan
        ? {
            ...generatedPlan,
            meals: generatedPlan.meals.filter(
              (generatedMeal) =>
                `${generatedMeal.day}::${generatedMeal.name}` !== mealKey,
            ),
          }
        : null,
    );
  }

  async function handleArchiveMeal(meal: MealPlanItem) {
    const userId = user?.id || "";
    if (!userId) {
      alert("Please sign in before using the Recipe Vault.");
      return;
    }

    const mealMatcher = (candidate: MealPlanItem) =>
      meal.dbId
        ? candidate.dbId === meal.dbId
        : candidate.name === meal.name;

    const rawPrice = (meal as { price?: string | number }).price;
    const cleanPrice =
      typeof rawPrice === "string"
        ? parseFloat(rawPrice.replace(/[^0-9.]/g, ""))
        : typeof rawPrice === "number"
          ? rawPrice
          : getMealEstimatedPrice(meal);

    const archivedPayload = {
      user_id: userId,
      name: meal.name,
      price: Number.isFinite(cleanPrice) ? cleanPrice : getMealEstimatedPrice(meal),
      ingredients: meal.ingredients ?? [],
      instructions: meal.instructions ?? [],
    };

    const { data, error } = await supabase
      .from("archived_meals")
      .insert([archivedPayload])
      .select();

    if (error) {
      console.error("Vault Save Error:", error);
      alert("Failed to save to cloud. Check console.");
      return;
    }

    if (data && data[0]) {
      const hydratedArchivedMeal = rehydrateMealRecord(
        ((data[0] as { recipe_data?: unknown }).recipe_data ??
          data[0]) as Partial<MealPlanItem> | GenerateListResponse["desserts"][number] | null,
        {
          dbId: (data[0] as { id?: number | string | null }).id ?? undefined,
          user_id: safeTrim((data[0] as { user_id?: string | null }).user_id) || userId,
          day: meal.day,
          servings: meal.servings,
        },
      );

      if (hydratedArchivedMeal) {
        setArchivedMeals((current) =>
          current.some((archivedMeal) => mealMatcher(archivedMeal))
            ? current
            : [...current, hydratedArchivedMeal],
        );
      }

      setWeeklyMenu((current) => current.filter((savedMeal) => !mealMatcher(savedMeal)));
      setSavedDesserts((current) =>
        current.filter((savedDessert) => !mealMatcher(savedDessert)),
      );
      alert("Meal Stashed!");
    }
  }

  function handleRestoreMeal(meal: MealPlanItem) {
    const mealMatcher = (candidate: MealPlanItem) =>
      meal.dbId
        ? candidate.dbId === meal.dbId
        : candidate.name === meal.name;

    setArchivedMeals((current) =>
      current.filter((archivedMeal) => !mealMatcher(archivedMeal)),
    );

    if (isSweetTreatMeal(meal)) {
      setSavedDesserts((current) =>
        current.some((savedDessert) => mealMatcher(savedDessert))
          ? current
          : [...current, meal],
      );
      return;
    }

    setWeeklyMenu((current) => {
      if (current.some((savedMeal) => mealMatcher(savedMeal))) {
        return current;
      }

      if (current.length >= 5) {
        return current;
      }

      return [...current, meal];
    });
  }

  async function handlePermanentDelete(meal: MealPlanItem) {
    const userId = user?.id || "";
    if (!userId) {
      return;
    }

    const mealMatcher = (candidate: MealPlanItem) =>
      meal.dbId
        ? candidate.dbId === meal.dbId
        : candidate.name === meal.name;

    try {
      if (meal.dbId) {
        const { error } = await supabase
          .from("weekly_menus")
          .delete()
          .eq("id", meal.dbId)
          .eq("user_id", userId);

        if (error) {
          throw error;
        }
      } else {
        const { error } = await supabase
          .from("weekly_menus")
          .delete()
          .eq("user_id", userId)
          .eq("meal_title", meal.name)
          .eq("status", "archived");

        if (error) {
          throw error;
        }
      }

      setWeeklyMenu((current) => current.filter((savedMeal) => !mealMatcher(savedMeal)));
      setSavedDesserts((current) =>
        current.filter((savedDessert) => !mealMatcher(savedDessert)),
      );
      setArchivedMeals((current) =>
        current.filter((archivedMeal) => !mealMatcher(archivedMeal)),
      );
    } catch (error) {
      setCloudSyncMessage(
        error instanceof Error ? error.message : "Failed to permanently delete meal.",
      );
    }
  }

  function handleToggleDessertSave(
    dessert: GenerateListResponse["desserts"][number],
    index: number,
  ) {
    const dessertMeal: MealPlanItem = {
      user_id: safeTrim(user?.id),
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

  function handleRemovePantryItem(itemToRemove: string) {
    const cleanedTarget = safeTrim(itemToRemove);

    setFullyStocked((current) => {
      const next = new Set(current);
      next.delete(cleanedTarget);
      return next;
    });

    setFormState((current) => {
      const nextPantryItems = current.pantryItems
        .split(",")
        .map((item) => safeTrim(item))
        .filter((item) => item && item.toLowerCase() !== cleanedTarget.toLowerCase())
        .join(", ");

      return {
        ...current,
        pantryItems: nextPantryItems,
      };
    });
  }

  function handleClearForm() {
    const shouldClear = window.confirm(
      "Are you sure? This will clear your form and active weekly menu, but your Recipe Vault will remain safe.",
    );

    if (!shouldClear) {
      return;
    }

    setFormState(clearedFormState);
    setValidationError(null);
    setRequestError(null);
    setIsLoading(false);
    setGeneratedPlan((current) =>
      current
        ? {
            ...current,
            meals: [],
            desserts: [],
          }
        : null,
    );
    persistGeneratedPlan(null);
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

    clearStoredJson(
      SMART_CART_FORM_STORAGE_KEY,
      SMART_CART_WEEKLY_MENU_STORAGE_KEY,
      SMART_CART_SAVED_DESSERTS_STORAGE_KEY,
      SMART_CART_GENERATED_PLAN_STORAGE_KEY,
    );
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

  const rehydrateMealRecord = useCallback((
    record: Partial<MealPlanItem> | GenerateListResponse["desserts"][number] | null | undefined,
    fallback: Partial<MealPlanItem> = {},
  ): MealPlanItem | null => {
    const resolvedName = safeTrim(
      "name" in (record ?? {})
        ? (record as Partial<MealPlanItem>).name
        : (record as GenerateListResponse["desserts"][number] | undefined)?.title,
    );

    if (!resolvedName) {
      return null;
    }

    const resolvedNotes = safeTrim(
      "notes" in (record ?? {})
        ? (record as Partial<MealPlanItem>).notes
        : (record as GenerateListResponse["desserts"][number] | undefined)?.description,
    );

    const rawIngredients =
      record && "ingredients" in record && Array.isArray(record.ingredients)
        ? record.ingredients
        : [];

    const hydratedIngredients = (rawIngredients || [])
      .filter((ingredient: any) =>
        Boolean(ingredient && typeof ingredient === "object" && ingredient.name),
      )
      .map((ingredient: any) => ({
        ...ingredient,
        name: safeTrim(ingredient.name || ""),
        amount: safeTrim(ingredient.amount || ""),
        price: typeof ingredient.price === "number" ? ingredient.price : 0,
      })) as IngredientItem[];

    const rawInstructions =
      record &&
      "instructions" in record &&
      Array.isArray((record as Partial<MealPlanItem>).instructions)
        ? (record as Partial<MealPlanItem>).instructions
        : [];

    return {
      dbId: fallback.dbId,
      user_id: safeTrim(
        ("user_id" in (record ?? {})
          ? (record as Partial<MealPlanItem>).user_id
          : undefined) ?? fallback.user_id,
      ),
      day: safeTrim(
        ("day" in (record ?? {}) ? (record as Partial<MealPlanItem>).day : undefined) ??
          fallback.day,
      ),
      name: resolvedName,
      servings:
        Number(
          ("servings" in (record ?? {})
            ? (record as Partial<MealPlanItem>).servings
            : undefined) ?? fallback.servings,
        ) || 2,
      notes: resolvedNotes,
      ingredients: hydratedIngredients,
      instructions: (rawInstructions || []).filter(
        (instruction): instruction is string => typeof instruction === "string",
      ),
      imageUrl: safeTrim(
        ("imageUrl" in (record ?? {}) ? (record as Partial<MealPlanItem>).imageUrl : undefined) ??
          fallback.imageUrl,
      ) || undefined,
    };
  }, []);

  const fetchSavedMeals = useCallback(async (userId: string) => {
    if (!userId) {
      return { dinners: [], desserts: [] };
    }

    const savedMealRows = await fetchSavedMealRows(userId);

    const sanitized = savedMealRows.map((row: SmartCartSavedMealRow) => ({
      ...row,
      name: safeTrim((row as { name?: string }).name),
      ingredients: Array.isArray((row as { ingredients?: unknown[] }).ingredients)
        ? ((row as { ingredients?: IngredientItem[] }).ingredients ?? [])
        : [],
      instructions: Array.isArray((row as { instructions?: unknown[] }).instructions)
        ? ((row as { instructions?: string[] }).instructions ?? [])
        : [],
    }));

    const dinners = sanitized
      .filter((row) => row.type === "dinner")
      .map((row) =>
        rehydrateMealRecord(row.recipe_data as Partial<MealPlanItem> | null, {
          dbId: row.id ?? undefined,
          user_id: safeTrim(row.user_id),
        }),
      )
      .filter((meal): meal is MealPlanItem => Boolean(meal));

    const desserts = sanitized
      .filter((row) => row.type === "sweet_treat")
      .map((row, index) =>
        rehydrateMealRecord(
          row.recipe_data as GenerateListResponse["desserts"][number] | null,
          {
            dbId: row.id ?? undefined,
            user_id: safeTrim(row.user_id),
            day: `Sweet Treat ${index + 1}`,
            servings: Number(formState.householdSize) || 2,
          },
        ),
      )
      .filter((meal): meal is MealPlanItem => Boolean(meal));

    return { dinners, desserts };
  }, [formState.householdSize, rehydrateMealRecord]);

  const loadSessionFromCloud = useCallback(async (userId: string) => {
    try {
      const [ownedPantryItems, { dinners: hydratedDinners, desserts: hydratedDesserts }] =
        await Promise.all([
          fetchOwnedPantryItems(userId),
          fetchSavedMeals(userId),
        ]);

      const resolvedWeeklyMenu = hydratedDinners;
      const resolvedSavedDesserts = hydratedDesserts;
      const resolvedPantryItems = ownedPantryItems
        .map((ingredientName) => safeTrim(ingredientName))
        .filter(Boolean);

      setFullyStocked((current) =>
        current.size > 0 ? current : new Set(resolvedPantryItems),
      );
      setRunningLow((current) => (current.size > 0 ? current : new Set()));
      setRestock((current) => (current.size > 0 ? current : new Set()));

      setWeeklyMenu((currentMenu) => {
        if (currentMenu && currentMenu.length > 0) {
          return currentMenu;
        }

        return resolvedWeeklyMenu;
      });

      setSavedDesserts((currentDesserts) => {
        if (currentDesserts && currentDesserts.length > 0) {
          return currentDesserts;
        }

        return resolvedSavedDesserts;
      });
    } catch (error) {
      setCloudSyncMessage(
        error instanceof Error ? error.message : "Failed to load cloud data.",
      );
    }
  }, [fetchSavedMeals]);

  const loadArchivedMeals = useCallback(async () => {
    if (!user?.id) {
      return;
    }

    try {
      const archivedMealRows = await fetchArchivedMealRows(user.id);

      const hydratedVaultMeals = archivedMealRows
        .map((row: SmartCartArchivedMealRow) =>
          rehydrateMealRecord(
            ((row as { recipe_data?: unknown }).recipe_data ??
              row) as
              | Partial<MealPlanItem>
              | GenerateListResponse["desserts"][number]
              | null,
            {
              dbId: (row as { id?: number | string | null }).id ?? undefined,
              user_id: safeTrim((row as { user_id?: string | null }).user_id),
              day:
                safeTrim((row as { type?: string | null }).type).toLowerCase() ===
                "sweet_treat"
                  ? "Sweet Treat"
                  : "",
              servings: Number(formState.householdSize) || 2,
            },
          ),
        )
        .filter((meal): meal is MealPlanItem => Boolean(meal));

      setArchivedMeals(hydratedVaultMeals);
    } catch (error) {
      console.error("Vault Load Error:", error);
      setCloudSyncMessage("Failed to load archived meals.");
    }
  }, [formState.householdSize, rehydrateMealRecord, user?.id]);

  useEffect(() => {
    const userId = user?.id || "";
    if (!userId) {
      return;
    }

    void loadSessionFromCloud(userId);
  }, [loadSessionFromCloud, user?.id]);

  useEffect(() => {
    void loadArchivedMeals();
  }, [loadArchivedMeals]);

  async function saveSessionToCloud() {
    const userId = user?.id || "";
    if (!userId) {
      return;
    }

    setIsSaving(true);
    setCloudSyncMessage("");

    try {
      const activeDessertRows = savedDesserts.map((dessert) => ({
        meal_title: dessert.name,
        recipe_data: {
          title: dessert.name,
          description: dessert.notes,
          ingredients: dessert.ingredients ?? [],
          imageUrl: dessert.imageUrl,
        },
        type: "sweet_treat",
        status: "active_week",
        user_id: userId,
      }));

      const weeklyMenuRows = [
        ...weeklyMenu.map((meal) => ({
          meal_title: meal.name,
          recipe_data: meal,
          type: "dinner",
          status: "active_week",
          user_id: userId,
        })),
        ...activeDessertRows,
      ];

      await replaceActiveWeeklyMenuRows(userId, weeklyMenuRows);
      await replacePantryInventory(userId, combinedPantryItems);

      setCloudSyncMessage("✨ Cloud sync complete! Your week is saved.");
    } catch (error) {
      console.error("Supabase Save Error:", error);
      setCloudSyncMessage(
        error instanceof Error ? error.message : "Cloud sync failed.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleWaitlistSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!safeTrim(waitlistEmail)) {
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
        body: JSON.stringify({ email: safeTrim(waitlistEmail) }),
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
    const currentMealsContext = weeklyMenu.map((savedMeal) => savedMeal.name).join(", ");

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
          diet: safeTrim(formState.diet) || "No specific diet provided",
          householdSize,
          combinedPantryItems: combinedPantryItems.join(", "),
          rejectedMealTitle: meal.name,
          prepTime: formState.prepTime,
          adventureLevel: formState.adventureLevel,
          mustHaveIngredient: safeTrim(formState.mustHaveIngredient),
          availableEquipment: formState.availableEquipment,
          existingMeals: currentMealsContext || existingMealTitles,
          currentMealsContext,
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
        user_id: safeTrim(meal.user_id) || safeTrim(user?.id),
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

        const nextPlan = {
          ...current,
          meals: nextMeals,
        };

        persistGeneratedPlan(nextPlan);
        return nextPlan;
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
        <SmartCartHeroHeader
          activeFeature={activeFeature}
          authMessage={authMessage}
          email={email}
          featureDescriptions={featureDescriptions}
          isAuthLoading={isAuthLoading}
          onEmailChange={setEmail}
          onFeatureToggle={(feature) =>
            handleFeatureToggle(feature as keyof typeof featureDescriptions)
          }
          onLoginSubmit={handleLogin}
          onSignOut={() => {
            void supabase.auth.signOut();
          }}
          userEmail={safeTrim(user?.email)}
        />

        <SmartCartContextForm
          adventureLevelOptions={adventureLevelOptions}
          combinedPantryItems={combinedPantryItems}
          equipmentOptions={equipmentOptions}
          featureError={validationError || requestError}
          formState={formState}
          fullyStocked={fullyStocked}
          isBudgetValid={isBudgetValid}
          isLoading={isLoading}
          isPantryOpen={isPantryOpen}
          isPantrySelectionOpen={isPantrySelectionOpen}
          onBudgetChange={(value) =>
            setFormState((current) => ({
              ...current,
              budget: value,
            }))
          }
          onClearForm={handleClearForm}
          onDietChange={(value) =>
            setFormState((current) => ({
              ...current,
              diet: value,
            }))
          }
          onHouseholdSizeChange={(value) =>
            setFormState((current) => ({
              ...current,
              householdSize: value,
            }))
          }
          onIncludeDessertChange={(checked) =>
            setFormState((current) => ({
              ...current,
              includeDessert: checked,
            }))
          }
          onMustHaveIngredientChange={(value) =>
            setFormState((current) => ({
              ...current,
              mustHaveIngredient: value,
            }))
          }
          onPantryItemsChange={(value) =>
            setFormState((current) => ({
              ...current,
              pantryItems: value,
            }))
          }
          onPrepTimeChange={(value) =>
            setFormState((current) => ({
              ...current,
              prepTime: value,
            }))
          }
          onRemovePantryItem={handleRemovePantryItem}
          onSubmit={handleSubmit}
          onToggleBudgetTight={() =>
            setFormState((current) => ({
              ...current,
              isBudgetTight: !current.isBudgetTight,
            }))
          }
          onToggleEquipment={(equipment) =>
            setFormState((current) => ({
              ...current,
              availableEquipment: current.availableEquipment.includes(equipment)
                ? current.availableEquipment.filter((item) => item !== equipment)
                : [...current.availableEquipment, equipment],
            }))
          }
          onToggleFeatureLevel={(value) =>
            setFormState((current) => ({
              ...current,
              adventureLevel: value,
            }))
          }
          onTogglePantryOpen={() => setIsPantryOpen((current) => !current)}
          onTogglePantrySelectionOpen={() =>
            setIsPantrySelectionOpen((current) => !current)
          }
          onToggleQuickItem={toggleQuickItem}
          pantryCategoryStyles={pantryCategoryStyles}
          pantryQuickSelectOptions={pantryQuickSelectOptions}
          prepTimeOptions={prepTimeOptions}
        />
        <section className="mt-10 pb-16">
          {generatedPlan ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <SmartCartMealSections
                expandedDetailCards={expandedDetailCards}
                expandedIngredientsMeals={expandedIngredientsMeals}
                formatCardEyebrow={formatCardEyebrow}
                formatCurrency={formatCurrency}
                generatedPlan={generatedPlan}
                getMealEstimatedPrice={getMealEstimatedPrice}
                householdSize={Number(formState.householdSize) || 2}
                onGetDessertRecipe={handleGetDessertRecipe}
                onGetRecipe={handleGetRecipe}
                onReplaceDessert={handleReplaceDessert}
                onReplaceMeal={handleReplaceMeal}
                onSaveToWeeklyMenu={handleSaveToWeeklyMenu}
                onToggleCardDetails={handleToggleCardDetails}
                onToggleDessertSave={handleToggleDessertSave}
                onToggleIngredients={handleToggleIngredients}
                recipeCache={recipeCache}
                recipeLoadingMeal={recipeLoadingMeal}
                replacingDessertKey={replacingDessertKey}
                replacingMealKey={replacingMealKey}
                savedDessertKeys={savedDessertKeys}
                savedMealKeys={savedMealKeys}
                totalCost={totalCost}
                userId={safeTrim(user?.id)}
                weeklyMenu={weeklyMenu}
              />
              <SmartCartGrocerySidebar
                budgetPercentage={budgetPercentage}
                budgetProgressBarClass={budgetProgressBarClass}
                budgetStatusLabel={budgetStatusLabel}
                budgetStatusTextClass={budgetStatusTextClass}
                checkedItems={checkedItems}
                copied={copied}
                customItems={customItems}
                displayGroceriesByCategory={displayGroceriesByCategory}
                formatCurrency={formatCurrency}
                isGroceryOpen={isGroceryOpen}
                isPremiumMode={isPremiumMode}
                newCustomItem={newCustomItem}
                onAddCustomItem={() => {
                  if (safeTrim(newCustomItem)) {
                    setCustomItems([
                      ...customItems,
                      {
                        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                        name: safeTrim(newCustomItem),
                        isChecked: false,
                      },
                    ]);
                    setNewCustomItem("");
                  }
                }}
                onChangeCustomItem={setNewCustomItem}
                onCopyShoppingList={handleCopyShoppingList}
                onRemoveCustomItem={(id) =>
                  setCustomItems((current) =>
                    current.filter((currentItem) => currentItem.id !== id),
                  )
                }
                onRemoveRestoredItem={(name) =>
                  setRestoredItems((current) =>
                    current.filter((currentName) => currentName !== name),
                  )
                }
                onRestoreSkippedItem={(name) =>
                  setRestoredItems((current) =>
                    current.includes(name) ? current : [...current, name],
                  )
                }
                onSetCustomItemChecked={(id, isChecked) =>
                  setCustomItems((current) =>
                    current.map((currentItem) =>
                      currentItem.id === id ? { ...currentItem, isChecked } : currentItem,
                    ),
                  )
                }
                onToggleCheckedItem={toggleCheckedItem}
                onToggleGroceryOpen={() => setIsGroceryOpen(!isGroceryOpen)}
                onTogglePremiumMode={() => setIsPremiumMode(!isPremiumMode)}
                parsedBudget={parsedBudget}
                rawBudgetPercentage={rawBudgetPercentage}
                restoredItems={restoredItems}
                skippedGroceriesByCategory={skippedGroceriesByCategory}
                totalCost={totalCost}
              />
            </div>
          ) : (
            <div className="rounded-[2rem] border border-dashed border-pine/20 bg-white/40 p-10 text-center text-ink/60">
              <p className="font-display text-2xl text-ink">Your generated plan will appear here</p>
              <p className="mt-3 text-sm leading-7">
                Select your preferences and pantry items above to get started.
              </p>
            </div>
          )}
          <SmartCartLibrarySections
            archivedMeals={archivedMeals}
            cloudSyncMessage={cloudSyncMessage}
            expandedDetailCards={expandedDetailCards}
            expandedIngredientsMeals={expandedIngredientsMeals}
            formatCardEyebrow={formatCardEyebrow}
            formatCurrency={formatCurrency}
            getMealEstimatedPrice={getMealEstimatedPrice}
            isSaving={isSaving}
            isVaultOpen={isVaultOpen}
            onArchiveMeal={handleArchiveMeal}
            onGetRecipe={handleGetRecipe}
            onPermanentDelete={handlePermanentDelete}
            onRestoreMeal={handleRestoreMeal}
            onSaveSession={saveSessionToCloud}
            onToggleCardDetails={handleToggleCardDetails}
            onToggleIngredients={handleToggleIngredients}
            onToggleVaultOpen={() => setIsVaultOpen(!isVaultOpen)}
            onWaitlistEmailChange={setWaitlistEmail}
            onWaitlistSubmit={handleWaitlistSubmit}
            recipeCache={recipeCache}
            recipeLoadingMeal={recipeLoadingMeal}
            savedDesserts={savedDesserts}
            userSignedIn={Boolean(user)}
            waitlistEmail={waitlistEmail}
            waitlistStatus={waitlistStatus}
          />
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
                      {activeRecipe.ingredients
                        .filter((ingredient) => typeof ingredient === "string")
                        .map((ingredient) => safeTrim(ingredient))
                        .filter(Boolean)
                        .map((ingredient) => (
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
                      {activeRecipe.steps
                        .filter((step) => typeof step === "string")
                        .map((step) => safeTrim(step))
                        .filter(Boolean)
                        .map((step, index) => (
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







