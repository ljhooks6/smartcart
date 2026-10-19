export type CustomShoppingItem = { id: string; name: string; isChecked: boolean };
export type ShoppingProgress = {
  checked: string[];
  removed: string[];
  restored: string[];
  custom: CustomShoppingItem[];
  fingerprints?: Record<string,string>;
};
export type ShoppingState = ShoppingProgress & { undo: { previous: ShoppingProgress; message: string } | null };
export type ShoppingAction =
  | { type: "check"; key: string; name: string }
  | { type: "remove"; key: string; name: string }
  | { type: "restore"; key: string; name: string }
  | { type: "unrestore"; key: string; name: string }
  | { type: "custom-add"; item: CustomShoppingItem }
  | { type: "custom-check"; id: string; checked: boolean }
  | { type: "custom-remove"; id: string }
  | { type: "load"; progress: ShoppingProgress }
  | {type:"reconcile";requirements:Record<string,string>}
  | { type: "undo" }
  | { type: "reset" };

export function emptyShoppingState(): ShoppingState {
  return { checked: [], removed: [], restored: [], custom: [], undo: null };
}

export function shoppingReducer(state: ShoppingState, action: ShoppingAction): ShoppingState {
  if (action.type === "reset") return emptyShoppingState();
  if (action.type === "load") return { ...action.progress, undo: null };
  if(action.type==="reconcile"){
    const valid=(keys:string[])=>keys.filter(key=>action.requirements[key]!==undefined&&(!state.fingerprints?.[key]||state.fingerprints[key]===action.requirements[key]));
    return {...state,checked:valid(state.checked),removed:valid(state.removed),fingerprints:action.requirements,undo:null};
  }
  if (action.type === "undo") return state.undo ? { ...state.undo.previous, undo: null } : state;
  const { undo: _undo, ...previous } = state;
  let next: ShoppingProgress = previous;
  let message = "";
  if (action.type === "check") {
    const wasChecked = state.checked.includes(action.key);
    next = { ...previous, checked: wasChecked ? state.checked.filter(key => key !== action.key) : [...state.checked, action.key] };
    message = `${action.name} ${wasChecked ? "marked to collect" : "collected"}.`;
  } else if (action.type === "remove") {
    if (state.removed.includes(action.key)) return state;
    next = { ...previous, removed: [...state.removed, action.key] };
    message = `${action.name} removed from your list.`;
  } else if (action.type === "restore") {
    if (state.restored.includes(action.key)) return state;
    next = { ...previous, restored: [...state.restored, action.key] };
    message = `${action.name} added back.`;
  } else if (action.type === "unrestore") {
    next = { ...previous, restored: state.restored.filter(key => key !== action.key) };
    message = `${action.name} returned to your pantry.`;
  } else if (action.type === "custom-add") {
    next = { ...previous, custom: [...state.custom, action.item] };
    message = `${action.item.name} added.`;
  } else {
    const item = state.custom.find(item => item.id === action.id);
    if (!item) return state;
    if (action.type === "custom-remove") {
      next = { ...previous, custom: state.custom.filter(item => item.id !== action.id) };
      message = `${item.name} removed from your list.`;
    } else {
      next = { ...previous, custom: state.custom.map(item => item.id === action.id ? { ...item, isChecked: action.checked } : item) };
      message = `${item.name} ${action.checked ? "collected" : "marked to collect"}.`;
    }
  }
  return { ...next, undo: { previous, message } };
}

export function parseShoppingProgress(value: unknown): ShoppingProgress {
  if (!value || typeof value !== "object") return emptyShoppingState();
  const stored = value as Partial<ShoppingProgress>;
  const strings = (items: unknown) => Array.isArray(items) ? items.filter((item): item is string => typeof item === "string") : [];
  return {
    checked: strings(stored.checked), removed: strings(stored.removed), restored: strings(stored.restored),
    custom: Array.isArray(stored.custom) ? stored.custom.filter(item => item && typeof item.id === "string" && typeof item.name === "string" && typeof item.isChecked === "boolean") : [],
    ...(stored.fingerprints&&typeof stored.fingerprints==="object"?{fingerprints:Object.fromEntries(Object.entries(stored.fingerprints).filter(([k,v])=>k.length<300&&typeof v==="string"&&v.length<10000))}:{}),
  };
}
