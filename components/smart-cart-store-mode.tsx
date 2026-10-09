"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { GroceryListItem } from "../lib/grocery-list";
import type { CustomShoppingItem } from "../lib/shopping-progress";

type Props = {
  open: boolean;
  onClose: () => void;
  groups: [string, GroceryListItem[]][];
  checkedItems: Set<string>;
  customItems: CustomShoppingItem[];
  onToggleItem: (key: string) => void;
  onRemoveItem: (key: string) => void;
  onCheckCustom: (id: string, checked: boolean) => void;
  onRemoveCustom: (id: string) => void;
  undoMessage: string | null;
  onUndo: () => void;
};

export function SmartCartStoreMode({ open, onClose, groups, checkedItems, customItems, onToggleItem, onRemoveItem, onCheckCustom, onRemoveCustom, undoMessage, onUndo }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const departmentNavRef = useRef<HTMLElement>(null);
  const departmentButtons = useRef<Record<string, HTMLButtonElement | null>>({});
  const titleId = useId();
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [onlyRemaining, setOnlyRemaining] = useState(false);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) {
      dialog?.close();
      return;
    }
    dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const departments = groups.filter(([, items]) => items.length > 0).map(([name, items]) => ({
    key: name, name, count: items.length, collected: items.filter(item => checkedItems.has(item.item_key)).length,
  }));
  if (customItems.length) departments.push({ key: "__extras", name: "Extras & Household", count: customItems.length, collected: customItems.filter(item => item.isChecked).length });
  const active = departments.find(department => department.key === selectedDepartment) ?? departments[0];
  const activeIndex = departments.findIndex(department => department.key === active?.key);
  const items = groups.find(([category]) => category === active?.key)?.[1] ?? [];
  const total = departments.reduce((sum, department) => sum + department.count, 0);
  const collected = departments.reduce((sum, department) => sum + department.collected, 0);
  const remainingInDepartment = active ? active.count - active.collected : 0;
  const activeDepartmentKey = active?.key;
  useEffect(() => {
    const nav = departmentNavRef.current;
    const button = activeDepartmentKey ? departmentButtons.current[activeDepartmentKey] : null;
    if (open && nav && button) nav.scrollTo({ left: button.offsetLeft - nav.clientWidth / 2 + button.offsetWidth / 2 });
  }, [activeDepartmentKey, open]);

  function chooseDepartment(key: string) {
    setSelectedDepartment(key);
    listRef.current?.scrollTo({ top: 0 });
  }

  return (
    <dialog ref={dialogRef} aria-labelledby={titleId} onCancel={onClose} className="fixed inset-0 m-0 h-[100dvh] max-h-none w-screen max-w-none bg-[#faf7f1] p-0 text-ink backdrop:bg-ink/40">
      <div className="mx-auto flex h-full max-w-3xl flex-col px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-[max(env(safe-area-inset-top),1rem)] sm:px-6">
        <header className="flex items-start justify-between gap-4">
          <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-pine/65">One department at a time</p><h1 id={titleId} className="mt-1 font-display text-3xl">Store Mode</h1></div>
          <button type="button" onClick={onClose} className="min-h-11 rounded-full border border-pine/20 bg-white px-4 font-semibold text-pine">Exit Store Mode</button>
        </header>
        <div className="mt-4">
          <p className="text-lg font-semibold text-pine" role="status">{collected} of {total} collected</p>
          {total > 0 ? <progress aria-label="Store collection progress" value={collected} max={total} className="mt-2 h-3 w-full accent-pine" /> : null}
          <p className="mt-1 text-xs text-ink/60">Shopping progress stays on this device.</p>
        </div>
        <nav ref={departmentNavRef} aria-label="Grocery departments" className="relative mt-4 flex shrink-0 gap-2 overflow-x-auto pb-2">
          {departments.map(department => <button ref={element => { departmentButtons.current[department.key] = element; }} key={department.key} type="button" aria-current={department.key === active?.key ? "true" : undefined} onClick={() => chooseDepartment(department.key)} className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-semibold ${department.key === active?.key ? "border-pine bg-pine text-white" : "border-stone-200 bg-white text-pine"}`}>{department.name} · {department.count - department.collected}</button>)}
        </nav>
        <label className="mt-2 flex min-h-11 shrink-0 items-center gap-3 text-sm text-ink/70"><input type="checkbox" checked={onlyRemaining} onChange={event => setOnlyRemaining(event.target.checked)} className="h-5 w-5 accent-pine" />Only show items to collect</label>
        <div ref={listRef} className="mt-2 min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4">
          {active ? <>
            <h2 className="font-display text-2xl text-pine">{active.name}</h2>
            <p className="mt-1 text-sm text-ink/65">{remainingInDepartment} remaining in this department</p>
            <ul className="mt-4 space-y-3">
              {items.filter(item => !onlyRemaining || !checkedItems.has(item.item_key)).map(item => {
                const checked = checkedItems.has(item.item_key);
                return <li key={item.item_key} className="rounded-2xl border border-stone-200 bg-white p-4">
                  <label className="flex min-h-14 cursor-pointer items-center gap-4">
                    <input type="checkbox" aria-label={`Collect ${item.name}`} checked={checked} onChange={() => onToggleItem(item.item_key)} className="h-8 w-8 shrink-0 accent-pine" />
                    <span><span className={`block text-lg font-semibold ${checked ? "text-ink/50 line-through" : "text-ink"}`}>{item.name}</span><span className="mt-1 block text-sm text-ink/65">{item.needed_amount ? `Need ${item.needed_amount}` : ""}{item.buy_amount ? `${item.needed_amount ? " · " : ""}Buy ${item.buy_amount}` : ""}</span></span>
                  </label>
                  <div className="mt-3 flex items-start justify-between gap-3">
                    <details className="min-w-0 flex-1 text-sm text-ink/65"><summary className="min-h-11 cursor-pointer py-3 font-semibold text-pine">Meal & ingredient details</summary>
                      {item.meal_names?.length ? <p className="py-2">For: {item.meal_names.join(", ")}</p> : <p className="py-2">Pantry restock item.</p>}
                      {item.usage_notes?.map(note => <p key={note.meal} className="mb-2 leading-6"><strong>{note.meal}:</strong> {note.usage}</p>)}
                      {item.flexibility_note ? <p className="py-2">{item.flexibility_note}</p> : null}
                    </details>
                    <button type="button" aria-label={`Remove ${item.name}`} onClick={() => onRemoveItem(item.item_key)} className="min-h-11 px-2 text-sm font-semibold text-red-700">Remove</button>
                  </div>
                </li>;
              })}
              {active.key === "__extras" ? customItems.filter(item => !onlyRemaining || !item.isChecked).map(item => <li key={item.id} className="rounded-2xl border border-stone-200 bg-white p-4"><label className="flex min-h-14 items-center gap-4"><input type="checkbox" aria-label={`Collect ${item.name}`} checked={item.isChecked} onChange={() => onCheckCustom(item.id, !item.isChecked)} className="h-8 w-8 shrink-0 accent-pine" /><span className={`text-lg font-semibold ${item.isChecked ? "text-ink/50 line-through" : ""}`}>{item.name}</span></label><button type="button" aria-label={`Remove ${item.name}`} onClick={() => onRemoveCustom(item.id)} className="mt-2 min-h-11 text-sm font-semibold text-red-700">Remove</button></li>) : null}
            </ul>
            {remainingInDepartment === 0 ? <p className="mt-4 rounded-2xl bg-green-50 p-4 text-sm font-semibold text-pine">This department is collected.</p> : null}
          </> : <div className="rounded-2xl border border-dashed border-pine/20 bg-white p-6"><h2 className="font-display text-2xl">Your list is clear</h2><p className="mt-3 text-sm leading-6 text-ink/65">Choose meals or add extras in Shop to build your list. You can undo your latest removal below.</p></div>}
        </div>
        <footer className="shrink-0 border-t border-stone-200 pt-3">
          {undoMessage ? <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-white p-3"><p role="status" className="text-sm text-ink/70">{undoMessage}</p><button type="button" onClick={onUndo} className="min-h-11 px-3 font-semibold text-pine underline underline-offset-4">Undo</button></div> : null}
          {total > 0 && collected === total ? <p className="mb-3 text-center font-semibold text-pine">Everything on your list is collected.</p> : null}
          <div className="flex gap-3"><button type="button" disabled={activeIndex <= 0} onClick={() => chooseDepartment(departments[activeIndex - 1].key)} className="min-h-12 flex-1 rounded-full border border-pine/20 bg-white px-4 text-sm font-semibold text-pine disabled:opacity-40">Previous</button><button type="button" disabled={activeIndex < 0 || activeIndex >= departments.length - 1} onClick={() => chooseDepartment(departments[activeIndex + 1].key)} className="min-h-12 flex-1 rounded-full bg-pine px-4 text-sm font-semibold text-white disabled:opacity-40">Next department</button></div>
        </footer>
      </div>
    </dialog>
  );
}
