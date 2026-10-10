"use client";

import { useEffect, useId, useRef, useState } from "react";

export type GenerationPhase = "queued" | "building" | "organizing";

export function SmartCartGenerationProgress({ phase, includeDessert, includeBreakfast = false, includeLunch = false, onContinue }: { phase: GenerationPhase | null; includeDessert: boolean; includeBreakfast?: boolean; includeLunch?: boolean; onContinue?: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [takingLonger, setTakingLonger] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !phase) return;
    if (!dialog.open) dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setTakingLonger(false);
    const timer = window.setTimeout(() => setTakingLonger(true), 20000);
    return () => {
      window.clearTimeout(timer);
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [phase]);

  const steps = ["Checking your pantry", "Building your meals", "Organizing your grocery list"];
  const currentStep = phase === "organizing" ? 2 : 1;

  return (
    <dialog ref={dialogRef} aria-labelledby={titleId} aria-describedby={descriptionId} onCancel={(event) => { event.preventDefault(); onContinue?.(); }} className="m-auto w-[calc(100%_-_2rem)] max-w-md rounded-[2rem] border border-stone-200 bg-white p-6 text-ink shadow-2xl backdrop:bg-ink/35">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-600">MealCaddie is planning</p>
      <div role="status" aria-live="polite" aria-atomic="true">
        <h2 id={titleId} className="mt-3 font-display text-3xl">{phase === "queued" ? "Your plan is in line" : phase === "organizing" ? "Organizing your grocery list" : "Building your meals"}</h2>
        <p id={descriptionId} className="mt-3 text-sm leading-6 text-ink/70">
          {phase === "queued" ? "Your request is saved. Planning will start as soon as capacity is available." : phase === "organizing"
            ? "Your meal options are ready. We are preparing the ingredients and pantry checks."
            : `Using your pantry, budget, and kitchen equipment to build ${["dinner", includeBreakfast ? "breakfast" : "", includeLunch ? "lunch" : ""].filter(Boolean).join(", ")} options${includeDessert ? " and Sweet Treats" : ""}.`}
        </p>
        {takingLonger && phase === "building" ? <p className="mt-3 text-sm leading-6 text-pine">Still working on your plan. Some requests take longer. You do not need to press Generate again.</p> : null}
      </div>
      <ol className="mt-5 space-y-3 text-sm">
        {steps.map((step, index) => (
          <li key={step} aria-current={index === currentStep ? "step" : undefined} className={`flex items-center gap-3 ${index > currentStep ? "text-ink/45" : "text-pine"}`}>
            <span aria-hidden="true" className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${index === currentStep ? "border-2 border-pine/20 border-t-pine motion-safe:animate-spin" : "bg-stone-100"}`}>{index < currentStep ? "✓" : index > currentStep ? index + 1 : ""}</span>
            <span>{step}<span className="sr-only">{index < currentStep ? ": complete" : index === currentStep ? ": in progress" : ": next"}</span></span>
          </li>
        ))}
      </ol>
      <p className="mt-5 text-xs leading-5 text-ink/60">Your current week stays available. You can leave and return; your finished plan will be waiting.</p>
      {onContinue ? <button type="button" onClick={onContinue} className="mt-5 w-full rounded-full bg-pine px-5 py-3 text-sm font-semibold text-white">Keep using MealCaddie</button> : null}
    </dialog>
  );
}
