import { TriangleAlert } from "lucide-react";
import { ApiError } from "@/lib/bo/client";
import { Button } from "./button";

/** Shown when a screen's data could not be loaded. Says what failed and offers a retry; never shows technical detail. */
export function ErrorState({ error, onRetry, title = "This could not be loaded" }: { error: unknown; onRetry?: () => void; title?: string }) {
  const notFound = error instanceof ApiError && error.status === 404;
  const message = error instanceof ApiError ? error.message : "Something went wrong. Try again.";
  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-xl border border-dashed border-line bg-white px-6 py-12 text-center">
      <span className="grid size-11 place-items-center rounded-full bg-red-50 text-red-600"><TriangleAlert size={20} aria-hidden /></span>
      <p className="text-sm font-semibold text-ink-900">{notFound ? "Not found" : title}</p>
      <p className="text-[13px] text-ink-500">{message}</p>
      {onRetry && !notFound && <Button variant="secondary" size="sm" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-lg bg-surface ${className}`} />;
}
