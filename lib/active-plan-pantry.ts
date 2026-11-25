import { normalizePantry, type PantryEntry } from "./pantry.ts";
import {ingredientKey} from "./ingredient-quantity.ts";

export type ActivePlanPantry = { version: 1; owner: string; planId: string; snapshotAt: string; origin:"generation"|"current-reconfirmation"; requiredNames:string[]; original: PantryEntry[]; current: PantryEntry[]; updatedAt: string };
export const activePantryKey = (owner: string) => `mealcaddie-active-plan-pantry-v1:${owner}`;
export function newActivePantry(owner: string, planId: string, at: string, entries: PantryEntry[]): ActivePlanPantry {
  return {version:1,owner,planId,snapshotAt:at,origin:"generation",requiredNames:entries.map(e=>e.name),original:normalizePantry(entries),current:normalizePantry(entries),updatedAt:at};
}
export function recoverActivePantry(raw: unknown, owner: string): ActivePlanPantry | null {
  if (!raw || typeof raw !== "object") return null;
  const v = raw as ActivePlanPantry;
  if (v.version !== 1 || v.owner !== owner || typeof v.planId!=="string" || !v.planId || v.planId.length > 180 || !Number.isFinite(Date.parse(v.snapshotAt)) || !Number.isFinite(Date.parse(v.updatedAt)) || !Array.isArray(v.original) || !Array.isArray(v.current)||v.original.length>200||v.current.length>200||!Array.isArray(v.requiredNames)||v.requiredNames.length>200||v.requiredNames.some(n=>typeof n!=="string"||n.length>150)||!["generation","current-reconfirmation"].includes(v.origin)) return null;
  return {...v,original:normalizePantry(v.original),current:normalizePantry(v.current)};
}
export function editActivePantry(value: ActivePlanPantry, entries: PantryEntry[], at: string): ActivePlanPantry {
  return {...value,current:normalizePantry(entries),updatedAt:at};
}
export function activePantryForPlan(value: ActivePlanPantry | null, owner: string, planIds: string[]) {
  return value?.owner === owner && planIds.includes(value.planId) ? value : null;
}
export function pantryRecoveryForStorage(value:ActivePlanPantry){
  const keys=new Set(value.requiredNames.map(ingredientKey));
  return {...value,current:value.current.filter(e=>keys.has(ingredientKey(e.name)))};
}
