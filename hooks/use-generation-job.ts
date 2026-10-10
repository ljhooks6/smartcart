"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getMealRequestHeaders } from "../lib/meal-request-headers";
import type { GenerationInput, GenerationJob } from "../lib/generation-request";
import { loadStoredJson, saveStoredJson, clearStoredJson } from "../lib/smart-cart-persistence";

export function useGenerationJob({ userId, enabled, onCompleted }: {
  userId?: string; enabled: boolean; onCompleted: (job: GenerationJob) => void;
}) {
  const owner = userId || "guest";
  const ownerRef = useRef(owner); ownerRef.current = owner;
  const callbackRef = useRef(onCompleted); callbackRef.current = onCompleted;
  const [job, setJob] = useState<GenerationJob | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showProgress, setShowProgress] = useState(false);
  const startLock = useRef<string | null>(null);
  const pollEpoch = useRef(0);
  const activeJob = useRef<GenerationJob | null>(null);
  const applied = useRef<string | null>(null);
  const busy = submitting || job?.status === "queued" || job?.status === "running";
  const apply = useCallback((next: GenerationJob | null, expectedOwner: string) => {
    if (ownerRef.current !== expectedOwner) return;
    activeJob.current = next; setJob(next);
    if (next?.status === "completed" && applied.current !== next.id) {
      const result = next.result as { meals?: unknown; desserts?: unknown } | null;
      if (!result || !Array.isArray(result.meals) || !Array.isArray(result.desserts)) {
        setMessage("We couldn't open this plan. Please start a new plan."); return;
      }
      applied.current = next.id;
      saveStoredJson(`mealcaddie:applied-generation:${expectedOwner}`, next.id);
      clearStoredJson(`mealcaddie:pending-generation:${expectedOwner}`);
      callbackRef.current(next);
      setShowProgress(false);
    }
    if (next?.status === "failed") {
      clearStoredJson(`mealcaddie:pending-generation:${expectedOwner}`);
      setMessage(next.error || "This plan couldn't finish. Please start a new plan.");
      setShowProgress(false);
    }
  }, []);

  useEffect(() => {
    let canceled = false; let timer: ReturnType<typeof setTimeout> | undefined; let failures = 0;
    pollEpoch.current++; startLock.current = null;
    activeJob.current = null; setJob(null); setMessage(null); setShowProgress(false); setSubmitting(false);
    applied.current = loadStoredJson<string>(`mealcaddie:applied-generation:${owner}`);
    if (!enabled) return;
    async function poll() {
      const epoch = pollEpoch.current;
      try {
        const response = await fetch("/api/generate-list", { headers: await getMealRequestHeaders(userId), cache: "no-store", signal: AbortSignal.timeout(15000) });
        if (canceled) return;
        const data = await response.json();
        if (!response.ok) {
          if (response.status === 401) { setMessage(data.error || "Please sign in again to recover your plan."); return; }
          throw new Error("Status unavailable");
        }
        failures = 0;
        if (epoch === pollEpoch.current && !startLock.current) { setMessage(null); apply(data.job ?? null, owner); }
      } catch {
        if (canceled) return;
        if (epoch !== pollEpoch.current || startLock.current) { timer = setTimeout(poll, 4000); return; }
        failures++;
        setMessage("We couldn't check your plan. We'll reconnect automatically; your saved request is safe.");
      }
      if (!canceled) {
        // Also discover jobs started in another tab/device. Slow down when hidden or offline.
        const delay = document.hidden ? 30000 : failures ? Math.min(30000, 5000 * 2 ** Math.min(failures, 3)) : activeJob.current?.status === "queued" || activeJob.current?.status === "running" ? 4000 : 30000;
        timer = setTimeout(poll, delay);
      }
    }
    void poll();
    return () => { canceled = true; if (timer) clearTimeout(timer); };
  }, [owner, userId, enabled, apply]);

  const start = useCallback(async (input: GenerationInput) => {
    if (startLock.current || activeJob.current?.status === "queued" || activeJob.current?.status === "running") {
      setShowProgress(true); return true;
    }
    const startToken = crypto.randomUUID();
    startLock.current = startToken; pollEpoch.current++; setSubmitting(true); setMessage(null); setShowProgress(true);
    const expectedOwner = owner;
    const storageKey = `mealcaddie:pending-generation:${owner}`;
    const payload = JSON.stringify(input);
    const previous = loadStoredJson<{ requestKey: string; payload: string }>(storageKey);
    const requestKey = previous?.payload === payload ? previous.requestKey : crypto.randomUUID();
    saveStoredJson(storageKey, { requestKey, payload });
    try {
      const headers = await getMealRequestHeaders(userId);
      const response = await fetch("/api/generate-list", { method: "POST", headers: { ...headers, "Idempotency-Key": requestKey }, body: payload, signal: AbortSignal.timeout(20000) });
      const data = await response.json();
      if (ownerRef.current !== expectedOwner) return false;
      if (data.job) {
        apply(data.job, expectedOwner);
        if (!response.ok) setMessage(data.error || "Your planning request is saved.");
        return true;
      }
      if (!response.ok) {
        if (response.status < 500) clearStoredJson(storageKey);
        const reset = data.resetAt ? ` More plans become available ${new Date(data.resetAt).toLocaleString()}.` : "";
        setMessage((data.error || "Planning is unavailable.") + reset); setShowProgress(false); return false;
      }
      throw new Error("Missing job");
    } catch {
      if (ownerRef.current === expectedOwner) {
        setMessage("We couldn't confirm your request. We'll check for a saved plan; Retry uses the same request so it won't count twice.");
        setShowProgress(false);
      }
      return false;
    } finally {
      if (startLock.current === startToken) {
        startLock.current = null; pollEpoch.current++;
        if (ownerRef.current === expectedOwner) setSubmitting(false);
      }
    }
  }, [owner, userId, apply]);
  return { job, busy, message, showProgress, setShowProgress, start };
}
