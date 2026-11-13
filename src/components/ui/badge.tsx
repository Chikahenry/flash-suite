import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { Tone } from "@/lib/format";

const tones: Record<Tone, { wrap: string; dot: string }> = {
  neutral: { wrap: "bg-slate-100 text-slate-700", dot: "bg-slate-400" },
  info: { wrap: "bg-brand-50 text-brand-700", dot: "bg-brand-600" },
  success: { wrap: "bg-accent-50 text-accent-700", dot: "bg-accent-500" },
  warning: { wrap: "bg-amber-50 text-amber-800", dot: "bg-amber-500" },
  danger: { wrap: "bg-red-50 text-red-700", dot: "bg-red-500" },
};

/** Status pill. Always carries a text label, so status never relies on colour alone (BRD NFR014). */
export function Badge({ tone = "neutral", children, dot = true }: { tone?: Tone; children: ReactNode; dot?: boolean }) {
  const t = tones[tone];
  return (
    <span className={cn("inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium whitespace-nowrap", t.wrap)}>
      {dot && <span aria-hidden className={cn("size-1.5 rounded-full", t.dot)} />}
      {children}
    </span>
  );
}
