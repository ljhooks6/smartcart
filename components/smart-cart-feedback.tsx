"use client";

type ToastTone = "success" | "error" | "info";

type SmartCartFeedbackProps = {
  confirmBody: string;
  confirmCancelLabel?: string;
  confirmConfirmLabel?: string;
  confirmOptOutChecked?: boolean;
  confirmOptOutLabel?: string;
  confirmOpen: boolean;
  confirmTitle: string;
  onCancelConfirm: () => void;
  onConfirm: () => void;
  onToggleConfirmOptOut?: () => void;
  toastMessage: string | null;
  toastTone: ToastTone;
};

const toneClasses: Record<ToastTone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  error: "border-rose-200 bg-rose-50 text-rose-900",
  info: "border-sky-200 bg-sky-50 text-sky-900",
};

export function SmartCartFeedback({
  confirmBody,
  confirmCancelLabel = "Cancel",
  confirmConfirmLabel = "Confirm",
  confirmOptOutChecked = false,
  confirmOptOutLabel,
  confirmOpen,
  confirmTitle,
  onCancelConfirm,
  onConfirm,
  onToggleConfirmOptOut,
  toastMessage,
  toastTone,
}: SmartCartFeedbackProps) {
  return (
    <>
      {toastMessage ? (
        <div className="fixed inset-x-0 top-4 z-[60] flex justify-center px-4">
          <div
            className={`w-full max-w-md rounded-2xl border px-4 py-3 text-sm font-medium shadow-xl ${toneClasses[toastTone]}`}
            role="status"
          >
            <div className="flex items-start gap-3">
              <span className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                toastTone === "success"
                  ? "bg-emerald-100 text-emerald-700 animate-pulse"
                  : toastTone === "error"
                    ? "bg-rose-100 text-rose-700"
                    : "bg-sky-100 text-sky-700"
              }`}>
                {toastTone === "success" ? "✓" : toastTone === "error" ? "!" : "i"}
              </span>
              <span>{toastMessage}</span>
            </div>
          </div>
        </div>
      ) : null}

      {confirmOpen ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/45 px-4 py-6 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-md rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-2xl">
            <p className="font-display text-2xl text-ink">{confirmTitle}</p>
            <p className="mt-3 text-sm leading-6 text-ink/70">{confirmBody}</p>
            {confirmOptOutLabel && onToggleConfirmOptOut ? (
              <label className="mt-4 flex items-start gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-ink/75">
                <input
                  checked={confirmOptOutChecked}
                  className="mt-1 h-4 w-4 rounded border-pine/30 text-pine focus:ring-pine"
                  onChange={onToggleConfirmOptOut}
                  type="checkbox"
                />
                <span>{confirmOptOutLabel}</span>
              </label>
            ) : null}
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                className="rounded-full border border-stone-200 px-4 py-3 text-sm font-semibold text-ink transition hover:bg-stone-100"
                onClick={onCancelConfirm}
                type="button"
              >
                {confirmCancelLabel}
              </button>
              <button
                className="rounded-full bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
                onClick={onConfirm}
                type="button"
              >
                {confirmConfirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
