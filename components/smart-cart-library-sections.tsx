"use client";

import { SmartCartMealActions } from "./smart-cart-meal-actions";

import { SmartCartMealDetails } from "./smart-cart-meal-details";

import { SmartCartFirstUseGuide, type FirstUseGuidanceProps } from "./smart-cart-first-use-guide";

import { FormEvent } from "react";
import type { SmartCartPlan } from "@/lib/smart-cart-membership";

type IngredientItem = {
  name: string;
  amount: string;
  price?: number;
};

type MealPlanItem = {
  dbId?: number | string;
  user_id: string;
  day: string;
  name: string;
  servings: number;
  notes: string;
  description?: string;
  dietaryRestrictions?: string;
  ingredients?: IngredientItem[];
};

type WaitlistStatus = "idle" | "submitting" | "success" | "error";
type SaveStatus = "idle" | "saving" | "saved" | "error";

type SmartCartLibrarySectionsProps = FirstUseGuidanceProps & {
  archivedMeals: MealPlanItem[];
  cloudSyncMessage: string | null;
  expandedDetailCards: Set<string>;
  formatCardEyebrow: (day: string) => string;
  isSaving: boolean;
  isVaultOpen: boolean;
  isVaultLoading: boolean;
  vaultLoadError: string | null;
  onRetryVault: () => void | Promise<void>;
  saveStatus: SaveStatus;
  onGetRecipe: (meal: MealPlanItem) => void | Promise<void>;
  onPermanentDelete: (meal: MealPlanItem) => void | Promise<void>;
  onRestoreMeal: (meal: MealPlanItem) => void | Promise<void>;
  onSaveSession: () => void | Promise<void>;
  onToggleCardDetails: (cardKey: string) => void;
  onToggleVaultOpen: () => void;
  onWaitlistEmailChange: (value: string) => void;
  onWaitlistSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  recipeLoadingMeal: string | null;
  userPlan: SmartCartPlan;
  userSignedIn: boolean;
  vaultLimit: number;
  waitlistEmail: string;
  waitlistStatus: WaitlistStatus;
};

