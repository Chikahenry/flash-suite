import type { ReactNode } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";

export function PageHeader({ title, description, actions, back }: { title: string; description?: string; actions?: ReactNode; back?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div>
        {back && <div className="mb-2">{back}</div>}
        <h1 className="text-2xl font-semibold leading-8 text-ink-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, actions, children, className, padded = true }: { title?: string; actions?: ReactNode; children: ReactNode; className?: string; padded?: boolean }) {
  return (
    <section className={cn("rounded-xl border border-line bg-white", className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          {title && <h2 className="text-sm font-semibold text-ink-900">{title}</h2>}
          {actions}
        </header>
      )}
      <div className={cn(padded && "p-5")}>{children}</div>
    </section>
  );
}

/** Source and last-update stamp required on every retrieved value (BRD DIR015). */
export function SourceStamp({ source, at, stale }: { source: string; at: string; stale?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", stale ? "text-amber-700" : "text-ink-500")}>
      <Clock size={12} aria-hidden />
      {source} · {stale ? "Not refreshed since " : "Updated "}
      {formatDateTime(at)}
    </span>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line bg-white px-6 py-12 text-center">
      <p className="text-sm font-semibold text-ink-900">{title}</p>
      {body && <p className="max-w-md text-[13px] text-ink-500">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Notice({ tone = "info", title, children }: { tone?: "info" | "warning" | "danger" | "success"; title?: string; children: ReactNode }) {
  const tones = {
    info: "border-brand-100 bg-brand-50 text-brand-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    danger: "border-red-200 bg-red-50 text-red-800",
    success: "border-accent-100 bg-accent-50 text-accent-700",
  };
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("rounded-lg border px-4 py-3 text-[13px]", tones[tone])}>
      {title && <p className="mb-0.5 font-semibold">{title}</p>}
      {children}
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string; count?: number }[]; value: T; onChange: (id: T) => void }) {
  return (
    <div role="tablist" className="mb-5 inline-flex flex-wrap gap-1 rounded-lg bg-surface p-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          type="button"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            "inline-flex h-8 items-center gap-2 rounded-md px-4 text-[13px] font-medium",
            value === t.id ? "bg-white text-ink-900 shadow-card" : "text-ink-500 hover:text-ink-900",
          )}
        >
          {t.label}
          {t.count !== undefined && (
            <span className={cn("rounded-full px-1.5 py-0.5 text-[11px] tabular", value === t.id ? "bg-accent-50 text-accent-700" : "bg-surface text-ink-500")}>{t.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function DefinitionGrid({ children, cols = 3 }: { children: ReactNode; cols?: 2 | 3 | 4 }) {
  return (
    <div className={cn("grid gap-x-6 gap-y-4 sm:grid-cols-2", cols === 3 && "lg:grid-cols-3", cols === 4 && "lg:grid-cols-4")}>{children}</div>
  );
}
