"use client";

import { useEffect } from "react";

/**
 * Closes an open dropdown or menu when the user clicks or taps outside it, or presses Escape.
 * Put `data-dismiss={key}` on the element that holds both the trigger and the panel, so a click on
 * the trigger itself is left to its own toggle instead of closing and reopening the panel.
 */
export function useDismiss(open: boolean, close: () => void, key: string) {
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const inside = (e.target as Element | null)?.closest?.("[data-dismiss]");
      if (inside?.getAttribute("data-dismiss") !== key) close();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close, key]);
}
