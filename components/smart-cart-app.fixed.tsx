"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { SmartCartGenerationProgress, type GenerationPhase } from "./smart-cart-generation-progress";
import { SmartCartContextForm } from "./smart-cart-context-form";
import { SmartCartStoreMode } from "./smart-cart-store-mode";
import { SmartCartWeekDashboard } from "./smart-cart-week-dashboard";
import { deriveGroceryLists } from "../lib/grocery-list";
import { restoreMealAtPosition, undoCookedEntry } from "../lib/meal-recovery";
import { countCookedThisWeek } from "../lib/week-progress";
import { getMealKind, mealKindLabel, hasRoomForMeal } from "../lib/meal-types";
import { recoverWeekDraft, weekDraftKey, weekSnapshot, saveErrorMessage } from "../lib/save-recovery";
import { SmartCartCookSections } from "./smart-cart-cook-sections";
import { SmartCartFeedback } from "./smart-cart-feedback";
import { SmartCartGrocerySidebar } from "./smart-cart-grocery-sidebar";
import { SmartCartHeroHeader } from "./smart-cart-hero-header";
import { SmartCartWelcome } from "./smart-cart-welcome";
import { SmartCartLibrarySections } from "./smart-cart-library-sections";
import { SmartCartMealSections } from "./smart-cart-meal-sections";
import { SmartCartRecipeModal } from "./smart-cart-recipe-modal";
import { useFirstUseGuidance } from "../hooks/use-first-use-guidance";
import { useSmartCartGrocery } from "../hooks/use-smart-cart-grocery";
import { useSmartCartRecipe } from "../hooks/use-smart-cart-recipe";
import {
  ensureSmartCartProfile,
  type SmartCartPlan,
  type SmartCartProfile,
} from "../lib/smart-cart-membership";
import {
  clearStoredJson,
  fetchArchivedMealRows,
  fetchOwnedPantryItems,
  fetchSavedMealRows,
  saveWeekToCloud,
  saveStoredJson,
  SMART_CART_ACTION_GUIDANCE_STORAGE_KEY,
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
type MobileTab = "week" | "plan" | "meals" | "shop" | "cook" | "vault";
type ActionGuidancePreferences = {
  skipPermanentDeleteConfirm: boolean;
  skipRemoveFromMenuConfirm: boolean;
  skipSaveToMenuConfirm: boolean;
  skipVaultConfirm: boolean;
};

type FormState = {
  budget: string;
  diet: string;
  cuisinePreference: string;
  householdSize: string;
  mealSourceMode: "pantry-and-store" | "pantry-only";
  pantryItems: string;
  mustHaveIngredient: string;
  avoidIngredients: string;
  includeDessert: boolean;
  includeBreakfast: boolean;
  includeLunch: boolean;
  prepTime: string;
  adventureLevel: string;
  isBudgetTight: boolean;
  availableEquipment: string[];
};

const initialFormState: FormState = {
  budget: "75",
  diet: "Vegetarian",
  cuisinePreference: "",
  householdSize: "2",
  mealSourceMode: "pantry-and-store",
  pantryItems: "",
  mustHaveIngredient: "",
  avoidIngredients: "",
  includeDessert: false,
  includeBreakfast: false,
  includeLunch: false,
  prepTime: "Under 30 mins",
  adventureLevel: "Mix it up",
  isBudgetTight: true,
  availableEquipment: ["Oven", "Stovetop", "Microwave"],
};

const clearedFormState: FormState = {
  budget: "",
  diet: "",
  cuisinePreference: "",
  householdSize: "",
  mealSourceMode: "pantry-and-store",
  pantryItems: "",
  mustHaveIngredient: "",
  avoidIngredients: "",
  includeDessert: false,
  includeBreakfast: false,
  includeLunch: false,
  prepTime: "Under 30 mins",
  adventureLevel: "Stick to basics",
  isBudgetTight: true,
  availableEquipment: ["Oven", "Stovetop", "Microwave"],
};

const FREE_VAULT_LIMIT = 5;

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
    "Chicken wings",
    "Ground chicken",
    "Ground beef",
    "Ground pork",
    "Steak",
    "Pork chops",
    "Sausage",
    "Ground turkey",
    "Bacon",
    "Shrimp",
    "Salmon",
    "Tilapia",
    "Canned tuna",
    "Tofu",
  ],
  "DAIRY & REFRIGERATED": [
    "Milk",
    "Heavy cream",
    "Half-and-half",
    "Cheddar cheese",
    "Parmesan",
    "Mozzarella",
    "Yogurt",
    "Sour cream",
    "Cream cheese",
    "Cottage cheese",
    "Eggs",
    "Butter",
  ],
  "Oils & Condiments": [
    "Olive oil",
    "Vegetable oil",
    "Sesame oil",
    "Soy sauce",
    "Vinegar",
    "Mustard",
    "Dijon mustard",
    "Worcestershire sauce",
    "Barbecue sauce",
    "Hot sauce",
    "Ketchup",
    "Mayo",
    "Ranch dressing",
    "Salsa",
    "Honey",
    "Maple syrup",
  ],
  "Spices & Seasonings": [
    "Salt",
    "Black pepper",
    "Garlic powder",
    "Onion powder",
    "Paprika",
    "Smoked paprika",
    "Cumin",
    "Chili powder",
    "Cayenne",
    "Red pepper flakes",
    "Basil",
    "Thyme",
    "Parsley",
    "Curry powder",
    "Cinnamon",
    "Oregano",
    "Italian seasoning",
  ],
  "Baking Staples": [
    "White sugar",
    "Brown sugar",
    "All-purpose flour",
    "Cornstarch",
    "Baking powder",
    "Baking soda",
    "Cocoa powder",
    "Powdered sugar",
    "Chocolate chips",
    "Yeast",
    "Vanilla extract",
  ],
  "Canned & Jarred": [
    "Canned tomatoes",
    "Diced tomatoes",
    "Tomato paste",
    "Marinara sauce",
    "Black beans",
    "Chickpeas",
    "Corn",
    "Green chiles",
    "Refried beans",
    "Coconut milk",
    "Peanut butter",
    "Chicken broth",
    "Chicken stock",
    "Vegetable broth",
    "Vegetable stock",
  ],
  "Grains & Carbs": [
    "White rice",
    "Jasmine rice",
    "Basmati rice",
    "Brown rice",
    "Pasta",
    "Spaghetti",
    "Penne",
    "Oats",
    "Breadcrumbs",
    "Panko",
    "Quinoa",
    "Tortillas",
    "Bread",
    "Ramen noodles",
  ],
  VEGETABLES: [
    "Onions",
    "Garlic cloves",
    "Potatoes",
    "Sweet potatoes",
    "Carrots",
    "Celery",
    "Bell peppers",
    "Tomatoes",
    "Spinach",
    "Broccoli",
    "Mushrooms",
    "Zucchini",
    "Green beans",
    "Lettuce",
    "Cucumbers",
  ],
  FRUITS: [
    "Lemons",
    "Limes",
    "Apples",
    "Bananas",
    "Berries",
    "Avocados",
    "Oranges",
    "Grapes",
    "Pineapple",
  ],
} as const;

const SMART_CART_WAITLIST_ENDPOINT = "https://formspree.io/f/mqegdoly";
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
  description: string;
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
    description: "Set the week up once around budget, pantry, time, and taste.",
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
    description: "Review breakfast, lunch, dinner, Sweet Treats, and swaps.",
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
    description: "Use the shopping list, budget progress, and pantry checks together.",
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
    description: "Keep this week's meals handy and clear cooked items safely.",
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
    description: "Save favorites, sync your week, and track what is coming next.",
    accentClass: "text-amber-800",
    badgeClass: "bg-amber-100 text-amber-800",
    panelClass: "border-amber-200 bg-[#f7f1e7]",
    shellClass: "border-amber-200/80 bg-[#f7f1e7]/95",
    headerClass: "border-amber-200 bg-gradient-to-r from-amber-100 via-yellow-50 to-white",
    statusClass: "bg-white text-amber-800 shadow-sm",
  },
  {
    id: "week", label: "Your Week", shortLabel: "Week", eyebrow: "Weekly overview",
    description: "Your meals, shopping progress, and next step in one place.",
    accentClass: "text-pine", badgeClass: "bg-green-100 text-pine",
    panelClass: "border-pine/20 bg-[#fffdf8]", shellClass: "border-pine/20 bg-[#fffdf8]/95",
    headerClass: "border-pine/20 bg-white", statusClass: "bg-white text-pine shadow-sm",
  },
];

