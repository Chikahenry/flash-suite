"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

/** Dialog built on the native <dialog>, which gives focus trapping and Escape for free. */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={cn(
        "m-auto w-[calc(100%-2rem)] rounded-2xl bg-white p-0 shadow-pop backdrop:bg-brand-950/45",
        size === "sm" && "max-w-md",
        size === "md" && "max-w-[520px]",
        size === "lg" && "max-w-3xl",
      )}
    >
      {open && (
        <div className="flex max-h-[85vh] flex-col">
          <header className="flex items-start justify-between gap-4 px-6 pt-5 pb-3">
            <div>
              <h2 id={titleId} className="text-xl font-semibold text-ink-900">{title}</h2>
              {description && <p className="mt-1 text-[13px] text-ink-500">{description}</p>}
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="rounded-full border border-line p-1 text-ink-500 hover:bg-surface">
              <X size={16} />
            </button>
          </header>
          <div className="overflow-y-auto px-6 py-3">{children}</div>
          {footer && <footer className="flex justify-end gap-3 border-t border-line px-6 py-4">{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}
