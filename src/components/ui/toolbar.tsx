"use client";

import { useLayoutEffect, useState, type ReactNode } from "react";
import { ArrowDown, CalendarDays, ListFilter, Search } from "lucide-react";
import { cn } from "@/lib/cn";

const pill = "inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-white px-3.5 text-sm font-medium text-ink-900 hover:bg-surface";

/** Figma search field: 318x40, grey fill, magnifier on the left. */
export function SearchField({ value, onChange, placeholder, label }: { value: string; onChange: (v: string) => void; placeholder: string; label?: string }) {
  return (
    <div className="relative w-full max-w-[318px]">
      <Search size={18} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-900" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label ?? placeholder}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg bg-surface pl-10 pr-3 text-sm text-ink-900 placeholder:text-ink-400 focus:bg-white focus:outline-2 focus:outline-brand-600"
      />
    </div>
  );
}

/** "Filters" button with a drop-down panel for the screen's filter controls. */
export function FiltersButton({ children, active }: { children: ReactNode; active?: number }) {
  const [open, setOpen] = useState(false);
  useLayoutEffect(() => () => setOpen(false), []);
  return (
    <div className="relative">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={pill}>
        <ListFilter size={16} aria-hidden /> Filters
        {active ? <span className="rounded-full bg-accent-500 px-1.5 text-[11px] font-semibold text-white tabular">{active}</span> : null}
      </button>
      {open && <div className="absolute left-0 z-20 mt-2 flex w-72 flex-col gap-3 rounded-xl border border-line bg-white p-4 shadow-pop">{children}</div>}
    </div>
  );
}

/** "Date Range" button with from and to dates. */
export function DateRangeButton({ from, to, onChange }: { from: string; to: string; onChange: (from: string, to: string) => void }) {
  const [open, setOpen] = useState(false);
  useLayoutEffect(() => () => setOpen(false), []);
  const field = "h-10 w-full rounded-lg bg-surface px-3 text-sm";
  return (
    <div className="relative">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={cn(pill, (from || to) && "border-accent-500")}>
        <CalendarDays size={16} aria-hidden /> Date Range
      </button>
      {open && (
        <div className="absolute left-0 z-20 mt-2 flex w-64 flex-col gap-3 rounded-xl border border-line bg-white p-4 shadow-pop">
          <label className="text-[13px] font-medium">From<input type="date" value={from} onChange={(e) => onChange(e.target.value, to)} className={cn(field, "mt-1.5")} /></label>
          <label className="text-[13px] font-medium">To<input type="date" value={to} onChange={(e) => onChange(from, e.target.value)} className={cn(field, "mt-1.5")} /></label>
          <button type="button" className="self-start text-[13px] font-medium text-brand-700" onClick={() => onChange("", "")}>Clear dates</button>
        </div>
      )}
    </div>
  );
}

/** Figma "Download as CSV" button: pale green fill, green label, arrow on the right. */
export function DownloadCsvButton({ onClick, label = "Download as CSV" }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex h-10 items-center gap-2 rounded-lg border border-accent-100 bg-accent-50 px-4 text-sm font-medium text-accent-700 hover:bg-accent-100">
      {label} <ArrowDown size={16} aria-hidden />
    </button>
  );
}

/** Row under the page title: search and filters on the left, actions on the right. */
export function Toolbar({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      {children}
      {actions && <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Figma list footer: "Showing 1-12 of 128 cases" on the left, page buttons on the right. */
export function Pagination({ shown, total, noun }: { shown: number; total: number; noun: string }) {
  const btn = "grid h-8 min-w-8 place-items-center rounded-md px-2 text-[13px] font-medium";
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-[13px] text-ink-500">
      <span>Showing {shown === 0 ? 0 : 1}–{shown} of {total} {noun}</span>
      <span className="flex items-center gap-1">
        <button type="button" disabled className={cn(btn, "text-ink-400")}>Previous</button>
        <span aria-current="page" className={cn(btn, "bg-surface text-ink-900")}>1</span>
        <button type="button" disabled className={cn(btn, "text-ink-400")}>Next</button>
      </span>
    </div>
  );
}
