"use client";

import { RefreshCw } from "lucide-react";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/cn";

/**
 * Reloads everything the page on screen is showing from the Bank. Spins while the data is on its way.
 * Only active queries are refetched, so nothing the person is not looking at is touched.
 */
export function RefreshButton({ className }: { className?: string }) {
  const qc = useQueryClient();
  const busy = useIsFetching() > 0;
  return (
    <button
      type="button"
      onClick={() => void qc.refetchQueries({ type: "active" })}
      disabled={busy}
      aria-label="Refresh"
      title="Refresh"
      className={cn("inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-white px-3.5 text-sm font-medium text-ink-700 hover:bg-surface disabled:opacity-60", className)}
    >
      <RefreshCw size={16} aria-hidden className={busy ? "animate-spin" : undefined} /> Refresh
    </button>
  );
}
