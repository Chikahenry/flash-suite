import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { Lock } from "lucide-react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded-lg border border-transparent bg-surface px-3.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-600 focus:bg-white disabled:text-ink-500";

/** Label + control + hint/error. Pass `error` to show a field-level message (BRD NFR012). */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink-900">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-ink-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ className, icon, ...rest }: InputHTMLAttributes<HTMLInputElement> & { icon?: ReactNode }) {
  if (!icon) return <input className={cn(control, "h-10", className)} {...rest} />;
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400">{icon}</span>
      <input className={cn(control, "h-10 pl-9", className)} {...rest} />
    </div>
  );
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(control, "h-10 pr-8", className)} {...rest}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(control, "min-h-20 py-2", className)} {...rest} />;
}

export function Checkbox({ label, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return (
    <label className={cn("inline-flex items-center gap-2 text-sm text-ink-900", className)}>
      <input type="checkbox" className="size-4 rounded border-line accent-accent-500" {...rest} />
      <span>{label}</span>
    </label>
  );
}

/** A value owned by another system: shown, never editable (BRD CM-006, DIR004). */
export function ReadOnlyField({ label, value, source }: { label: string; value: ReactNode; source?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-ink-500">{label}</span>
      <span className="flex items-center gap-1.5 text-sm font-medium text-ink-900">
        {value}
        {source && (
          <span title={`Owned by ${source}. Read-only here.`} className="inline-flex items-center gap-1 rounded bg-surface px-1.5 py-0.5 text-[11px] font-normal text-ink-500">
            <Lock size={10} aria-hidden /> {source}
          </span>
        )}
      </span>
    </div>
  );
}
