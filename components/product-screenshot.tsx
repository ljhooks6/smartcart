"use client";

import Image from "next/image";
import { useId, useRef, useState } from "react";

type ProductScreenshotProps = {
  src: string;
  alt: string;
  title: string;
  width: number;
  height: number;
  sizes: string;
  priority?: boolean;
  className?: string;
};

export function ProductScreenshot({ src, alt, title, width, height, sizes, priority, className }: ProductScreenshotProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const headingId = useId();
  const descriptionId = useId();
  const [opened, setOpened] = useState(false);

  function enlarge() {
    setOpened(true);
    dialog.current?.showModal();
    closeButton.current?.focus();
  }

  return <>
    <button ref={trigger} type="button" aria-label={`Enlarge ${title} screenshot`} aria-haspopup="dialog" onClick={enlarge} className="group block w-full cursor-zoom-in rounded-xl text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pine">
      <Image src={src} alt={alt} width={width} height={height} sizes={sizes} priority={priority} className={className} />
      <span className="block bg-white px-3 py-2 text-center text-xs font-semibold text-pine underline group-hover:bg-cream">Tap or click to enlarge</span>
    </button>
    <dialog ref={dialog} aria-labelledby={headingId} aria-describedby={descriptionId} onClose={() => { setOpened(false); trigger.current?.focus({ preventScroll: true }); }} className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-5xl overflow-y-auto overscroll-contain rounded-2xl bg-white p-0 text-ink shadow-halo backdrop:bg-black/70">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-pine/20 bg-white px-4 py-3">
        <h2 id={headingId} className="text-lg font-bold text-pine">{title} preview</h2>
        <button ref={closeButton} type="button" onClick={() => dialog.current?.close()} className="min-h-11 rounded-lg bg-pine px-4 py-2 font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine">Close</button>
      </div>
      {opened ? <div className="p-3 sm:p-5">
        <p id={descriptionId} className="mb-4 text-sm leading-relaxed">Actual development preview with synthetic data, not customer information. Press Escape or choose Close to return to the page.</p>
        <Image src={src} alt={alt} width={width} height={height} unoptimized className="mx-auto h-auto max-w-full" />
        <a href={src} target="_blank" rel="noopener" className="mt-4 inline-flex min-h-11 items-center py-2 font-semibold text-pine underline">Open original image (new tab)</a>
      </div> : null}
    </dialog>
  </>;
}