const safeTrim = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export function SmartCartLibrarySections({
  showGuidance,
  onDismissGuidance,
  archivedMeals,
  cloudSyncMessage,
  expandedDetailCards,
  formatCardEyebrow,
  isSaving,
  isVaultOpen,
  isVaultLoading,
  vaultLoadError,
  onRetryVault,
  saveStatus,
  onGetRecipe,
  onPermanentDelete,
  onRestoreMeal,
  onSaveSession,
  onToggleCardDetails,
  onToggleVaultOpen,
  onWaitlistEmailChange,
  onWaitlistSubmit,
  recipeLoadingMeal,
  userPlan,
  userSignedIn,
  vaultLimit,
  waitlistEmail,
  waitlistStatus,
}: SmartCartLibrarySectionsProps) {
  return (
    <section className="mt-6 flex flex-col gap-6">
      {userSignedIn ? (
        <div className="hidden md:block mt-6 rounded-[1.75rem] border border-stone-200 bg-gradient-to-r from-white to-cream px-5 py-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-800/70">
                Cloud sync
              </p>
              <p className="mt-1 text-sm font-semibold text-ink">Save your current week</p>
              <p className="text-sm leading-6 text-ink/65">
                Save your chosen meals and Sweet Treats across devices. Plus also saves your pantry. Vault recipes save when you add them.
              </p>
              {userPlan === "free" ? (
                <p className="mt-2 text-sm leading-6 text-ink/70">
                  Free syncs this week&apos;s Cook lineup. <strong>MealCaddie Plus</strong> remembers
                  more across weeks so planning starts with less repeated setup.
                </p>
              ) : null}
            </div>
            <button
              className={`inline-flex min-w-[9.5rem] items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                saveStatus === "saved"
                  ? "bg-emerald-600 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]"
                  : saveStatus === "error"
                    ? "bg-rose-500"
                    : "bg-orange-500 hover:bg-orange-600"
              }`}
              disabled={isSaving}
              onClick={() => void onSaveSession()}
              type="button"
            >
              {saveStatus === "saving" ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                  <span>Saving...</span>
                </>
              ) : saveStatus === "saved" ? (
                <>
                  <span className="text-base leading-none">✓</span>
                  <span>Saved</span>
                </>
              ) : saveStatus === "error" ? (
                <>
                  <span className="text-base leading-none">!</span>
                  <span>Retry Save</span>
                </>
              ) : (
                "Save"
              )}
            </button>
          </div>
          {cloudSyncMessage ? (
            <p role="status" aria-live="polite" className="mt-3 text-sm font-medium text-ink/70">{cloudSyncMessage}</p>
          ) : null}
        </div>
      ) : null}

      <SmartCartFirstUseGuide area="vault" showGuidance={showGuidance} onDismissGuidance={onDismissGuidance} />
      {userPlan === "free" ? (
        <p className="text-sm leading-6 text-ink/70">
          Free plans can save up to <strong>{vaultLimit}</strong> recipes. MealCaddie Plus gives your saved library more room to grow.
        </p>
      ) : null}
      <button
        className="mt-6 inline-flex items-center justify-center rounded-full border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:bg-stone-100"
        onClick={onToggleVaultOpen}
        type="button"
      >
        {isVaultOpen ? "Close Recipe Vault" : isVaultLoading ? "Loading Recipe Vault..." : vaultLoadError ? "Open Recipe Vault" : `Open Recipe Vault (${archivedMeals.length})`}
      </button>
      {isVaultOpen ? (
        <div className="mt-5 rounded-[1.5rem] border border-stone-200 bg-white px-4 py-4 shadow-sm">
          {isVaultLoading ? <p role="status" className="text-sm text-ink/70">Loading your saved recipes...</p> : null}
          {vaultLoadError ? <div role="alert" className="mb-4 text-sm text-berry"><p>{vaultLoadError}</p><button type="button" onClick={() => void onRetryVault()} className="mt-3 rounded-full border border-berry/30 px-4 py-2 font-semibold">Retry loading Vault</button></div> : null}
          {archivedMeals.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {archivedMeals.map((meal) => (
                <article
                  key={`vault-${meal.dbId ?? `${meal.day}-${meal.name}`}`}
                  className="rounded-3xl border border-pine/15 border-t-4 border-t-sage bg-white px-4 py-4 shadow-lg"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-berry/70">
                    {formatCardEyebrow(meal.day)}
                  </p>
                  <h3 className="mt-2 font-display text-xl text-ink">{safeTrim(meal.name)}</h3>
                  <p className="mt-2 text-sm leading-6 text-ink/70">Serves {meal.servings}</p>
                  <p className="mt-2 text-xs font-semibold text-pine">Saved to Vault</p>
                  <div className="mt-4"><SmartCartMealActions inThisWeek={false} recipeLoading={recipeLoadingMeal === meal.name} onViewRecipe={() => void onGetRecipe(meal)} onAddToWeek={() => void onRestoreMeal(meal)} more={<>
                    <SmartCartMealDetails expanded={expandedDetailCards.has(`vault-${meal.day}::${meal.name}`)} onToggle={() => onToggleCardDetails(`vault-${meal.day}::${meal.name}`)} description={meal.description} notes={safeTrim(meal.notes)} />
                    <button type="button" onClick={() => void onPermanentDelete(meal)} className="min-h-11 w-full rounded-xl border border-red-200 px-3 py-3 text-left text-sm font-semibold text-red-700">Permanent Delete</button>
                  </>} /></div>
                </article>
              ))}
            </div>
          ) : !isVaultLoading && !vaultLoadError ? (
            <p className="text-sm text-ink/60">
              No recipes saved to the Vault yet. Use Save to Vault on a dinner or Sweet Treat to keep it for a future week.
            </p>
          ) : null}
        </div>
      ) : null}

      {userPlan === "free" ? (
      <details className="mt-6 rounded-2xl border border-orange-200 bg-orange-50/60 p-4 md:p-6">
        <summary className="min-h-11 cursor-pointer py-2 font-semibold text-ink">Explore MealCaddie Plus</summary>
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-orange-700/80">
              MealCaddie Plus Preview
            </p>
            <p className="mt-3 font-display text-3xl text-ink">
              More memory, more control, less dinner math.
            </p>
            <p className="mx-auto mt-3 max-w-3xl text-sm leading-7 text-ink/70 sm:text-base">
              Free includes useful weekly planning. Plus adds more AI plans, cloud pantry memory, advanced Cuisine Vibe, expanded recipe storage and enhanced meal refinement.
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              {
                title: "Remember the kitchen",
                copy: "Keep more pantry context across weeks so planning starts with fewer repeated choices.",
              },
              {
                title: "Shape the meal vibe",
                copy: "Cuisine direction and stronger refinement tools make generated meals feel more personal.",
              },
              {
                title: "Grow the vault",
                copy: `Free keeps ${vaultLimit} saved recipes. Plus gives your go-to meals more room.`,
              },
              {
                title: "More planning flexibility",
                copy: "Free includes 5 weekly AI plans; Plus includes 20. Breakfast and lunch planning are planned for a future update. Existing saved meals remain available.",
              },
            ].map((feature) => (
              <div
                className="rounded-3xl border border-white/80 bg-white/75 px-4 py-4 shadow-sm"
                key={feature.title}
              >
                <p className="font-semibold text-ink">{feature.title}</p>
                <p className="mt-2 text-sm leading-6 text-ink/65">{feature.copy}</p>
              </div>
            ))}
          </div>

          {waitlistStatus === "success" ? (
            <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-800">
              You are on the product-update list. This does not apply for beta access or activate Plus.
            </div>
          ) : waitlistStatus === "error" ? (
            <div className="mt-6 rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
              That sign-up did not go through. Try again in a moment.
            </div>
          ) : (
            <form
              className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center"
              onSubmit={onWaitlistSubmit}
            >
              <input
                className="w-full rounded-full border border-ink/10 bg-white px-4 py-3 text-base text-ink outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-200 sm:max-w-md"
                name="email"
                onChange={(event) => onWaitlistEmailChange(event.target.value)}
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
                {waitlistStatus === "submitting" ? "Joining..." : "Join the Plus Waitlist"}
              </button>
            </form>
          )}
        </div>
      </details>
      ) : null}
    </section>
  );
}
