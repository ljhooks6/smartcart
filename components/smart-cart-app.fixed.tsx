"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { SmartCartContextForm } from "./smart-cart-context-form";
import { SmartCartCookSections } from "./smart-cart-cook-sections";
import { SmartCartFeedback } from "./smart-cart-feedback";
import { SmartCartGrocerySidebar } from "./smart-cart-grocery-sidebar";
import { SmartCartHeroHeader } from "./smart-cart-hero-header";
import { SmartCartLibrarySections } from "./smart-cart-library-sections";
import { SmartCartMealSections } from "./smart-cart-meal-sections";
import { SmartCartRecipeModal } from "./smart-cart-recipe-modal";
import { useSmartCartGrocery } from "../hooks/use-smart-cart-grocery";
import { useSmartCartRecipe } from "../hooks/use-smart-cart-recipe";
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

type ToastTone = "success" | "error" | "info";
type MobileTab = "plan" | "meals" | "shop" | "cook" | "vault";

type FormState = {
  budget: string;
  diet: string;
  householdSize: string;
  pantryItems: string;
  mustHaveIngredient: string;
  avoidIngredients: string;
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
  avoidIngredients: "",
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
  avoidIngredients: "",
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
    "Ground chicken",
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
    "Skip the endless scrolling and get a personalized, 7-day dinner plan in seconds.",
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

const mobileTabs: Array<{
  id: MobileTab;
  label: string;
  shortLabel: string;
  eyebrow: string;
  accentClass: string;
  badgeClass: string;
  panelClass: string;
  shellClass: string;
  headerClass: string;
  statusClass: string;
}> = [
  {
    id: "plan",
    label: "Plan",
    shortLabel: "Plan",
    eyebrow: "Planner",
    accentClass: "text-orange-700",
    badgeClass: "bg-orange-100 text-orange-700",
    panelClass: "border-orange-200 bg-[#fff7eb]",
    shellClass: "border-orange-200/80 bg-[#fff7eb]/95",
    headerClass: "border-orange-200 bg-gradient-to-r from-orange-100 via-amber-50 to-white",
    statusClass: "bg-white text-orange-700 shadow-sm",
  },
  {
    id: "meals",
    label: "Meals",
    shortLabel: "Meals",
    eyebrow: "Dinner flow",
    accentClass: "text-berry",
    badgeClass: "bg-rose-100 text-berry",
    panelClass: "border-rose-200 bg-[#fff8fb]",
    shellClass: "border-rose-200/80 bg-[#fff8fb]/95",
    headerClass: "border-rose-200 bg-gradient-to-r from-rose-100 via-pink-50 to-white",
    statusClass: "bg-white text-berry shadow-sm",
  },
  {
    id: "shop",
    label: "Shop",
    shortLabel: "Shop",
    eyebrow: "Grocery run",
    accentClass: "text-emerald-700",
    badgeClass: "bg-emerald-100 text-emerald-700",
    panelClass: "border-emerald-200 bg-[#f4fbf7]",
    shellClass: "border-emerald-200/80 bg-[#f4fbf7]/95",
    headerClass: "border-emerald-200 bg-gradient-to-r from-emerald-100 via-green-50 to-white",
    statusClass: "bg-white text-emerald-700 shadow-sm",
  },
  {
    id: "cook",
    label: "Cook",
    shortLabel: "Cook",
    eyebrow: "Ready to cook",
    accentClass: "text-pine",
    badgeClass: "bg-amber-100 text-pine",
    panelClass: "border-amber-200 bg-[#f8f4ec]",
    shellClass: "border-amber-200/80 bg-[#f8f4ec]/95",
    headerClass: "border-amber-200 bg-gradient-to-r from-amber-100 via-orange-50 to-white",
    statusClass: "bg-white text-pine shadow-sm",
  },
  {
    id: "vault",
    label: "Vault",
    shortLabel: "Vault",
    eyebrow: "Saved library",
    accentClass: "text-amber-800",
    badgeClass: "bg-amber-100 text-amber-800",
    panelClass: "border-amber-200 bg-[#f7f1e7]",
    shellClass: "border-amber-200/80 bg-[#f7f1e7]/95",
    headerClass: "border-amber-200 bg-gradient-to-r from-amber-100 via-yellow-50 to-white",
    statusClass: "bg-white text-amber-800 shadow-sm",
  },
];

function MobileTabIcon({
  tab,
  className = "h-4 w-4",
}: {
  tab: MobileTab;
  className?: string;
}) {
  if (tab === "plan") {
    return (
      <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
        <path
          d="M8 5.5h8M8 9.5h8M8 13.5h5M7 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm0 0v2.5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  if (tab === "meals") {
    return (
      <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
        <path d="M7 4v7M10 4v7M7 8h3M15 4v16M19 4v7c0 1.657-1.343 3-3 3h-1" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      </svg>
    );
  }

  if (tab === "shop") {
    return (
      <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
        <path d="M4.5 7h15l-1.5 8.5H7L4.5 7Zm0 0-.6-2.5H2.5M9 19a.75.75 0 1 1-1.5 0A.75.75 0 0 1 9 19Zm8 0a.75.75 0 1 1-1.5 0A.75.75 0 0 1 17 19Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      </svg>
    );
  }

  if (tab === "cook") {
    return (
      <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
        <path d="M6 8h12M8 12h8M10 16h4M7 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path d="M12 4.5 6 7.5v4.8c0 3.4 2.16 6.58 6 7.7 3.84-1.12 6-4.3 6-7.7V7.5l-6-3Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

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
  const [fullyStocked, setFullyStocked] = useState<Set<string>>(new Set());
  const [runningLow, setRunningLow] = useState<Set<string>>(new Set());
  const [restock, setRestock] = useState<Set<string>>(new Set());
  const [hasAppliedUpgrades, setHasAppliedUpgrades] = useState(false);
  const [isEquipmentSheetOpen, setIsEquipmentSheetOpen] = useState(false);
  const [isPantryOpen, setIsPantryOpen] = useState(false);
  const [isPantrySelectionOpen, setIsPantrySelectionOpen] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistStatus, setWaitlistStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastTone, setToastTone] = useState<ToastTone>("info");
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [weeklyMenu, setWeeklyMenu] = useState<MealPlanItem[]>([]);
  const [savedDesserts, setSavedDesserts] = useState<MealPlanItem[]>([]);
  const [archivedMeals, setArchivedMeals] = useState<MealPlanItem[]>([]);
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [replacingMealKey, setReplacingMealKey] = useState<string | null>(null);
  const [replacingDessertKey, setReplacingDessertKey] = useState<string | null>(null);
  const [recentRejectedMeals, setRecentRejectedMeals] = useState<string[]>([]);
  const [expandedDetailCards, setExpandedDetailCards] = useState<Set<string>>(
    new Set(),
  );
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const [hasLoadedGeneratedPlan, setHasLoadedGeneratedPlan] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<MobileTab>("plan");
  const [isMobileDockExpanded, setIsMobileDockExpanded] = useState(false);
  const lastScrollYRef = useRef(0);

  const showToast = useCallback((message: string, tone: ToastTone = "info") => {
    setToastMessage(message);
    setToastTone(tone);
  }, []);

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
    if (!toastMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setToastMessage(null);
    }, 2600);

    return () => window.clearTimeout(timeoutId);
  }, [toastMessage]);

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
        avoidIngredients:
          parsed.avoidIngredients ?? current.avoidIngredients,
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
    if (typeof window === "undefined") {
      return;
    }

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollPosition = window.innerHeight + window.scrollY;
      const nearBottom = scrollPosition >= document.documentElement.scrollHeight - 180;
      const isScrollingUp = currentScrollY < lastScrollYRef.current - 12;

      setIsMobileDockExpanded((current) => {
        if (nearBottom) {
          return true;
        }

        if (isScrollingUp) {
          return false;
        }

        return current;
      });

      lastScrollYRef.current = currentScrollY;
    };

    lastScrollYRef.current = window.scrollY;
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
  const {
    checkedItems,
    copied,
    customItems,
    displayGroceriesByCategory,
    handleAddCustomItem,
    handleCopyShoppingList,
    isGroceryOpen,
    isPremiumMode,
    newCustomItem,
    resetGroceryState,
    restoredItems,
    setCustomItemChecked,
    setGroceryOpen,
    setNewCustomItem,
    setPremiumMode,
    skippedGroceriesByCategory,
    toggleCheckedItem,
    totalCost,
    removeCustomItem,
    removeRestoredItem,
    restoreSkippedItem,
  } = useSmartCartGrocery({
    formatCurrency,
    fullyStocked,
    onCopyError: (message) => setRequestError(message),
    restock,
    runningLow,
    savedDesserts,
    weeklyMenu,
  });

  const {
    activeRecipe,
    activeRecipeMeal,
    closeRecipeModal,
    expandedIngredientsMeals,
    handleGetDessertRecipe,
    handleGetRecipe,
    handleToggleIngredients,
    recipeCache,
    recipeError,
    recipeLoadingMeal,
    resetRecipeState,
    setActiveRecipeMeal,
  } = useSmartCartRecipe({
    householdSize: Number(formState.householdSize) || 2,
    userId: safeTrim(user?.id),
  });

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
  const activeTabMeta = mobileTabs.find((tab) => tab.id === activeMobileTab) ?? mobileTabs[0];
  const hasMealSurfaceContent =
    Boolean(generatedPlan?.meals?.length) ||
    Boolean(generatedPlan?.desserts?.length);
  const hasCookSurfaceContent = weeklyMenu.length > 0 || savedDesserts.length > 0;
  const hasVaultSurfaceContent = archivedMeals.length > 0 || Boolean(user);

  async function submitPlan(applyUpgrades = false) {
    setValidationError(null);
    setRequestError(null);

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

    let timeoutId: number | undefined;

    try {
      const controller = new AbortController();
      timeoutId = window.setTimeout(() => {
        controller.abort();
      }, 65000);

      const response = await fetch("/api/generate-list", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          budget,
          diet: safeTrim(formState.diet) || "No specific diet provided",
          householdSize,
          combinedPantryItems: combinedPantryItems.join(", "),
          fullyStocked: Array.from(fullyStocked),
          runningLow: Array.from(runningLow),
          restock: Array.from(restock),
          mustHaveIngredient: safeTrim(formState.mustHaveIngredient),
          avoidIngredients: safeTrim(formState.avoidIngredients),
          includeDessert: formState.includeDessert,
          adventureLevel: formState.adventureLevel,
          prepTime: formState.prepTime,
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
      resetGroceryState();
      resetRecipeState();
      setHasAppliedUpgrades(applyUpgrades);
      setSavedDesserts([]);
      setExpandedDetailCards(new Set());
    } catch (error) {
      setGeneratedPlan(null);
      persistGeneratedPlan(null);
      setRequestError(
        error instanceof DOMException && error.name === "AbortError"
          ? "Meal generation timed out. Please try again."
          : error instanceof Error
            ? error.message
            : "Failed to fetch",
      );
    } finally {
      if (typeof timeoutId === "number") {
        window.clearTimeout(timeoutId);
      }
      setIsLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActiveMobileTab("meals");
    await submitPlan(false);
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

  function handleRemoveFromWeeklyMenu(meal: MealPlanItem) {
    const mealKey = `${meal.day}::${meal.name}`;

    setWeeklyMenu((current) =>
      current.filter((savedMeal) => `${savedMeal.day}::${savedMeal.name}` !== mealKey),
    );

    setGeneratedPlan((current) => {
      if (!current) {
        return current;
      }

      if (current.meals.some((generatedMeal) => `${generatedMeal.day}::${generatedMeal.name}` === mealKey)) {
        return current;
      }

      const nextMeals = [...current.meals, meal].slice(0, 7);
      const nextPlan = {
        ...current,
        meals: nextMeals,
      };

      persistGeneratedPlan(nextPlan);
      return nextPlan;
    });
  }

  async function handleArchiveMeal(meal: MealPlanItem) {
    const userId = user?.id || "";
    if (!userId) {
      showToast("Please sign in before using the Recipe Vault.", "info");
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
      showToast("Failed to save to cloud. Check console.", "error");
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

        setGeneratedPlan((current) => {
          if (!current) {
            return current;
          }

          const nextPlan = {
            ...current,
            meals: current.meals.filter((generatedMeal) => !mealMatcher(generatedMeal)),
          };

          persistGeneratedPlan(nextPlan);
          return nextPlan;
        });
        setWeeklyMenu((current) => current.filter((savedMeal) => !mealMatcher(savedMeal)));
        setSavedDesserts((current) =>
          current.filter((savedDessert) => !mealMatcher(savedDessert)),
        );
        showToast("Meal stashed in your Recipe Vault.", "success");
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

    const isVaultMeal = archivedMeals.some((archivedMeal) => mealMatcher(archivedMeal));

    try {
      if (isVaultMeal && meal.dbId) {
        const { error } = await supabase
          .from("archived_meals")
          .delete()
          .eq("id", meal.dbId)
          .eq("user_id", userId);

        if (error) {
          throw error;
        }
      } else if (meal.dbId) {
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

  async function performClearForm() {
    const userId = user?.id || "";

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
    setFullyStocked(new Set());
    setRunningLow(new Set());
    setRestock(new Set());
    setHasAppliedUpgrades(false);
    resetGroceryState();
    resetRecipeState();
    setWeeklyMenu([]);
    setSavedDesserts([]);
    setReplacingMealKey(null);
    setReplacingDessertKey(null);
    setRecentRejectedMeals([]);
    setExpandedDetailCards(new Set());

    clearStoredJson(
      SMART_CART_FORM_STORAGE_KEY,
      SMART_CART_WEEKLY_MENU_STORAGE_KEY,
      SMART_CART_SAVED_DESSERTS_STORAGE_KEY,
      SMART_CART_GENERATED_PLAN_STORAGE_KEY,
    );

    if (userId) {
      try {
        await Promise.all([
          replaceActiveWeeklyMenuRows(userId, []),
          replacePantryInventory(userId, []),
        ]);
      } catch (error) {
        console.error("Failed to clear cloud session state:", error);
      }
    }

    showToast("Workspace reset. Your Recipe Vault is still safe.", "success");
  }

  function handleClearForm() {
    setIsClearConfirmOpen(true);
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
      setWaitlistStatus("error");
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
    const currentMealsContext = Array.from(
      new Set(
        [...(generatedPlan.meals ?? []), ...weeklyMenu]
          .map((menuMeal) => safeTrim(menuMeal.name))
          .filter((name) => name && name !== safeTrim(meal.name)),
      ),
    ).join(", ");

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
          avoidIngredients: safeTrim(formState.avoidIngredients),
          availableEquipment: formState.availableEquipment,
          existingMeals: currentMealsContext || existingMealTitles,
          currentMealsContext,
          recentRejectedMeals,
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

      setRecentRejectedMeals((current) =>
        Array.from(new Set([...current, safeTrim(meal.name)])).slice(-12),
      );

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

  return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fffaf2,_#f3efe6_55%,_#ebe7df)] flex flex-col items-center px-4 pb-[12.5rem] pt-4 md:pb-12 md:pt-8">
        {isLoading ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/35 px-6">
            <div className="w-full max-w-md rounded-[2rem] border border-stone-200 bg-white px-6 py-7 text-center shadow-2xl">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                <svg aria-hidden="true" className="h-7 w-7 animate-spin" fill="none" viewBox="0 0 24 24">
                  <path d="M12 3v3m0 12v3m9-9h-3M6 12H3m15.364 6.364-2.121-2.121M8.757 8.757 6.636 6.636m11.728 0-2.121 2.121M8.757 15.243l-2.121 2.121" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
                </svg>
              </div>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.28em] text-orange-500">
                SmartCart is cooking
              </p>
              <p className="mt-2 font-display text-3xl text-ink">Building your week</p>
              <p className="mt-3 text-sm leading-7 text-ink/70">
                We are balancing pantry items, variety, prep time, and budget so your meals are worth the wait.
              </p>
            </div>
          </div>
        ) : null}
        <SmartCartFeedback
        confirmBody="This will clear your form and active weekly menu, but your Recipe Vault will remain safe."
        confirmCancelLabel="Keep My Work"
        confirmConfirmLabel="Reset Workspace"
        confirmOpen={isClearConfirmOpen}
        confirmTitle="Reset Workspace?"
        onCancelConfirm={() => setIsClearConfirmOpen(false)}
        onConfirm={() => {
          setIsClearConfirmOpen(false);
          void performClearForm();
        }}
        toastMessage={toastMessage}
        toastTone={toastTone}
      />
      <div className="sticky top-0 z-40 w-full max-w-7xl md:hidden">
        <div className={`rounded-[1.75rem] border px-4 py-3 shadow-lg backdrop-blur ${activeTabMeta.shellClass}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${activeTabMeta.badgeClass}`}>
                <MobileTabIcon tab={activeTabMeta.id} className="h-5 w-5" />
              </div>
              <div>
                <p className={`text-xs font-semibold uppercase tracking-[0.25em] ${activeTabMeta.accentClass}`}>
                  {activeTabMeta.eyebrow}
                </p>
                <p className="font-display text-2xl text-ink">{activeTabMeta.label}</p>
              </div>
            </div>
            <div className="text-right text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
              {user ? "Signed In" : "Guest"}
            </div>
          </div>
        </div>
      </div>
      <div className="w-full max-w-7xl mx-auto flex flex-col gap-8 font-body">
        <div className={activeMobileTab === "plan" ? "block md:block" : "hidden md:block"}>
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
        </div>

        <div className="grid gap-8 md:hidden">
            <section
              className={`overflow-hidden rounded-[2rem] border px-4 pb-36 pt-5 shadow-xl ring-1 ring-white/60 ${
                activeMobileTab === "plan" ? `block ${activeTabMeta.panelClass}` : "hidden"
              }`}
            >
              <div className={`mb-4 rounded-[1.5rem] border px-4 py-4 shadow-sm ${mobileTabs[0].headerClass}`}>
                <div className="flex items-start gap-3">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${mobileTabs[0].badgeClass}`}>
                    <MobileTabIcon tab="plan" className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-orange-700">
                      Planner
                    </p>
                    <p className="mt-1 text-sm leading-6 text-ink/65">
                      Set your week up once, then jump over to meals when you are ready.
                    </p>
                  </div>
                </div>
              </div>
            <SmartCartContextForm
              adventureLevelOptions={adventureLevelOptions}
              combinedPantryItems={combinedPantryItems}
              equipmentOptions={equipmentOptions}
              featureError={validationError || requestError}
              formState={formState}
                fullyStocked={fullyStocked}
                isEquipmentSheetOpen={isEquipmentSheetOpen}
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
              onAvoidIngredientsChange={(value) =>
                setFormState((current) => ({
                  ...current,
                  avoidIngredients: value,
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
                onToggleEquipmentSheetOpen={() =>
                  setIsEquipmentSheetOpen((current) => !current)
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
          </section>

            <section
              className={`overflow-hidden rounded-[2rem] border px-4 pb-36 pt-5 shadow-xl ring-1 ring-white/60 ${
                activeMobileTab === "meals" ? `block ${mobileTabs[1].panelClass}` : "hidden"
              }`}
            >
              <div className={`mb-4 flex items-center justify-between gap-3 rounded-[1.5rem] border px-4 py-4 shadow-sm ${mobileTabs[1].headerClass}`}>
                <div className="flex items-start gap-3">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${mobileTabs[1].badgeClass}`}>
                    <MobileTabIcon tab="meals" className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-berry/70">
                      Meals
                    </p>
                    <p className="mt-1 text-sm leading-6 text-ink/65">
                      Your generated dinners and dessert picks live here before you save them forward.
                    </p>
                  </div>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${mobileTabs[1].statusClass}`}>
                  {hasMealSurfaceContent ? "Active" : "Waiting"}
                </span>
              </div>
            {generatedPlan ? (
              <SmartCartMealSections
                expandedDetailCards={expandedDetailCards}
                expandedIngredientsMeals={expandedIngredientsMeals}
                formatCardEyebrow={formatCardEyebrow}
                generatedPlan={generatedPlan}
                householdSize={Number(formState.householdSize) || 2}
                onArchiveMeal={handleArchiveMeal}
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
                userId={safeTrim(user?.id)}
                weeklyMenuCount={weeklyMenu.length}
              />
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-rose-200 bg-rose-50 px-4 py-10 text-center text-ink/60">
                <p className="font-display text-2xl text-ink">Meals will land here</p>
                <p className="mt-3 text-sm leading-7">
                  Build your plan first, then flip back here to review dinners and desserts.
                </p>
              </div>
            )}
            </section>

            <section
              className={`overflow-hidden rounded-[2rem] border px-4 pb-36 pt-5 shadow-xl ring-1 ring-white/60 ${
                activeMobileTab === "shop" ? `block ${mobileTabs[2].panelClass}` : "hidden"
              }`}
            >
              <div className={`mb-4 flex items-center justify-between gap-3 rounded-[1.5rem] border px-4 py-4 shadow-sm ${mobileTabs[2].headerClass}`}>
                <div className="flex items-start gap-3">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${mobileTabs[2].badgeClass}`}>
                    <MobileTabIcon tab="shop" className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-700">
                      Shop
                    </p>
                    <p className="mt-1 text-sm leading-6 text-ink/65">
                      Grocery list, budget progress, and pantry checks all in one place.
                    </p>
                  </div>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${mobileTabs[2].statusClass}`}>
                  {generatedPlan ? "Ready" : "Empty"}
                </span>
              </div>
            {generatedPlan ? (
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
                onAddCustomItem={handleAddCustomItem}
                onChangeCustomItem={setNewCustomItem}
                onCopyShoppingList={handleCopyShoppingList}
                onRemoveCustomItem={removeCustomItem}
                onRemoveRestoredItem={removeRestoredItem}
                onRestoreSkippedItem={restoreSkippedItem}
                onSetCustomItemChecked={setCustomItemChecked}
                onToggleCheckedItem={toggleCheckedItem}
                onToggleGroceryOpen={() => setGroceryOpen(!isGroceryOpen)}
                onTogglePremiumMode={() => setPremiumMode(!isPremiumMode)}
                parsedBudget={parsedBudget}
                rawBudgetPercentage={rawBudgetPercentage}
                restoredItems={restoredItems}
                skippedGroceriesByCategory={skippedGroceriesByCategory}
                totalCost={totalCost}
              />
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-emerald-200 bg-white px-4 py-10 text-center text-ink/60">
                <p className="font-display text-2xl text-ink">Your grocery list will appear here</p>
                <p className="mt-3 text-sm leading-7">
                  Generate a menu first and SmartCart will organize what you need to buy.
                </p>
              </div>
            )}
          </section>

            <section
              className={`overflow-hidden rounded-[2rem] border px-4 pb-36 pt-5 shadow-xl ring-1 ring-white/60 ${
                activeMobileTab === "cook" ? `block ${mobileTabs[3].panelClass}` : "hidden"
              }`}
            >
              <div className={`mb-4 flex items-center justify-between gap-3 rounded-[1.5rem] border px-4 py-4 shadow-sm ${mobileTabs[3].headerClass}`}>
                <div className="flex items-start gap-3">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${mobileTabs[3].badgeClass}`}>
                    <MobileTabIcon tab="cook" className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-pine">
                      Cook
                    </p>
                    <p className="mt-1 text-sm leading-6 text-ink/65">
                      Your saved weekly menu and ready-to-cook desserts live here.
                    </p>
                  </div>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${mobileTabs[3].statusClass}`}>
                  {hasCookSurfaceContent ? "Ready" : "Empty"}
                </span>
              </div>
              <SmartCartCookSections
                expandedDetailCards={expandedDetailCards}
                expandedIngredientsMeals={expandedIngredientsMeals}
                formatCardEyebrow={formatCardEyebrow}
                onArchiveMeal={handleArchiveMeal}
                onGetRecipe={handleGetRecipe}
                onPermanentDelete={handlePermanentDelete}
                onRemoveFromWeeklyMenu={handleRemoveFromWeeklyMenu}
                onToggleCardDetails={handleToggleCardDetails}
                onToggleIngredients={handleToggleIngredients}
                recipeCache={recipeCache}
                recipeLoadingMeal={recipeLoadingMeal}
                savedDesserts={savedDesserts}
                weeklyMenu={weeklyMenu}
              />
            </section>

            <section
              className={`overflow-hidden rounded-[2rem] border px-4 pb-36 pt-5 shadow-xl ring-1 ring-white/60 ${
                activeMobileTab === "vault" ? `block ${mobileTabs[4].panelClass}` : "hidden"
              }`}
            >
              <div className={`mb-4 flex items-center justify-between gap-3 rounded-[1.5rem] border px-4 py-4 shadow-sm ${mobileTabs[4].headerClass}`}>
                <div className="flex items-start gap-3">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${mobileTabs[4].badgeClass}`}>
                    <MobileTabIcon tab="vault" className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-800">
                      Vault
                    </p>
                    <p className="mt-1 text-sm leading-6 text-ink/65">
                      Your saved library, cloud sync, and future-facing features stay together here.
                    </p>
                  </div>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${mobileTabs[4].statusClass}`}>
                  {hasVaultSurfaceContent ? "Live" : "Start Saving"}
                </span>
              </div>
            <SmartCartLibrarySections
              archivedMeals={archivedMeals}
              cloudSyncMessage={cloudSyncMessage}
              expandedDetailCards={expandedDetailCards}
              expandedIngredientsMeals={expandedIngredientsMeals}
              formatCardEyebrow={formatCardEyebrow}
              isSaving={isSaving}
              isVaultOpen={isVaultOpen}
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
              userSignedIn={Boolean(user)}
              waitlistEmail={waitlistEmail}
              waitlistStatus={waitlistStatus}
            />
          </section>
        </div>

        <div className="hidden md:block">
          <SmartCartContextForm
            adventureLevelOptions={adventureLevelOptions}
            combinedPantryItems={combinedPantryItems}
            equipmentOptions={equipmentOptions}
            featureError={validationError || requestError}
            formState={formState}
            fullyStocked={fullyStocked}
            isEquipmentSheetOpen={isEquipmentSheetOpen}
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
            onAvoidIngredientsChange={(value) =>
              setFormState((current) => ({
                ...current,
                avoidIngredients: value,
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
            onToggleEquipmentSheetOpen={() =>
              setIsEquipmentSheetOpen((current) => !current)
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
                  generatedPlan={generatedPlan}
                  householdSize={Number(formState.householdSize) || 2}
                  onArchiveMeal={handleArchiveMeal}
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
                  userId={safeTrim(user?.id)}
                  weeklyMenuCount={weeklyMenu.length}
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
                  onAddCustomItem={handleAddCustomItem}
                  onChangeCustomItem={setNewCustomItem}
                  onCopyShoppingList={handleCopyShoppingList}
                  onRemoveCustomItem={removeCustomItem}
                  onRemoveRestoredItem={removeRestoredItem}
                  onRestoreSkippedItem={restoreSkippedItem}
                  onSetCustomItemChecked={setCustomItemChecked}
                  onToggleCheckedItem={toggleCheckedItem}
                  onToggleGroceryOpen={() => setGroceryOpen(!isGroceryOpen)}
                  onTogglePremiumMode={() => setPremiumMode(!isPremiumMode)}
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
            <div className="mt-8">
              <SmartCartCookSections
                expandedDetailCards={expandedDetailCards}
                expandedIngredientsMeals={expandedIngredientsMeals}
                formatCardEyebrow={formatCardEyebrow}
                onArchiveMeal={handleArchiveMeal}
                onGetRecipe={handleGetRecipe}
                onPermanentDelete={handlePermanentDelete}
                onRemoveFromWeeklyMenu={handleRemoveFromWeeklyMenu}
                onToggleCardDetails={handleToggleCardDetails}
                onToggleIngredients={handleToggleIngredients}
                recipeCache={recipeCache}
                recipeLoadingMeal={recipeLoadingMeal}
                savedDesserts={savedDesserts}
                weeklyMenu={weeklyMenu}
              />
            </div>
            <SmartCartLibrarySections
              archivedMeals={archivedMeals}
              cloudSyncMessage={cloudSyncMessage}
              expandedDetailCards={expandedDetailCards}
              expandedIngredientsMeals={expandedIngredientsMeals}
              formatCardEyebrow={formatCardEyebrow}
              isSaving={isSaving}
              isVaultOpen={isVaultOpen}
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
              userSignedIn={Boolean(user)}
              waitlistEmail={waitlistEmail}
              waitlistStatus={waitlistStatus}
            />
          </section>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 md:hidden">
        <div className="mx-auto max-w-2xl overflow-hidden rounded-[2rem] border border-stone-200 bg-white/95 shadow-[0_-14px_36px_rgba(15,23,42,0.12)] backdrop-blur">
          <button
            className="flex w-full items-center justify-between gap-3 border-b border-stone-200/80 px-4 py-3"
            onClick={() => setIsMobileDockExpanded((current) => !current)}
            type="button"
          >
            <div className="flex items-center gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-2xl ${activeTabMeta.badgeClass}`}>
                <MobileTabIcon tab={activeMobileTab} className="h-4 w-4" />
              </div>
              <div className="text-left">
                <p className={`text-[0.65rem] font-semibold uppercase tracking-[0.2em] ${activeTabMeta.accentClass}`}>
                  {activeTabMeta.eyebrow}
                </p>
                <p className="text-sm font-semibold text-ink">{activeTabMeta.label}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="h-1.5 w-10 rounded-full bg-stone-300" />
              <span className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink/50">
                {isMobileDockExpanded ? "Hide" : "Reveal"}
              </span>
            </div>
          </button>

          {isMobileDockExpanded ? (
            <>
              <div className="border-b border-stone-200/70 p-2">
                <div className="flex items-center gap-2 rounded-[1.4rem] bg-stone-50/90 p-1.5">
                  {activeMobileTab === "plan" ? (
                    <>
                      <button
                        className="flex-1 rounded-full bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isLoading || !isBudgetValid}
                        form="smart-cart-context-form"
                        type="submit"
                      >
                        {isLoading ? "Generating..." : "Generate"}
                      </button>
                      <button
                        className="rounded-full border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:bg-stone-100"
                        onClick={handleClearForm}
                        type="button"
                      >
                        Clear
                      </button>
                    </>
                  ) : null}
                  {activeMobileTab === "meals" ? (
                    <>
                      <button
                        className="flex-1 rounded-full bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={!generatedPlan}
                        onClick={() => setActiveMobileTab("shop")}
                        type="button"
                      >
                        Open Shop
                      </button>
                      <button
                        className="rounded-full border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:bg-stone-100"
                        onClick={() => setActiveMobileTab("cook")}
                        type="button"
                      >
                        Cook
                      </button>
                    </>
                  ) : null}
                  {activeMobileTab === "shop" ? (
                    <>
                      <button
                        className="flex-1 rounded-full bg-pine px-4 py-3 text-sm font-semibold text-white transition hover:bg-pine/90 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={!generatedPlan}
                        onClick={handleCopyShoppingList}
                        type="button"
                      >
                        {copied ? "Copied" : "Copy List"}
                      </button>
                      <button
                        className="rounded-full border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:bg-stone-100"
                        onClick={() => setActiveMobileTab("cook")}
                        type="button"
                      >
                        Cook
                      </button>
                    </>
                  ) : null}
                  {activeMobileTab === "cook" ? (
                    <>
                      <button
                        className="flex-1 rounded-full bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isSaving || !Boolean(user)}
                        onClick={() => void saveSessionToCloud()}
                        type="button"
                      >
                        {isSaving ? "Saving..." : "Save Week"}
                      </button>
                      <button
                        className="rounded-full border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:bg-stone-100"
                        onClick={() => setActiveMobileTab("vault")}
                        type="button"
                      >
                        Vault
                      </button>
                    </>
                  ) : null}
                  {activeMobileTab === "vault" ? (
                    <>
                      <button
                        className="flex-1 rounded-full bg-pine px-4 py-3 text-sm font-semibold text-white transition hover:bg-pine/90"
                        onClick={() => setIsVaultOpen((current) => !current)}
                        type="button"
                      >
                        {isVaultOpen ? "Close Vault" : "Open Vault"}
                      </button>
                      {Boolean(user) ? (
                        <button
                          className="rounded-full border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={isSaving}
                          onClick={() => void saveSessionToCloud()}
                          type="button"
                        >
                          {isSaving ? "Saving..." : "Save"}
                        </button>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </div>

            <nav className="p-2">
              <div className="grid grid-cols-5 gap-2">
                {mobileTabs.map((tab) => {
                  const isActive = activeMobileTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      className={`rounded-[1.25rem] px-3 py-3 text-center text-[0.7rem] font-semibold uppercase tracking-[0.18em] transition ${
                        isActive
                          ? "bg-pine text-white shadow-md"
                          : "bg-transparent text-ink/55 hover:bg-stone-100"
                      }`}
                      onClick={() => setActiveMobileTab(tab.id)}
                      type="button"
                    >
                      <span className="mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-2xl bg-black/5">
                        <MobileTabIcon tab={tab.id} className="h-4 w-4" />
                      </span>
                      <span className="block">{tab.shortLabel}</span>
                      <span
                        className={`mx-auto mt-1 block h-1.5 w-8 rounded-full ${
                          isActive ? "bg-white/80" : "bg-stone-200"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </nav>
            </>
          ) : null}
        </div>
      </div>

      <SmartCartRecipeModal
        activeRecipe={activeRecipe}
        activeRecipeMeal={activeRecipeMeal}
        onClose={closeRecipeModal}
        recipeError={recipeError}
        recipeLoadingMeal={recipeLoadingMeal}
      />
    </main>
  );
}







