"use client";

import { FormEvent } from "react";

type SmartCartHeroHeaderProps = {
  activeFeature: string | null;
  authMessage: string;
  email: string;
  featureDescriptions: Record<string, string>;
  isAuthLoading: boolean;
  onEmailChange: (value: string) => void;
  onFeatureToggle: (feature: string) => void;
  onLoginSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSignOut: () => void;
  userEmail: string;
};

const safeTrim = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export function SmartCartHeroHeader({
  activeFeature,
  authMessage,
  email,
  featureDescriptions,
  isAuthLoading,
  onEmailChange,
  onFeatureToggle,
  onLoginSubmit,
  onSignOut,
  userEmail,
}: SmartCartHeroHeaderProps) {
  const isSignedIn = Boolean(safeTrim(userEmail));

  return (
    <div className="space-y-8 rounded-[2.25rem] border border-stone-200/80 bg-white/85 p-6 shadow-xl backdrop-blur xl:p-10">
      <div className="flex justify-between items-center w-full">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-pine/15 bg-cream px-4 py-2 text-sm font-semibold text-pine">
          SmartCart
          <span className="h-2.5 w-2.5 rounded-full bg-sage" />
        </div>

        <div className="ml-auto w-full max-w-md rounded-[1.5rem] border border-stone-200 bg-white px-4 py-4 shadow-sm">
          {!isSignedIn ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-display text-xl text-ink">
                    Save your pantry &amp; settings
                  </p>
                  <p className="mt-1 text-sm leading-6 text-ink/70">
                    Sign in to keep your vault and pantry synced across refreshes.
                  </p>
                </div>
              </div>
              <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={onLoginSubmit}>
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
                  {isAuthLoading ? "Sending..." : "Send Magic Link"}
                </button>
              </form>
              {authMessage ? (
                <p className="mt-3 text-sm font-medium text-ink/70">{authMessage}</p>
              ) : null}
            </>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-pine text-sm font-semibold text-white">
                  {safeTrim(userEmail[0] ?? "U").toUpperCase()}
                </div>
                <div>
                  <p className="font-display text-xl text-ink">Profile</p>
                  <p className="text-sm leading-6 text-ink/70">
                    {safeTrim(userEmail) || "Signed in"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  className="rounded-full border border-stone-200 px-4 py-2 text-sm font-semibold text-ink transition hover:bg-stone-100"
                  onClick={onSignOut}
                  type="button"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-5">
        <p className="font-display text-sm uppercase tracking-[0.35em] text-berry/75">
          Budget-conscious meal planning
        </p>
        <div className="max-w-3xl rounded-2xl bg-slate-50/50 p-5 shadow-sm">
          <p className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-xl font-extrabold leading-tight text-transparent sm:text-2xl">
            SmartCart turns your pantry, budget, and time constraints into a practical dinner
            plan with a grocery checklist you can actually shop.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {Object.keys(featureDescriptions).map((feature) => (
          <button
            key={feature}
            className={`rounded-3xl border p-4 text-left transition ${
              activeFeature === feature
                ? "border-orange-400 bg-orange-100 shadow-md"
                : "border-pine/10 bg-cream hover:border-orange-300 hover:bg-orange-50"
            }`}
            onClick={() => onFeatureToggle(feature)}
            type="button"
          >
            <p className="font-display text-3xl text-pine">{feature}</p>
          </button>
        ))}
      </div>

      <div
        className={`overflow-hidden rounded-3xl border border-stone-200 bg-white/80 px-5 py-4 text-sm leading-7 text-ink/75 transition-all ${
          activeFeature
            ? "max-h-40 opacity-100 shadow-md"
            : "max-h-0 border-transparent px-0 py-0 opacity-0"
        }`}
      >
        {activeFeature ? featureDescriptions[activeFeature] : null}
      </div>
    </div>
  );
}
