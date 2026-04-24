"use client";

import { FormEvent, useState } from "react";

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
  const initial = safeTrim(userEmail[0] ?? "U").toUpperCase();
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  return (
    <div className="space-y-8 rounded-[2.25rem] border border-stone-200/80 bg-white/85 p-6 shadow-xl backdrop-blur xl:p-10">
      <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-pine/15 bg-cream px-4 py-2 text-sm font-semibold text-pine">
          SmartCart
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
              <span
                className={`text-sm text-ink/45 transition ${isAccountMenuOpen ? "rotate-180" : ""}`}
              >
                ▾
              </span>
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
                    <button
                      className="rounded-full border border-stone-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink/65 transition hover:bg-stone-100"
                      onClick={() => setIsAccountMenuOpen(false)}
                      type="button"
                    >
                      Close
                    </button>
                  </div>
                  <div className="mt-4 rounded-2xl bg-cream px-4 py-3 text-sm leading-6 text-ink/70">
                    Your pantry, weekly plan, and vault stay synced here.
                  </div>
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

      {!isSignedIn ? (
        <div className="max-w-3xl rounded-[1.75rem] border border-stone-200 bg-gradient-to-r from-white to-cream px-5 py-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-xl">
              <p className="font-display text-xl text-ink">Save your pantry &amp; settings</p>
              <p className="mt-1 text-sm leading-6 text-ink/70">
                Sign in to keep your meal plan and vault ready when you come back on your phone or desktop.
              </p>
            </div>
            <form className="flex w-full flex-col gap-3 sm:flex-row lg:max-w-xl" onSubmit={onLoginSubmit}>
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
          </div>
          {authMessage ? (
            <p className="mt-3 text-sm font-medium text-ink/70">{authMessage}</p>
          ) : null}
        </div>
      ) : null}

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
            <p className="font-display text-2xl text-pine sm:text-3xl">{feature}</p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink/45">
              Tap to preview
            </p>
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