function MobileTabIcon({
  tab,
  className = "h-4 w-4",
}: {
  tab: MobileTab;
  className?: string;
}) {
  if (tab === "plan" || tab === "week") {
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
  const firstUseGuidance = useFirstUseGuidance();
  type SaveStatus = "idle" | "saving" | "saved" | "error";
  type ConfirmDialog =
    | { kind: "clear" }
    | { kind: "permanentDelete"; meal: MealPlanItem }
    | { kind: "removeFromMenu"; meal: MealPlanItem }
    | { kind: "saveToMenu"; meal: MealPlanItem }
    | { kind: "stashToVault"; meal: MealPlanItem }
    | null;
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [user, setUser] = useState<User | null>(null);
  const [membershipProfile, setMembershipProfile] = useState<SmartCartProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [hasResolvedAuthSession, setHasResolvedAuthSession] = useState(false);
  const [hasContinuedAsGuest, setHasContinuedAsGuest] = useState(false);
  const [showLaunchAnimation, setShowLaunchAnimation] = useState(false);
  const [email, setEmail] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [cloudSyncMessage, setCloudSyncMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const saveInFlight = useRef(false);
  const currentUserId = useRef(user?.id);
  currentUserId.current = user?.id;
  const [loadedCloudUser, setLoadedCloudUser] = useState<string | null>(null);
  const [recoveredDraftUser, setRecoveredDraftUser] = useState<string | null>(null);
  const cloudLoadInFlight = useRef<string | null>(null);
  const [cloudLoadingUser, setCloudLoadingUser] = useState<string | null>(null);
  const [isVaultLoading, setIsVaultLoading] = useState(false);
  const [vaultLoadError, setVaultLoadError] = useState<string | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);
  const [localSaveFailed, setLocalSaveFailed] = useState(false);
  const [guestStorageReady, setGuestStorageReady] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [generationPhase, setGenerationPhase] = useState<GenerationPhase | null>(null);
  const generationInFlight = useRef(false);
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
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog>(null);
  const [confirmDontShowAgain, setConfirmDontShowAgain] = useState(false);
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
  const [hasLoadedGeneratedPlan, setHasLoadedGeneratedPlan] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<MobileTab>("week");
  const mobileScrollPositions = useRef<Partial<Record<MobileTab, number>>>({});
  const [isStoreMode, setIsStoreMode] = useState(false);
  const [cookedHistory, setCookedHistory] = useState<{ key: string; entries: Array<{ name: string; cookedAt: string }> }>({ key: "", entries: [] });
  const [mealUndo, setMealUndo] = useState<{
    meal: MealPlanItem;
    position: number;
    sweetTreat: boolean;
    entry: { name: string; cookedAt: string };
    storageKey: string;
  } | null>(null);
  const cookedStorageKey = `mealcaddie-cooked-${user?.id || "guest"}`;
  useEffect(() => {
    setMealUndo(null);
    const stored = loadStoredJson<Array<{ name: string; cookedAt: string }>>(cookedStorageKey);
    setCookedHistory({ key: cookedStorageKey, entries: Array.isArray(stored) ? stored.filter(entry => typeof entry?.name === "string" && typeof entry?.cookedAt === "string") : [] });
  }, [cookedStorageKey]);
  useEffect(() => {
    if (cookedHistory.key === cookedStorageKey) saveStoredJson(cookedStorageKey, cookedHistory.entries);
  }, [cookedHistory, cookedStorageKey]);
  const [actionGuidance, setActionGuidance] = useState<ActionGuidancePreferences>({
    skipPermanentDeleteConfirm: false,
    skipRemoveFromMenuConfirm: false,
    skipSaveToMenuConfirm: false,
    skipVaultConfirm: false,
  });
  const userPlan: SmartCartPlan = membershipProfile?.plan === "plus" ? "plus" : "free";
  const isPlusMember = userPlan === "plus";
  const canPersistPantryMemory = isPlusMember;

  const showToast = useCallback((message: string, tone: ToastTone = "info") => {
    setToastMessage(message);
    setToastTone(tone);
  }, []);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);

    if (!isStandalone) {
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setShowLaunchAnimation(true);

    const timeoutId = window.setTimeout(
      () => setShowLaunchAnimation(false),
      prefersReducedMotion ? 900 : 4000,
    );

    return () => window.clearTimeout(timeoutId);
  }, []);

  const persistGeneratedPlan = useCallback((plan: GenerateListResponse | null) => {
    if (!plan) {
      clearStoredJson(SMART_CART_GENERATED_PLAN_STORAGE_KEY);
      return;
    }

    saveStoredJson(SMART_CART_GENERATED_PLAN_STORAGE_KEY, plan);
  }, []);

  const loadMembershipProfile = useCallback(async (nextUser: User | null) => {
    if (!nextUser?.id) {
      setMembershipProfile(null);
      setIsProfileLoading(false);
      return;
    }

    setIsProfileLoading(true);

    try {
      const profile = await ensureSmartCartProfile(nextUser.id, safeTrim(nextUser.email));
      setMembershipProfile(profile);
    } catch (error) {
      console.error("MealCaddie profile load error:", error);
      setMembershipProfile(null);
      setCloudSyncMessage(
        error instanceof Error ? error.message : "Failed to load your MealCaddie profile.",
      );
    } finally {
      setIsProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      setHasResolvedAuthSession(true);
      if (error) setAuthMessage("We couldn’t restore your sign-in. Please sign in again or continue as guest.");
      void loadMembershipProfile(nextUser);
    }).catch(() => {
      setHasResolvedAuthSession(true);
      setAuthMessage("We couldn’t restore your sign-in. Please sign in again or continue as guest.");
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        const nextUser = session?.user ?? null;
        setUser(nextUser);
        setHasResolvedAuthSession(true);
        if (event === "SIGNED_OUT" || currentUserId.current !== nextUser?.id) {
          setHasContinuedAsGuest(false);
          setActiveMobileTab("week");
        }
        void loadMembershipProfile(nextUser);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadMembershipProfile]);

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
      const savedActionGuidance =
        loadStoredJson<Partial<ActionGuidancePreferences>>(SMART_CART_ACTION_GUIDANCE_STORAGE_KEY);

      if (savedActionGuidance) {
        setActionGuidance({
          skipPermanentDeleteConfirm: Boolean(savedActionGuidance.skipPermanentDeleteConfirm),
          skipRemoveFromMenuConfirm: Boolean(savedActionGuidance.skipRemoveFromMenuConfirm),
          skipSaveToMenuConfirm: Boolean(savedActionGuidance.skipSaveToMenuConfirm),
          skipVaultConfirm: Boolean(savedActionGuidance.skipVaultConfirm),
        });
      }

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
        cuisinePreference: parsed.cuisinePreference ?? current.cuisinePreference,
        householdSize: parsed.householdSize ?? current.householdSize,
        mealSourceMode:
          parsed.mealSourceMode === "pantry-only" ? "pantry-only" : "pantry-and-store",
        pantryItems: parsed.pantryItems ?? current.pantryItems,
        mustHaveIngredient:
          parsed.mustHaveIngredient ?? current.mustHaveIngredient,
        avoidIngredients:
          parsed.avoidIngredients ?? current.avoidIngredients,
        includeDessert: parsed.includeDessert ?? current.includeDessert,
        includeBreakfast: parsed.includeBreakfast ?? false,
        includeLunch: parsed.includeLunch ?? false,
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
    saveStoredJson(SMART_CART_ACTION_GUIDANCE_STORAGE_KEY, actionGuidance);
  }, [actionGuidance]);

  useEffect(() => {
    if (!hasResolvedAuthSession || (user && isProfileLoading)) {
      return;
    }

    saveStoredJson(
      SMART_CART_FORM_STORAGE_KEY,
      {
        ...formState,
        pantryItems: canPersistPantryMemory ? formState.pantryItems : "",
        fullyStocked: canPersistPantryMemory ? Array.from(fullyStocked) : [],
        runningLow: canPersistPantryMemory ? Array.from(runningLow) : [],
        restock: canPersistPantryMemory ? Array.from(restock) : [],
      },
    );
  }, [
    canPersistPantryMemory,
    formState,
    fullyStocked,
    hasResolvedAuthSession,
    isProfileLoading,
    restock,
    runningLow,
    user,
  ]);

  useEffect(() => {
    if (!hasResolvedAuthSession || user) return;
    try {
      const parsed = loadStoredJson<MealPlanItem[]>(
        SMART_CART_WEEKLY_MENU_STORAGE_KEY,
      );

      setWeeklyMenu(Array.isArray(parsed) ? parsed.filter((meal) => meal && !meal.user_id) : []);
    } catch {
      clearStoredJson(SMART_CART_WEEKLY_MENU_STORAGE_KEY);
    }
  }, [hasResolvedAuthSession, user]);

  useEffect(() => {
    if (hasResolvedAuthSession && !user && guestStorageReady) saveStoredJson(SMART_CART_WEEKLY_MENU_STORAGE_KEY, weeklyMenu);
  }, [hasResolvedAuthSession, user, guestStorageReady, weeklyMenu]);

  useEffect(() => {
    if (!hasResolvedAuthSession || user) return;
    try {
      const parsed = loadStoredJson<MealPlanItem[]>(
        SMART_CART_SAVED_DESSERTS_STORAGE_KEY,
      );

      setSavedDesserts(Array.isArray(parsed) ? parsed.filter((meal) => meal && !meal.user_id) : []);
    } catch {
      clearStoredJson(SMART_CART_SAVED_DESSERTS_STORAGE_KEY);
    } finally {
      setGuestStorageReady(true);
    }
  }, [hasResolvedAuthSession, user]);

  useEffect(() => {
    if (hasResolvedAuthSession && !user && guestStorageReady) saveStoredJson(SMART_CART_SAVED_DESSERTS_STORAGE_KEY, savedDesserts);
  }, [hasResolvedAuthSession, user, guestStorageReady, savedDesserts]);

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
    if (typeof window === "undefined" || window.innerWidth >= 768) {
      return;
    }

    window.scrollTo({ top: mobileScrollPositions.current[activeMobileTab] ?? 0, behavior: "instant" });
  }, [activeMobileTab]);

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

  const currentSnapshot = weekSnapshot(weeklyMenu, savedDesserts, canPersistPantryMemory ? combinedPantryItems : null);
  const currentSnapshotRef = useRef(currentSnapshot);
  currentSnapshotRef.current = currentSnapshot;

  useEffect(() => {
    if (!user?.id || (loadedCloudUser !== user.id && recoveredDraftUser !== user.id)) return;
    const dirty = currentSnapshot !== savedSnapshot;
    const stored = saveStoredJson(weekDraftKey(user.id), {
      userId: user.id, dinners: weeklyMenu, desserts: savedDesserts,
      pantry: canPersistPantryMemory ? combinedPantryItems : [], dirty,
    });
    setLocalSaveFailed(!stored);
    if (saveStatus !== "saving" && saveStatus !== "error") {
      setSaveStatus(dirty ? "idle" : "saved");
      setCloudSyncMessage(dirty
        ? stored ? "Changes saved on this computer. Save to sync them across devices." : "This browser could not keep a draft. Save to cloud before leaving."
        : canPersistPantryMemory ? "Your week and pantry are saved to cloud." : "Your week is saved to cloud. Pantry memory is a Plus feature.");
    }
  }, [user?.id, loadedCloudUser, recoveredDraftUser, currentSnapshot, savedSnapshot, weeklyMenu, savedDesserts, canPersistPantryMemory, combinedPantryItems, saveStatus]);

  useEffect(() => {
    setLoadedCloudUser(null);
    setRecoveredDraftUser(null);
    setSavedSnapshot(null);
    setSaveStatus("idle");
    setCloudSyncMessage("");
    setArchivedMeals([]);
    setVaultLoadError(null);
    if (user?.id) {
      setGuestStorageReady(false);
      setWeeklyMenu([]);
      setSavedDesserts([]);
      setFullyStocked(new Set());
      setFormState((current) => ({ ...current, pantryItems: "" }));
    }
  }, [user?.id]);

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
    newCustomItem,
    resetGroceryState,
    restoredItems,
    setCustomItemChecked,
    setGroceryOpen,
    setNewCustomItem,
    skippedGroceriesByCategory,
    toggleCheckedItem,
    totalCost,
    removeCustomItem,
    removeGroceryItem,
    removeRestoredItem,
    restoreSkippedItem,
    undoMessage,
    undoLastGroceryAction,
  } = useSmartCartGrocery({
    userId: safeTrim(user?.id),
    formatCurrency,
    fullyStocked,
    pantryItems: combinedPantryItems,
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

  const activeGroceries = displayGroceriesByCategory.flatMap(([, items]) => items);
  const groceryCount = activeGroceries.length + customItems.length;
  const collectedCount = activeGroceries.filter(item => checkedItems.has(item.item_key)).length + customItems.filter(item => item.isChecked).length;
  const pantryCount = skippedGroceriesByCategory.reduce((count, [, items]) => count + items.length, 0);
  const hasShoppingSurfaceContent = Boolean(generatedPlan) || hasCookSurfaceContent || groceryCount > 0;
  const cookedCount = cookedHistory.key === cookedStorageKey
    ? countCookedThisWeek(cookedHistory.entries) : 0;
  function navigateToStage(stage: MobileTab) {
    if (window.innerWidth < 768) mobileScrollPositions.current[activeMobileTab] = window.scrollY;
    setActiveMobileTab(stage);
    if (stage === "vault") setIsVaultOpen(true);
    if (stage === "shop") setGroceryOpen(true);
    window.requestAnimationFrame(() => {
      if (window.innerWidth < 768) window.scrollTo({ top: mobileScrollPositions.current[stage] ?? 0, behavior: "instant" });
      else (document.getElementById(`desktop-${stage}`) ?? document.getElementById("desktop-meals"))?.scrollIntoView({ block: "start", behavior: "instant" });
    });
  }
  const grocerySidebar = (
    <SmartCartGrocerySidebar
                {...firstUseGuidance.propsFor("shop")}
                onEnterStoreMode={() => setIsStoreMode(true)}
                undoMessage={undoMessage}
                onUndo={undoLastGroceryAction}
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
                newCustomItem={newCustomItem}
                onAddCustomItem={handleAddCustomItem}
                onChangeCustomItem={setNewCustomItem}
                onCopyShoppingList={handleCopyShoppingList}
                onRemoveCustomItem={removeCustomItem}
                onRemoveGroceryItem={removeGroceryItem}
                onRemoveRestoredItem={removeRestoredItem}
                onRestoreSkippedItem={restoreSkippedItem}
                onSetCustomItemChecked={setCustomItemChecked}
                onToggleCheckedItem={toggleCheckedItem}
                onToggleGroceryOpen={() => setGroceryOpen(!isGroceryOpen)}
                parsedBudget={parsedBudget}
                rawBudgetPercentage={rawBudgetPercentage}
                restoredItems={restoredItems}
                skippedGroceriesByCategory={skippedGroceriesByCategory}
                totalCost={totalCost}
              />
  );
  const weekDashboard = <SmartCartWeekDashboard
    dinners={weeklyMenu} desserts={savedDesserts} cookedCount={cookedCount}
    groceryCount={groceryCount} collectedCount={collectedCount} pantryCount={pantryCount}
    estimatedCost={formatCurrency(totalCost)} budget={formatCurrency(parsedBudget || 0)}
    overBudget={totalCost > (parsedBudget || 0)}
    hasIngredients={[...weeklyMenu, ...savedDesserts].every(meal => Boolean(meal.ingredients?.length))}
    hasOptions={hasMealSurfaceContent} vaultCount={archivedMeals.length} onNavigate={navigateToStage}
  />;
  const candidatePlan = useMemo(() => deriveGroceryLists({ fullyStocked, runningLow, restock, pantryItems: combinedPantryItems,
    weeklyMenu: [...weeklyMenu, ...(generatedPlan?.meals ?? [])],
    savedDesserts: [...savedDesserts, ...(generatedPlan?.desserts ?? []).map(dessert => ({ name: dessert.title, ingredients: dessert.ingredients }))],
  }), [fullyStocked, runningLow, restock, combinedPantryItems, weeklyMenu, savedDesserts, generatedPlan]);
  const generationHandoff = generatedPlan ? <div className="mb-5 rounded-2xl border border-pine/20 bg-white p-5 lg:col-span-12" role="status">
    <p className="hidden md:block text-sm font-semibold text-pine">{(["dinner", "breakfast", "lunch"] as const).map((kind) => { const count = [...generatedPlan.meals, ...weeklyMenu].filter((meal) => getMealKind(meal) === kind).length; return count ? `${count} ${kind} options` : null; }).filter(Boolean).join(" · ")} · {generatedPlan.desserts.length + savedDesserts.length} sweet treats · {candidatePlan.skippedGroceryList.length} pantry ingredients used</p>
    <p className="text-sm font-semibold text-pine md:hidden">Your meal options are ready.</p>
    <p className="hidden md:block mt-2 text-sm leading-6 text-ink/65">{candidatePlan.derivedGroceryList.length} grocery items across all options. Choose the meals you want to cook. Your Week tracks your chosen meals and the groceries they need.</p>
    <button type="button" onClick={() => navigateToStage("week")} className="mt-4 rounded-full bg-pine px-5 py-3 text-sm font-semibold text-white">Review Your Week</button>
  </div> : null;

  async function submitPlan(applyUpgrades = false) {
    if (generationInFlight.current) return false;
    setValidationError(null);
    setRequestError(null);

    const budget = Number(formState.budget);
    const householdSize = Number(formState.householdSize);

    if (!Number.isFinite(budget) || budget <= 0) {
      setValidationError("Enter a weekly budget greater than $0.");
      return false;
    }

    if (!Number.isInteger(householdSize) || householdSize <= 0) {
      setValidationError("Household size must be a whole number greater than 0.");
      return false;
    }

    if (combinedPantryItems.length === 0) {
      setValidationError("Add at least one pantry item before generating a plan.");
      return false;
    }

    generationInFlight.current = true;
    setIsLoading(true);
    setGenerationPhase("building");

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
          cuisinePreference: isPlusMember ? safeTrim(formState.cuisinePreference) : "",
          householdSize,
          generationQuality: isPlusMember ? "plus" : "free",
          mealSourceMode: formState.mealSourceMode,
          combinedPantryItems: combinedPantryItems.join(", "),
          fullyStocked: Array.from(fullyStocked),
          runningLow: Array.from(runningLow),
          restock: Array.from(restock),
          mustHaveIngredient: safeTrim(formState.mustHaveIngredient),
          avoidIngredients: safeTrim(formState.avoidIngredients),
          includeDessert: formState.includeDessert,
          includeBreakfast: formState.includeBreakfast,
          includeLunch: formState.includeLunch,
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
        setRequestError(`Error ${response.status}: ${data.error || "Request failed."}`);
        return false;
      }
      setGenerationPhase("organizing");
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
      deriveGroceryLists({
        fullyStocked, runningLow, restock, pantryItems: combinedPantryItems,
        weeklyMenu: data.meals,
        savedDesserts: data.desserts.map((dessert) => ({ name: dessert.title, ingredients: dessert.ingredients })),
      });
      setGeneratedPlan(data);
      persistGeneratedPlan(data);
      resetGroceryState();
      setMealUndo(null);
      setIsStoreMode(false);
      resetRecipeState();
      setHasAppliedUpgrades(applyUpgrades);
      setSavedDesserts([]);
      setExpandedDetailCards(new Set());
      return true;
    } catch (error) {
      setRequestError(
        error instanceof DOMException && error.name === "AbortError"
          ? "Meal generation timed out. Please try again."
          : error instanceof Error
            ? error.message
            : "Failed to fetch",
      );
      return false;
    } finally {
      if (typeof timeoutId === "number") {
        window.clearTimeout(timeoutId);
      }
      generationInFlight.current = false;
      setGenerationPhase(null);
      setIsLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (generationInFlight.current) return;
    const didStartPlan = await submitPlan(false);
    if (didStartPlan) {
      navigateToStage("meals");
    } else {
      setActiveMobileTab("plan");
    }
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
          combinedPantryItems: Array.from(
            new Set([...combinedPantryItems, ...Array.from(runningLow)]),
          ).join(", "),
          mealSourceMode: formState.mealSourceMode,
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

  function performSaveToWeeklyMenu(meal: MealPlanItem) {
    const mealKey = `${meal.day}::${meal.name}`;
    const sweetTreat = isSweetTreatMeal(meal);
    const currentLineup = sweetTreat ? savedDesserts : weeklyMenu;
    if (currentLineup.some((item) => `${item.day}::${item.name}` === mealKey)) return;
    if (!sweetTreat && !hasRoomForMeal(weeklyMenu, meal)) {
      showToast(`This Week has five ${mealKindLabel(getMealKind(meal)).toLowerCase()} meals. Cook one before adding another.`, "info");
      return;
    }

    const addMeal = (current: MealPlanItem[]) =>
      current.some((item) => `${item.day}::${item.name}` === mealKey)
        ? current
        : [...current, meal];
    if (sweetTreat) setSavedDesserts(addMeal);
    else setWeeklyMenu(addMeal);

    setGeneratedPlan((current) => {
      if (!current) return current;
      const nextPlan = {
        ...current,
        meals: sweetTreat ? current.meals : current.meals.filter((item) => `${item.day}::${item.name}` !== mealKey),
        desserts: sweetTreat ? current.desserts.filter((item) => item.title !== meal.name) : current.desserts,
      };
      persistGeneratedPlan(nextPlan);
      return nextPlan;
    });
    showToast(`${meal.name} is in This Week and included in your shopping list.`, "success");
  }

  function handleSaveToWeeklyMenu(meal: MealPlanItem) {
    if (!actionGuidance.skipSaveToMenuConfirm) {
      setConfirmDontShowAgain(false);
      setConfirmDialog({ kind: "saveToMenu", meal });
      return;
    }

    performSaveToWeeklyMenu(meal);
  }

  function performRemoveFromWeeklyMenu(meal: MealPlanItem) {
    const mealKey = `${meal.day}::${meal.name}`;
    const sweetTreat = isSweetTreatMeal(meal);
    const lineup = sweetTreat ? savedDesserts : weeklyMenu;
    const position = lineup.findIndex((item) => `${item.day}::${item.name}` === mealKey);
    if (position < 0) return;
    const entry = { name: meal.name, cookedAt: new Date().toISOString() };
    setMealUndo({ meal: lineup[position], position, sweetTreat, entry, storageKey: cookedStorageKey });
    setCookedHistory((current) => ({ key: cookedStorageKey, entries: [...(current.key === cookedStorageKey ? current.entries : []), entry] }));
    const removeMeal = (current: MealPlanItem[]) => current.filter((item) => `${item.day}::${item.name}` !== mealKey);
    if (sweetTreat) setSavedDesserts(removeMeal);
    else setWeeklyMenu(removeMeal);
    setToastMessage(null);
    setToastTone("success");
  }

  function handleUndoCookedMeal() {
    if (!mealUndo || mealUndo.storageKey !== cookedStorageKey) return;
    const lineup = mealUndo.sweetTreat ? savedDesserts : weeklyMenu;
    if (!mealUndo.sweetTreat && !hasRoomForMeal(lineup, mealUndo.meal) && !lineup.some((meal) => meal.day === mealUndo.meal.day && meal.name === mealUndo.meal.name)) {
      setToastTone("info");
      return;
    }
    const restored = restoreMealAtPosition(lineup, mealUndo.meal, mealUndo.position);
    if (!restored) {
      setToastTone("info");
      return;
    }
    if (mealUndo.sweetTreat) setSavedDesserts(restored);
    else setWeeklyMenu(restored);
    setCookedHistory((current) => current.key === cookedStorageKey
      ? { ...current, entries: undoCookedEntry(current.entries, mealUndo.entry) }
      : current);
    setMealUndo(null);
    showToast(`${mealUndo.meal.name} is back in This Week. Your shopping list and cooked count are updated.`, "success");
  }

  function handleRemoveFromWeeklyMenu(meal: MealPlanItem) {
    if (!actionGuidance.skipRemoveFromMenuConfirm) {
      setConfirmDontShowAgain(false);
      setConfirmDialog({ kind: "removeFromMenu", meal });
      return;
    }

    performRemoveFromWeeklyMenu(meal);
  }

  async function performArchiveMeal(meal: MealPlanItem) {
      const userId = user?.id || "";
      if (!userId) {
        showToast("Please sign in before using the Recipe Vault.", "info");
        return;
    }
    if (isVaultLoading || vaultLoadError) {
      showToast("Your Vault has not finished loading. Open Vault and retry before saving another recipe.", "info");
      return;
    }

      const mealMatcher = (candidate: MealPlanItem) =>
        meal.dbId
          ? candidate.dbId === meal.dbId
          : candidate.name === meal.name;

      if (!isPlusMember && archivedMeals.length >= FREE_VAULT_LIMIT) {
        showToast(
          `Free plans can save up to ${FREE_VAULT_LIMIT} recipes in the vault. MealCaddie Plus expands your library.`,
          "info",
        );
        return;
      }

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
      recipe_data: meal,
      type: getMealKind(meal),
    };

    const { data, error } = await supabase
      .from("archived_meals")
      .insert([archivedPayload])
      .select();

    if (error) {
      console.error("Vault Save Error:", error);
      showToast(`Vault save failed. Your recipe is still here. ${saveErrorMessage(error)}`, "error");
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
            desserts: current.desserts.filter((dessert) => dessert.title !== meal.name),
          };

          persistGeneratedPlan(nextPlan);
          return nextPlan;
        });
        setWeeklyMenu((current) => current.filter((savedMeal) => !mealMatcher(savedMeal)));
        setSavedDesserts((current) =>
          current.filter((savedDessert) => !mealMatcher(savedDessert)),
        );
        showToast(
          `${meal.name} is safe in your Recipe Vault for a future week.`,
          "success",
        );
    }
  }

  async function handleArchiveMeal(meal: MealPlanItem) {
    if (!actionGuidance.skipVaultConfirm) {
      setConfirmDontShowAgain(false);
      setConfirmDialog({ kind: "stashToVault", meal });
      return;
    }

    await performArchiveMeal(meal);
  }

  function handleRestoreMeal(meal: MealPlanItem) {
    if (!hasRoomForMeal(weeklyMenu, meal)) {
      showToast(`This Week has five ${mealKindLabel(getMealKind(meal)).toLowerCase()} meals. Cook one before adding another.`, "info");
      return;
    }

    const mealMatcher = (candidate: MealPlanItem) =>
      meal.dbId
        ? candidate.dbId === meal.dbId
        : candidate.name === meal.name;

    // Adding a favorite to this week keeps its reusable cloud Vault copy.

    if (isSweetTreatMeal(meal)) {
      setSavedDesserts((current) =>
        current.some((savedDessert) => mealMatcher(savedDessert))
          ? current
          : [...current, meal],
      );
      showToast(`${meal.name} is in This Week and included in your shopping list.`, "success");
      return;
    }

    setWeeklyMenu((current) => {
      if (current.some((savedMeal) => mealMatcher(savedMeal))) {
        return current;
      }

      if (!hasRoomForMeal(current, meal)) {
        return current;
      }

      return [...current, meal];
    });
    showToast(`${meal.name} is in This Week and included in your shopping list.`, "success");
  }

  async function performPermanentDelete(meal: MealPlanItem) {
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
      showToast(`${meal.name} was permanently deleted.`, "info");
    } catch (error) {
      setCloudSyncMessage(
        error instanceof Error ? error.message : "Failed to permanently delete meal.",
      );
    }
  }

  async function handlePermanentDelete(meal: MealPlanItem) {
    if (!actionGuidance.skipPermanentDeleteConfirm) {
      setConfirmDontShowAgain(false);
      setConfirmDialog({ kind: "permanentDelete", meal });
      return;
    }

    await performPermanentDelete(meal);
  }

  function handleToggleDessertSave(
    dessert: GenerateListResponse["desserts"][number],
    index: number,
  ) {
    const isAlreadySaved = savedDesserts.some(
      (savedDessert) => savedDessert.name === dessert.title,
    );
    const dessertMeal: MealPlanItem = {
      user_id: safeTrim(user?.id),
      day: `Sweet Treat ${index + 1}`,
      name: dessert.title,
      servings: Number(formState.householdSize) || 2,
      notes: dessert.description,
      ingredients: dessert.ingredients,
      imageUrl: dessert.imageUrl,
    };

    if (!isAlreadySaved) {
      handleSaveToWeeklyMenu(dessertMeal);
      return;
    }

    setSavedDesserts((current) =>
      current.filter((savedDessert) => savedDessert.name !== dessert.title),
    );

    setGeneratedPlan((current) => {
      if (!current) {
        return current;
      }

      const nextPlan = {
        ...current,
        desserts: current.desserts.some((currentDessert) => currentDessert.title === dessert.title)
          ? current.desserts
          : [...current.desserts, dessert],
      };

      persistGeneratedPlan(nextPlan);
      return nextPlan;
    });
    showToast(`Nice — ${dessert.title} is off this week’s cook lineup.`, "success");
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
    setGeneratedPlan(null);
    persistGeneratedPlan(null);
    setFullyStocked(new Set());
    setRunningLow(new Set());
    setRestock(new Set());
    setHasAppliedUpgrades(false);
    resetGroceryState();
    setMealUndo(null);
    setIsStoreMode(false);
    resetRecipeState();
    setWeeklyMenu([]);
    setSavedDesserts([]);
    setReplacingMealKey(null);
    setReplacingDessertKey(null);
    setRecentRejectedMeals([]);
    setExpandedDetailCards(new Set());
    mobileScrollPositions.current = {};
    setCloudSyncMessage("");
    setSaveStatus("idle");
    setIsEquipmentSheetOpen(false);
    setIsPantryOpen(false);
    setIsPantrySelectionOpen(false);
    setActiveMobileTab("plan");

    clearStoredJson(
      SMART_CART_FORM_STORAGE_KEY,
      SMART_CART_WEEKLY_MENU_STORAGE_KEY,
      SMART_CART_SAVED_DESSERTS_STORAGE_KEY,
      SMART_CART_GENERATED_PLAN_STORAGE_KEY,
    );

    if (userId) {
      try {
        await saveWeekToCloud(userId, [], canPersistPantryMemory ? [] : null);
        if (currentUserId.current === userId) setSavedSnapshot(weekSnapshot([], [], canPersistPantryMemory ? [] : null));
      } catch (error) {
        console.error("Failed to clear cloud session state:", error);
        setSaveStatus("error");
        setCloudSyncMessage(`The workspace was reset on this computer, but cloud reset failed. Retry Save to sync the empty week. ${saveErrorMessage(error)}`);
        showToast("Local workspace reset. Cloud reset failed; retry saving before leaving.", "error");
        return;
      }
    }

    showToast("Workspace reset. Your Recipe Vault is still safe.", "success");
  }

  function handleClearForm() {
    if (generationInFlight.current) return;
    setConfirmDontShowAgain(false);
    setConfirmDialog({ kind: "clear" });
  }

  async function handleConfirmDialogConfirm() {
    const currentDialog = confirmDialog;

    if (!currentDialog) {
      return;
    }

    if (confirmDontShowAgain) {
      if (currentDialog.kind === "permanentDelete") {
        setActionGuidance((current) => ({ ...current, skipPermanentDeleteConfirm: true }));
      }

      if (currentDialog.kind === "removeFromMenu") {
        setActionGuidance((current) => ({ ...current, skipRemoveFromMenuConfirm: true }));
      }

      if (currentDialog.kind === "saveToMenu") {
        setActionGuidance((current) => ({ ...current, skipSaveToMenuConfirm: true }));
      }

      if (currentDialog.kind === "stashToVault") {
        setActionGuidance((current) => ({ ...current, skipVaultConfirm: true }));
      }
    }

    setConfirmDialog(null);
    setConfirmDontShowAgain(false);

    if (currentDialog.kind === "clear") {
      await performClearForm();
      return;
    }

    if (currentDialog.kind === "permanentDelete") {
      await performPermanentDelete(currentDialog.meal);
      return;
    }

    if (currentDialog.kind === "removeFromMenu") {
      performRemoveFromWeeklyMenu(currentDialog.meal);
      return;
    }

    if (currentDialog.kind === "saveToMenu") {
      performSaveToWeeklyMenu(currentDialog.meal);
      return;
    }

    if (currentDialog.kind === "stashToVault") {
      await performArchiveMeal(currentDialog.meal);
    }
  }

  const confirmDialogTitle =
    confirmDialog?.kind === "permanentDelete"
      ? "Permanently Delete This Meal?"
      : confirmDialog?.kind === "removeFromMenu"
        ? "Cooked This Meal?"
      : confirmDialog?.kind === "saveToMenu"
      ? "Add This Meal to This Week?"
      : confirmDialog?.kind === "stashToVault"
        ? "Save This Meal to the Vault?"
        : "Reset Workspace?";

  const confirmDialogBody =
    confirmDialog?.kind === "permanentDelete"
      ? `This will permanently delete ${confirmDialog.meal.name}. It will not stay in your weekly lineup or your vault.`
      : confirmDialog?.kind === "removeFromMenu"
        ? `Mark ${confirmDialog.meal.name} as cooked and remove it from your Cook Lineup and shopping list. Your Week will record it as cooked on this device.`
      : confirmDialog?.kind === "saveToMenu"
      ? `This will move ${confirmDialog.meal.name} into your Cook lineup for this week and use it to help build your shopping list.`
      : confirmDialog?.kind === "stashToVault"
        ? `This will remove ${confirmDialog.meal.name} from the active plan and save it in your Recipe Vault so you can bring it back later.`
        : "This will clear your form and active Cook lineup, but your Recipe Vault will remain safe.";

  const confirmDialogConfirmLabel =
    confirmDialog?.kind === "permanentDelete"
      ? "Delete Forever"
      : confirmDialog?.kind === "removeFromMenu"
        ? "Cooked It"
      : confirmDialog?.kind === "saveToMenu"
      ? "Add to This Week"
      : confirmDialog?.kind === "stashToVault"
        ? "Save to Vault"
        : "Reset Workspace";

  const confirmDialogCancelLabel =
    confirmDialog?.kind === "clear" ? "Keep My Work" : "Cancel";

  const confirmDialogOptOutLabel =
    confirmDialog?.kind === "permanentDelete"
      ? "Don’t show this Permanent Delete reminder again."
      : confirmDialog?.kind === "removeFromMenu"
        ? "Don’t show this cooked-meal reminder again."
      : confirmDialog?.kind === "saveToMenu"
      ? "Don’t show this Cook lineup reminder again."
      : confirmDialog?.kind === "stashToVault"
        ? "Don’t show this Vault reminder again."
        : undefined;

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

  async function startGoogleLogin() {
    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/` : undefined;

    return supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        queryParams: {
          prompt: "consent select_account",
        },
        redirectTo,
      },
    });
  }

  async function handleGoogleLogin() {
    setIsAuthLoading(true);
    setAuthMessage("");

    const { error } = await startGoogleLogin();

    if (error) {
      setAuthMessage(error.message);
      setIsAuthLoading(false);
      return;
    }

    setAuthMessage("Redirecting to Google...");
  }

  async function handleSwitchGoogleAccount() {
    setIsAuthLoading(true);
    setAuthMessage("");

    const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });

    if (signOutError) {
      setAuthMessage(signOutError.message);
      setIsAuthLoading(false);
      return;
    }

    const { error } = await startGoogleLogin();

    if (error) {
      setAuthMessage(error.message);
      setIsAuthLoading(false);
      return;
    }

    setAuthMessage("Redirecting to Google account chooser...");
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
      .filter((row) => row.type === "dinner" || row.type === "breakfast" || row.type === "lunch")
      .map((row) =>
        rehydrateMealRecord((row.recipe_data ?? { ...row, name: row.meal_title }) as Partial<MealPlanItem> | null, {
          dbId: row.id ?? undefined,
          user_id: safeTrim(row.user_id),
          day: row.type === "breakfast" ? "Breakfast" : row.type === "lunch" ? "Lunch" : "",
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
    if (cloudLoadInFlight.current === userId) return;
    cloudLoadInFlight.current = userId;
    setCloudLoadingUser(userId);
    const draft = recoverWeekDraft<MealPlanItem>(loadStoredJson(weekDraftKey(userId)), userId);
    if (draft?.dirty) {
      setWeeklyMenu(draft.dinners);
      setSavedDesserts(draft.desserts);
      if (canPersistPantryMemory) setFullyStocked(new Set(draft.pantry));
    }
    setCloudSyncMessage("Loading your saved week...");
    try {
      const [ownedPantryItems, { dinners: hydratedDinners, desserts: hydratedDesserts }] =
        await Promise.all([
          canPersistPantryMemory ? fetchOwnedPantryItems(userId) : Promise.resolve([]),
          fetchSavedMeals(userId),
        ]);

      if (currentUserId.current !== userId) return;
      // Retain an older account-owned unsynced lineup during the first upgrade.
      const legacyDinners = loadStoredJson<MealPlanItem[]>(SMART_CART_WEEKLY_MENU_STORAGE_KEY);
      const legacyDesserts = loadStoredJson<MealPlanItem[]>(SMART_CART_SAVED_DESSERTS_STORAGE_KEY);
      const ownedLegacyDinners = Array.isArray(legacyDinners) ? legacyDinners.filter((meal) => meal?.user_id === userId) : [];
      const ownedLegacyDesserts = Array.isArray(legacyDesserts) ? legacyDesserts.filter((meal) => meal?.user_id === userId) : [];
      const recoverLegacy = !draft && (ownedLegacyDinners.length > 0 || ownedLegacyDesserts.length > 0);
      const resolvedWeeklyMenu = draft?.dirty ? draft.dinners : recoverLegacy ? ownedLegacyDinners : hydratedDinners;
      const resolvedSavedDesserts = draft?.dirty ? draft.desserts : recoverLegacy ? ownedLegacyDesserts : hydratedDesserts;
      const resolvedPantryItems = ownedPantryItems
        .map((ingredientName) => safeTrim(ingredientName))
        .filter(Boolean);

      if (canPersistPantryMemory) {
        setFullyStocked(new Set(draft?.dirty ? draft.pantry : resolvedPantryItems));
        setRunningLow(new Set());
        setRestock(new Set());
      }

      setWeeklyMenu(resolvedWeeklyMenu);
      setSavedDesserts(resolvedSavedDesserts);
      setSavedSnapshot(weekSnapshot(hydratedDinners, hydratedDesserts, canPersistPantryMemory ? resolvedPantryItems : null));
      setLoadedCloudUser(userId);
      setSaveStatus("idle");
    } catch (error) {
      if (currentUserId.current !== userId) return;
      if (draft?.dirty) setRecoveredDraftUser(userId);
      setCloudSyncMessage(`Could not load your saved week. Retry Save will retry loading first. ${saveErrorMessage(error)}`);
      setSaveStatus("error");
    } finally {
      if (cloudLoadInFlight.current === userId) cloudLoadInFlight.current = null;
      setCloudLoadingUser((current) => current === userId ? null : current);
    }
  }, [canPersistPantryMemory, fetchSavedMeals]);

  const loadArchivedMeals = useCallback(async () => {
    if (!user?.id) {
      return;
    }

    setIsVaultLoading(true);
    setVaultLoadError(null);
    try {
      const archivedMealRows = await fetchArchivedMealRows(user.id);
      if (currentUserId.current !== user.id) return;

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
                  : row.type === "breakfast" ? "Breakfast" : row.type === "lunch" ? "Lunch" : "",
              servings: Number(formState.householdSize) || 2,
            },
          ),
        )
        .filter((meal): meal is MealPlanItem => Boolean(meal));

      setArchivedMeals(hydratedVaultMeals);
    } catch (error) {
      if (currentUserId.current !== user.id) return;
      console.error("Vault Load Error:", error);
      setVaultLoadError(`Could not load your Vault. ${saveErrorMessage(error)}`);
    } finally {
      if (currentUserId.current === user.id) setIsVaultLoading(false);
    }
  }, [formState.householdSize, rehydrateMealRecord, user?.id]);

  useEffect(() => {
    const userId = user?.id || "";
    if (!userId || isProfileLoading || !membershipProfile || loadedCloudUser === userId) {
      return;
    }

    void loadSessionFromCloud(userId);
  }, [loadSessionFromCloud, user?.id, isProfileLoading, membershipProfile, loadedCloudUser]);

  useEffect(() => {
    void loadArchivedMeals();
  }, [loadArchivedMeals]);

  async function saveSessionToCloud() {
    const userId = user?.id || "";
    if (!userId || saveInFlight.current) {
      return;
    }

    if (loadedCloudUser !== userId) {
      if (isProfileLoading || !membershipProfile) return;
      await loadSessionFromCloud(userId);
      return;
    }

    saveInFlight.current = true;
    const snapshotBeingSaved = currentSnapshot;
    setIsSaving(true);
    setSaveStatus("saving");
    setCloudSyncMessage("");

    try {
      const activeDessertRows = savedDesserts.map((dessert) => ({
        meal_title: dessert.name,
        recipe_data: {
          ...dessert,
        },
        type: "sweet_treat",
        status: "active_week",
        user_id: userId,
      }));

      const weeklyMenuRows = [
        ...weeklyMenu.map((meal) => ({
          meal_title: meal.name,
          recipe_data: meal,
          type: getMealKind(meal),
          status: "active_week",
          user_id: userId,
        })),
        ...activeDessertRows,
      ];

      await saveWeekToCloud(userId, weeklyMenuRows, canPersistPantryMemory ? combinedPantryItems : null);
      if (currentUserId.current !== userId) return;
      setSavedSnapshot(snapshotBeingSaved);
      const stillSaved = currentSnapshotRef.current === snapshotBeingSaved;
      setSaveStatus(stillSaved ? "saved" : "idle");
      setCloudSyncMessage(stillSaved ? "Your week is saved to cloud." : "The earlier version was saved. Save again to sync your latest changes.");
    } catch (error) {
      console.error("Supabase Save Error:", error);
      if (currentUserId.current !== userId) return;
      setCloudSyncMessage(
        `Save failed. ${localSaveFailed ? "Keep this page open and retry." : "Your draft is still on this computer."} ${saveErrorMessage(error)}`,
      );
      setSaveStatus("error");
    } finally {
      saveInFlight.current = false;
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

  async function handleUpgradeToPlus() {
    const userId = safeTrim(user?.id);

    if (!userId) {
      showToast("Please sign in to preview MealCaddie Plus.", "info");
      return;
    }

    if (isPlusMember) {
      showToast("This account is already on MealCaddie Plus.", "info");
      return;
    }

    setWaitlistEmail((current) => current || safeTrim(user?.email));
    setActiveMobileTab("vault");
    showToast("MealCaddie Plus is not taking payments yet. Join the waitlist for early access.", "info");
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
            cuisinePreference: isPlusMember ? safeTrim(formState.cuisinePreference) : "",
            householdSize,
            combinedPantryItems: combinedPantryItems.join(", "),
            rejectedMealTitle: meal.name,
            mealType: getMealKind(meal),
            replacementQuality: isPlusMember ? "plus" : "free",
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

  if (!hasResolvedAuthSession || (!user && !hasContinuedAsGuest)) {
    return <SmartCartWelcome
      ready={hasResolvedAuthSession}
      busy={isAuthLoading}
      email={email}
      message={authMessage}
      onEmailChange={setEmail}
      onGoogleLogin={handleGoogleLogin}
      onEmailLogin={handleLogin}
      onContinueAsGuest={() => {
        setHasContinuedAsGuest(true);
        setActiveMobileTab(weeklyMenu.length || savedDesserts.length ? "week" : "plan");
        window.scrollTo({ top: 0, behavior: "instant" });
      }}
    />;
  }

  return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fffaf2,_#f3efe6_55%,_#ebe7df)] flex flex-col items-center px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-4 md:pb-12 md:pt-8">
        <SmartCartStoreMode
          open={isStoreMode} onClose={() => setIsStoreMode(false)}
          groups={displayGroceriesByCategory} checkedItems={checkedItems} customItems={customItems}
          onToggleItem={toggleCheckedItem} onRemoveItem={removeGroceryItem}
          onCheckCustom={setCustomItemChecked} onRemoveCustom={removeCustomItem}
          undoMessage={undoMessage} onUndo={undoLastGroceryAction}
        />
        {showLaunchAnimation ? (
          <div
            aria-label="MealCaddie is opening"
            className="fixed inset-0 z-[70] flex items-center justify-center overflow-hidden bg-[#f8f0df]"
            role="status"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_25%,rgba(248,180,109,0.34),transparent_30%),radial-gradient(circle_at_68%_72%,rgba(79,112,84,0.24),transparent_32%)]" />
            <div className="launch-cart-scene relative flex flex-col items-center px-6 text-center">
              <div className="launch-cart-badge mb-5 rounded-full border border-white/80 bg-white/70 px-4 py-2 text-xs font-bold uppercase tracking-[0.28em] text-pine shadow-lg backdrop-blur">
                MealCaddie
              </div>
              <div className="launch-cart-track relative h-28 w-72 max-w-[80vw]">
                <div className="launch-cart-shadow absolute bottom-2 left-1/2 h-4 w-40 -translate-x-1/2 rounded-full bg-ink/10 blur-sm" />
                <svg
                  aria-hidden="true"
                  className="launch-cart-icon absolute bottom-2 left-1/2 h-24 w-24 -translate-x-1/2 text-pine"
                  fill="none"
                  viewBox="0 0 120 120"
                >
                  <path
                    d="M25 28h10l10 45h43l9-31H43"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="7"
                  />
                  <path
                    d="M48 42c4-13 20-13 24 0"
                    stroke="#f39a63"
                    strokeLinecap="round"
                    strokeWidth="7"
                  />
                  <path
                    d="M56 42c-4-9 1-18 10-21 4 8 2 17-6 22"
                    fill="#8faa73"
                  />
                  <circle cx="52" cy="88" fill="#1b120d" r="7" />
                  <circle cx="84" cy="88" fill="#1b120d" r="7" />
                  <path
                    d="M47 56h42"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="5"
                  />
                </svg>
              </div>
              <p className="launch-cart-title mt-6 font-display text-4xl text-ink">
                Carry less of the week.
              </p>
              <p className="launch-cart-copy mt-3 max-w-sm text-sm leading-6 text-ink/65">
                Pantry checked. Cart warmed up. Your calmer meal plan is ready.
              </p>
            </div>
          </div>
        ) : null}
        <SmartCartGenerationProgress phase={generationPhase} includeDessert={formState.includeDessert} includeBreakfast={formState.includeBreakfast} includeLunch={formState.includeLunch} />
        <SmartCartFeedback
          undoMessage={mealUndo?.storageKey === cookedStorageKey
            ? !mealUndo.sweetTreat && !hasRoomForMeal(weeklyMenu, mealUndo.meal) && !weeklyMenu.some((item) => item.day === mealUndo.meal.day && item.name === mealUndo.meal.name)
              ? `This Week is full. Make room to restore ${mealUndo.meal.name}, then use Undo.`
              : `${mealUndo.meal.name} marked cooked. Undo to put it back in This Week.`
            : null}
          onUndo={handleUndoCookedMeal}
          onDismissUndo={() => setMealUndo(null)}
        confirmBody={confirmDialogBody}
        confirmCancelLabel={confirmDialogCancelLabel}
        confirmConfirmLabel={confirmDialogConfirmLabel}
        confirmOpen={Boolean(confirmDialog)}
        confirmOptOutChecked={confirmDontShowAgain}
        confirmOptOutLabel={confirmDialogOptOutLabel}
        confirmTitle={confirmDialogTitle}
        onCancelConfirm={() => {
          setConfirmDialog(null);
          setConfirmDontShowAgain(false);
        }}
        onConfirm={() => {
          void handleConfirmDialogConfirm();
        }}
        onToggleConfirmOptOut={() => setConfirmDontShowAgain((current) => !current)}
        toastMessage={toastMessage}
        toastTone={toastTone}
      />
      <header className="flex w-full max-w-7xl items-center justify-between border-b border-stone-200 pb-3 md:hidden">
        <h1 className="font-display text-2xl text-ink">{activeTabMeta.label}</h1>
        <span className="text-sm font-semibold text-pine">MealCaddie</span>
      </header>
      <div className="w-full max-w-7xl mx-auto flex flex-col gap-4 md:gap-8 font-body">
        <div className={activeMobileTab === "plan" ? "block md:block" : "hidden md:block"}>
            <SmartCartHeroHeader
              authMessage={authMessage}
              email={email}
              isAuthLoading={isAuthLoading}
              isProfileLoading={isProfileLoading}
              onEmailChange={setEmail}
              onGoogleLogin={handleGoogleLogin}
              onSwitchGoogleAccount={handleSwitchGoogleAccount}
              onUpgrade={handleUpgradeToPlus}
              onLoginSubmit={handleLogin}
              onSignOut={() => {
                void supabase.auth.signOut();
              }}
              userPlan={membershipProfile?.plan ?? null}
              userEmail={safeTrim(user?.email)}
            />
        </div>

        <div className="grid gap-4 md:hidden">
            <section
              className={`min-w-0 py-4 ${
                activeMobileTab === "plan" ? `block ${activeTabMeta.panelClass}` : "hidden"
              }`}
            >
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
              onCuisinePreferenceChange={(value) =>
                setFormState((current) => ({
                  ...current,
                  cuisinePreference: value,
                }))
              }
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
              onMealSourceModeChange={(value) =>
                setFormState((current) => ({
                  ...current,
                  mealSourceMode: value,
                }))
              }
              onIncludeDessertChange={(checked) =>
                setFormState((current) => ({
                  ...current,
                  includeDessert: checked,
                }))
              }
              onIncludeBreakfastChange={(checked) => setFormState((current) => ({ ...current, includeBreakfast: checked }))}
              onIncludeLunchChange={(checked) => setFormState((current) => ({ ...current, includeLunch: checked }))}
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
              userPlan={userPlan}
            />
          </section>

            <section
              className={`min-w-0 py-4 ${
                activeMobileTab === "meals" ? `block ${mobileTabs[1].panelClass}` : "hidden"
              }`}
            >
            {generatedPlan ? (
              <>
              {generationHandoff}
              <SmartCartMealSections
                cuisinePreference={formState.cuisinePreference}
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
                userPlan={userPlan}
                userId={safeTrim(user?.id)}
                weeklyMenu={weeklyMenu}
              />
              </>
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-rose-200 bg-rose-50 px-4 py-10 text-center text-ink/60">
                <p className="font-display text-2xl text-ink">Meals will land here</p>
                <p className="mt-3 text-sm leading-7">
                  Build your plan first, then return here to choose your meals and Sweet Treats.
                </p>
              </div>
            )}
            </section>

            <section
              className={`min-w-0 py-4 ${
                activeMobileTab === "shop" ? `block ${mobileTabs[2].panelClass}` : "hidden"
              }`}
            >
            {hasShoppingSurfaceContent ? (
              grocerySidebar
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-emerald-200 bg-white px-4 py-10 text-center text-ink/60">
                <p className="font-display text-2xl text-ink">Your grocery list will appear here</p>
                <p className="mt-3 text-sm leading-7">
                  Generate a menu first and MealCaddie will organize what you need to buy.
                </p>
              </div>
            )}
          </section>

            <section
              className={`min-w-0 py-4 ${
                activeMobileTab === "cook" ? `block ${mobileTabs[3].panelClass}` : "hidden"
              }`}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-sm text-ink/60">{cloudSyncMessage || "Keep this week ready across devices."}</p>
                <button type="button" disabled={isSaving || cloudLoadingUser === user?.id || !user} onClick={() => void saveSessionToCloud()} className="min-h-11 shrink-0 rounded-full bg-pine px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                  {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : saveStatus === "error" ? "Retry Save" : "Save Week"}
                </button>
              </div>
              <SmartCartCookSections
                {...firstUseGuidance.propsFor("cook")}
                expandedDetailCards={expandedDetailCards}
                expandedIngredientsMeals={expandedIngredientsMeals}
                formatCardEyebrow={formatCardEyebrow}
                onArchiveMeal={handleArchiveMeal}
                onGetRecipe={handleGetRecipe}
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
              className={`min-w-0 py-4 ${
                activeMobileTab === "vault" ? `block ${mobileTabs[4].panelClass}` : "hidden"
              }`}
            >
            <SmartCartLibrarySections
                {...firstUseGuidance.propsFor("vault")}
              archivedMeals={archivedMeals}
              cloudSyncMessage={cloudSyncMessage}
              expandedDetailCards={expandedDetailCards}
              expandedIngredientsMeals={expandedIngredientsMeals}
              formatCardEyebrow={formatCardEyebrow}
              isSaving={isSaving || cloudLoadingUser === user?.id}
              saveStatus={saveStatus}
              isVaultOpen={isVaultOpen}
              isVaultLoading={isVaultLoading}
              vaultLoadError={vaultLoadError}
              onRetryVault={loadArchivedMeals}
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
              userPlan={userPlan}
              userSignedIn={Boolean(user)}
              vaultLimit={FREE_VAULT_LIMIT}
              waitlistEmail={waitlistEmail}
              waitlistStatus={waitlistStatus}
            />
          </section>
        </div>

        <div className={activeMobileTab === "week" ? "block py-4 md:hidden" : "hidden"}>{weekDashboard}</div>
        <div className="hidden md:block">
          <div id="desktop-week" className="mb-8 scroll-mt-8">{weekDashboard}</div>
          <div id="desktop-plan" className="scroll-mt-8" />
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
            onCuisinePreferenceChange={(value) =>
              setFormState((current) => ({
                ...current,
                cuisinePreference: value,
              }))
            }
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
            onMealSourceModeChange={(value) =>
              setFormState((current) => ({
                ...current,
                mealSourceMode: value,
              }))
            }
            onIncludeDessertChange={(checked) =>
              setFormState((current) => ({
                ...current,
                includeDessert: checked,
              }))
            }
            onIncludeBreakfastChange={(checked) => setFormState((current) => ({ ...current, includeBreakfast: checked }))}
            onIncludeLunchChange={(checked) => setFormState((current) => ({ ...current, includeLunch: checked }))}
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
            userPlan={userPlan}
          />
          <section className="mt-10 pb-16">
            {generatedPlan ? (
              <div id="desktop-meals" className="grid scroll-mt-8 grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {generationHandoff}
                <SmartCartMealSections
                  cuisinePreference={formState.cuisinePreference}
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
                  userPlan={userPlan}
                  userId={safeTrim(user?.id)}
                  weeklyMenu={weeklyMenu}
                />
                <div id="desktop-shop" className="scroll-mt-8 lg:col-span-4">
                {grocerySidebar}
                </div>
              </div>
            ) : (
              <div id="desktop-meals" className="scroll-mt-8 rounded-[2rem] border border-dashed border-pine/20 bg-white/40 p-10 text-center text-ink/60">
                <p className="font-display text-2xl text-ink">Your generated plan will appear here</p>
                <p className="mt-3 text-sm leading-7">
                  Select your preferences and pantry items above to get started.
                </p>
              </div>
            )}
            {!generatedPlan && hasShoppingSurfaceContent ? <div id="desktop-shop" className="mt-8 scroll-mt-8">{grocerySidebar}</div> : null}
            <div id="desktop-cook" className="mt-8 scroll-mt-8">
              <SmartCartCookSections
                {...firstUseGuidance.propsFor("cook")}
                expandedDetailCards={expandedDetailCards}
                expandedIngredientsMeals={expandedIngredientsMeals}
                formatCardEyebrow={formatCardEyebrow}
                onArchiveMeal={handleArchiveMeal}
                onGetRecipe={handleGetRecipe}
                onRemoveFromWeeklyMenu={handleRemoveFromWeeklyMenu}
                onToggleCardDetails={handleToggleCardDetails}
                onToggleIngredients={handleToggleIngredients}
                recipeCache={recipeCache}
                recipeLoadingMeal={recipeLoadingMeal}
                savedDesserts={savedDesserts}
                weeklyMenu={weeklyMenu}
              />
            </div>
            <div id="desktop-vault" className="scroll-mt-8" />
            <SmartCartLibrarySections
                {...firstUseGuidance.propsFor("vault")}
              archivedMeals={archivedMeals}
              cloudSyncMessage={cloudSyncMessage}
              expandedDetailCards={expandedDetailCards}
              expandedIngredientsMeals={expandedIngredientsMeals}
              formatCardEyebrow={formatCardEyebrow}
              isSaving={isSaving || cloudLoadingUser === user?.id}
              saveStatus={saveStatus}
              isVaultOpen={isVaultOpen}
              isVaultLoading={isVaultLoading}
              vaultLoadError={vaultLoadError}
              onRetryVault={loadArchivedMeals}
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
              userPlan={userPlan}
              userSignedIn={Boolean(user)}
              vaultLimit={FREE_VAULT_LIMIT}
              waitlistEmail={waitlistEmail}
              waitlistStatus={waitlistStatus}
            />
          </section>
        </div>
      </div>

      <nav aria-label="Main navigation" className="fixed inset-x-0 bottom-0 z-50 border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="mx-auto grid max-w-2xl grid-cols-6 px-1">
          {[mobileTabs[5], ...mobileTabs.slice(0, 5)].map((tab) => {
            const isActive = activeMobileTab === tab.id;
            return <button
              key={tab.id}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-[0.7rem] font-semibold ${isActive ? "text-pine" : "text-ink/55"}`}
              onClick={() => navigateToStage(tab.id)}
              type="button"
            >
              <span className={`flex h-7 w-10 items-center justify-center rounded-full ${isActive ? "bg-sage/20" : ""}`}><MobileTabIcon tab={tab.id} className="h-4 w-4" /></span>
              <span>{tab.shortLabel}</span>
            </button>;
          })}
        </div>
      </nav>

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







