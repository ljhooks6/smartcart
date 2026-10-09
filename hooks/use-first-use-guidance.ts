"use client";

import { useEffect, useState } from "react";

export type GuidanceArea = "cook" | "vault" | "shop";
type HiddenGuidance = Partial<Record<GuidanceArea, boolean>>;
const storageKey = "mealcaddie-first-use-guidance-v1";

export function useFirstUseGuidance() {
  const [ready, setReady] = useState(false);
  const [hidden, setHidden] = useState<HiddenGuidance>({});
  const [remembered, setRemembered] = useState<HiddenGuidance>({});

  useEffect(() => {
    let preferences: HiddenGuidance = {};
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "{}");
      if (stored && typeof stored === "object") {
        for (const area of ["cook", "vault", "shop"] as const) {
          if ((stored as HiddenGuidance)[area] === true) preferences[area] = true;
        }
      }
    } catch {
      // Guidance still works when browser storage is unavailable.
    }
    setRemembered(preferences);
    setHidden(preferences);
    setReady(true);
  }, []);

  function dismiss(area: GuidanceArea, remember: boolean) {
    setHidden((current) => ({ ...current, [area]: true }));
    if (remember) {
      const next = { ...remembered, [area]: true };
      setRemembered(next);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // Keep it dismissed for this visit even if saving is blocked.
      }
    }
  }

  return {
    propsFor: (area: GuidanceArea) => ({
      showGuidance: ready && !hidden[area],
      onDismissGuidance: (remember: boolean) => dismiss(area, remember),
    }),
  };
}
