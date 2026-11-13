"use client";

import { useEffect, useRef } from "react";
import { CircleX } from "lucide-react";

/**
 * Figma confirmation dialog ("Deactivate User", "Confirm Account Block"): a red circled cross,
 * the question, a red-tinted note, then the red action and Cancel side by side.
 */
export function ConfirmDialog({
  open,
  question,
  note,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  open: boolean;
  question: string;
  note: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog ref={ref} onClose={onClose} onClick={(e) => e.target === ref.current && onClose()} aria-label={question} className="m-auto w-[calc(100%-2rem)] max-w-[400px] rounded-2xl bg-white p-0 shadow-pop backdrop:bg-brand-950/45">
      {open && (
        <div className="flex flex-col items-center gap-4 px-6 py-7 text-center">
          <CircleX size={32} className="text-red-600" aria-hidden />
          <p className="text-base font-medium text-ink-900">{question}</p>
          <p className="w-full rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{note}</p>
          <div className="mt-1 flex w-full justify-center gap-3">
            <button type="button" onClick={onConfirm} className="h-10 rounded-lg bg-red-50 px-4 text-sm font-medium text-red-700 hover:bg-red-100">{confirmLabel}</button>
            <button type="button" onClick={onClose} className="h-10 rounded-lg bg-surface px-5 text-sm font-medium text-ink-900 hover:bg-line">Cancel</button>
          </div>
        </div>
      )}
    </dialog>
  );
}
