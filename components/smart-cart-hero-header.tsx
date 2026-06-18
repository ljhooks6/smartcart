"use client";

import { FormEvent, useState } from "react";
import type { SmartCartPlan } from "@/lib/smart-cart-membership";

type SmartCartHeroHeaderProps = {
  authMessage: string;
  email: string;
  isAuthLoading: boolean;
  isUpgradeLoading: boolean;
  isProfileLoading: boolean;
  onEmailChange: (value: string) => void;
  onGoogleLogin: () => void | Promise<void>;
  onSwitchGoogleAccount: () => void | Promise<void>;
  onUpgrade: () => void | Promise<void>;
  onLoginSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSignOut: () => void;
  userPlan: SmartCartPlan | null;
  userEmail: string;
};

const safeTrim = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export function SmartCartHeroHeader({
  authMessage,
  email,
  isAuthLoading,
  isUpgradeLoading,
  isProfileLoading,
  onEmailChange,
  onGoogleLogin,
  onSwitchGoogleAccount,
  onUpgrade,
  onLoginSubmit,
  onSignOut,
  userPlan,
  userEmail,
}: SmartCartHeroHeaderProps) {
  const isSignedIn = Boolean(safeTrim(userEmail));
  const initial = safeTrim(userEmail[0] ?? "U").toUpperCase();
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isInstallHelpOpen, setIsInstallHelpOpen] = useState(false);
  const planLabel = isProfileLoading ? "Loading" : userPlan === "plus" ? "Plus" : "Free";
  const planPanelLabel = isProfileLoading
    ? "Loading"
    : userPlan === "plus"
      ? "Plus plan"
      : "Free plan";

  return (
    <div className="space-y-8 rounded-[2.25rem] border border-stone-200/80 bg-white/85 p-6 shadow-xl backdrop-blur xl:p-10">
      <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-pine/15 bg-cream px-4 py-2 text-sm font-semibold text-pine">
          MealCaddie
          <span className="h-2.5 w-2.5 rounded-full bg-sage" />
        </div>

        {isSignedIn ? (
          <div className="relative ml-auto w-full max-w-sm">
            <button
              aria-expanded={isAccountMenuOpen}
              className="flex w-full items-center justify-between gap-3 rounded-full border border-pine/10 bg-white/90 px-3 py-2 text-left shadow-sm transition hover:border-pine/20 hover:bg-white"
              onClick={() => setIsAccountMenuOpen((current) => !current)}
              type="button"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pine text-sm font-semibold text-white">
                  {initial}
                </div>
                <div className="min-w-0">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-pine/55">
                    Account
                  </p>
                  <p className="truncate text-sm font-medium text-ink">{safeTrim(userEmail)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-orange-700">
                  {planLabel}
                </span>
                <span
                  className={`text-sm text-ink/45 transition ${isAccountMenuOpen ? "rotate-180" : ""}`}
                >
                  ▾
                </span>
              </div>
            </button>
            {isAccountMenuOpen ? (
              <div className="fixed inset-0 z-50 bg-ink/25 p-4" onClick={() => setIsAccountMenuOpen(false)}>
                <div
                  className="ml-auto w-full max-w-sm rounded-[1.75rem] border border-stone-200 bg-white p-4 shadow-2xl"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pine text-sm font-semibold text-white">
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-pine/55">
                          Signed in
                        </p>
                        <p className="truncate text-sm font-medium text-ink">{safeTrim(userEmail)}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-orange-700">
                        {planPanelLabel}
                      </span>
                      <button
                        className="rounded-full border border-stone-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink/65 transition hover:bg-stone-100"
                        onClick={() => setIsAccountMenuOpen(false)}
                        type="button"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 rounded-2xl bg-cream px-4 py-3 text-sm leading-6 text-ink/70">
                    Your pantry, weekly plan, and vault stay synced here.
                  </div>
                  {userPlan !== "plus" ? (
                    <button
                      className="mt-4 w-full rounded-full bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isUpgradeLoading}
                      onClick={() => {
                        setIsAccountMenuOpen(false);
                        void onUpgrade();
                      }}
                      type="button"
                    >
                      {isUpgradeLoading ? "Opening checkout..." : "Upgrade to MealCaddie Plus"}
                    </button>
                  ) : null}
                  <button
                    className="mt-4 w-full rounded-full border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isAuthLoading}
                    onClick={() => {
                      setIsAccountMenuOpen(false);
                      void onSwitchGoogleAccount();
                    }}
                    type="button"
                  >
                    {isAuthLoading ? "Switching..." : "Use a Different Google Account"}
                  </button>
                  <button
                    className="mt-4 w-full rounded-full border border-stone-200 px-4 py-3 text-sm font-semibold text-ink transition hover:bg-stone-100"
                    onClick={() => {
                      setIsAccountMenuOpen(false);
                      onSignOut();
                    }}
                    type="button"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="ml-auto flex items-center gap-3 self-start rounded-full border border-orange-200 bg-orange-50/90 px-4 py-2 text-sm text-ink/75 shadow-sm">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-orange-400" />
            <span className="font-medium">Sync across devices</span>
          </div>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr] lg:items-stretch">
        <div className="rounded-[2rem] border border-pine/10 bg-gradient-to-br from-cream via-white to-sage/10 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-berry/75">
            Meal planning without the mental load
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl leading-[0.95] text-ink sm:text-5xl lg:text-6xl">
            Pick the meals. Carry less of the week.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-ink/72 sm:text-lg">
            MealCaddie turns what you have, what you need, and what you can spend into a plan you
            can cook, shop, and come back to without starting over.
          </p>
        </div>
        <div className="grid gap-3 rounded-[2rem] border border-orange-200/80 bg-orange-50/80 p-4 shadow-sm">
          {[
            ["Plan", "Build around your pantry, budget, time, and taste."],
            ["Shop", "Turn the plan into a clear list you can actually use."],
            ["Cook", "Save meals for the week and move finished ones out safely."],
          ].map(([label, description]) => (
            <div key={label} className="rounded-2xl bg-white/85 px-4 py-3 shadow-sm">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-orange-700">
                {label}
              </p>
              <p className="mt-1 text-sm leading-6 text-ink/70">{description}</p>
            </div>
          ))}
        </div>
      </div>

      {!isSignedIn ? (
        <div className="max-w-3xl rounded-[1.75rem] border border-stone-200 bg-gradient-to-r from-white to-cream px-5 py-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-xl">
              <p className="font-display text-xl text-ink">Save your pantry &amp; settings</p>
              <p className="mt-1 text-sm leading-6 text-ink/70">
                Sign in to keep your meal plan and vault ready when you come back on your phone or desktop.
              </p>
            </div>
            <div className="flex w-full flex-col gap-4 lg:max-w-xl">
              <button
                className="inline-flex w-full items-center justify-center gap-3 rounded-full border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-ink shadow-sm transition hover:border-orange-200 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isAuthLoading}
                onClick={() => void onGoogleLogin()}
                type="button"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[0.7rem] font-bold text-ink shadow-sm">
                  G
                </span>
                {isAuthLoading ? "Opening Google..." : "Continue with Google"}
              </button>
              <p className="text-center text-xs font-medium leading-6 text-ink/55">
                Shared device? Google will ask which account to use before MealCaddie signs in.
              </p>
              <div className="flex items-center gap-3 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-ink/40">
                <span className="h-px flex-1 bg-stone-200" />
                <span>or use email</span>
                <span className="h-px flex-1 bg-stone-200" />
              </div>
              <form className="flex w-full flex-col gap-3 sm:flex-row" onSubmit={onLoginSubmit}>
                <input
                  className="w-full rounded-full border border-ink/10 bg-white px-4 py-3 text-base text-ink outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-200"
                  onChange={(event) => onEmailChange(event.target.value)}
                  placeholder="Enter your email"
                  type="email"
                  value={email}
                />
                <button
                  className="shrink-0 rounded-full bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isAuthLoading}
                  type="submit"
                >
                  {isAuthLoading ? "Sending..." : "Email Magic Link"}
                </button>
              </form>
            </div>
          </div>
          {authMessage ? (
            <p className="mt-3 text-sm font-medium text-ink/70">{authMessage}</p>
          ) : null}
        </div>
      ) : null}

      <div className="max-w-3xl rounded-[1.75rem] border border-pine/10 bg-gradient-to-r from-sage/10 via-white to-cream px-5 py-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl">
            <p className="font-display text-lg text-pine">Add MealCaddie to your home screen</p>
            <p className="mt-1 text-sm leading-6 text-ink/70">
              Keep your plan, shopping list, and saved meals one tap away.
            </p>
          </div>
          <button
            aria-expanded={isInstallHelpOpen}
            className="inline-flex w-fit items-center justify-center gap-2 rounded-full border border-pine/15 bg-white px-4 py-2 text-sm font-semibold text-pine shadow-sm transition hover:border-pine/30 hover:bg-cream"
            onClick={() => setIsInstallHelpOpen((current) => !current)}
            type="button"
          >
            {isInstallHelpOpen ? "Hide steps" : "Show steps"}
            <span className={`transition ${isInstallHelpOpen ? "rotate-180" : ""}`}>v</span>
          </button>
        </div>
        {isInstallHelpOpen ? (
          <div className="mt-4 grid gap-2 border-t border-pine/10 pt-4 text-sm leading-6 text-ink/70 sm:grid-cols-2">
            <p>
              <span className="font-semibold text-ink">iPhone:</span> Open MealCaddie in Safari,
              tap <span className="font-semibold text-ink">Share</span>, then choose{" "}
              <span className="font-semibold text-ink">Add to Home Screen</span>.
            </p>
            <p>
              <span className="font-semibold text-ink">Android:</span> Open your browser menu,
              then tap <span className="font-semibold text-ink">Add to Home screen</span> or{" "}
              <span className="font-semibold text-ink">Install app</span>.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
