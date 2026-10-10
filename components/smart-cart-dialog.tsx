"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

export function SmartCartDialog({ open, title, onClose, children }: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const body = document.body;
    const previous = { overflow: body.style.overflow, position: body.style.position, top: body.style.top, left: body.style.left, right: body.style.right, width: body.style.width };
    Object.assign(body.style, { overflow: "hidden", position: "fixed", top: `-${scrollY}px`, left: "0", right: "0", width: "100%" });
    dialog.showModal();
    if (contentRef.current) contentRef.current.scrollTop = 0;
    return () => {
      dialog.close();
      Object.assign(body.style, previous);
      opener?.focus({ preventScroll: true });
      window.scrollTo({ left: scrollX, top: scrollY, behavior: "instant" });
    };
  }, [open]);

  if (!open) return null;
  return <dialog ref={dialogRef} aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); onClose(); }} className="fixed inset-0 m-auto flex max-h-[92dvh] w-[calc(100%_-_1.5rem)] max-w-2xl flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white p-0 text-ink shadow-xl backdrop:bg-ink/55 backdrop:backdrop-blur-sm">
    <header className="flex shrink-0 items-center justify-between gap-4 border-b border-stone-200 bg-white px-5 py-3">
      <h2 id={titleId} className="font-display text-xl">{title}</h2>
      <button type="button" aria-label={`Close ${title.toLowerCase()}`} onClick={onClose} className="min-h-11 shrink-0 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-cream">Close</button>
    </header>
    <div ref={contentRef} className="min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-8">{children}</div>
  </dialog>;
}
