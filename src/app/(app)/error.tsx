"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";

// Shown when a screen fails to render. The message is deliberately plain: technical detail goes
// to the log, never to the screen (BRD section 21, DIR011).
export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="mx-auto mt-20 flex max-w-md flex-col items-center gap-3 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-red-50 text-red-600"><TriangleAlert size={22} aria-hidden /></span>
      <h1 className="text-xl font-semibold text-ink-900">This screen could not be loaded</h1>
      <p className="text-sm text-ink-500">Nothing was changed. Try again; if it keeps happening, contact Channels Support and tell them which screen you were on.</p>
      <button type="button" onClick={() => retry()} className="mt-2 h-10 rounded-lg bg-accent-500 px-5 text-sm font-medium text-white hover:bg-accent-600">Try again</button>
    </div>
  );
}
