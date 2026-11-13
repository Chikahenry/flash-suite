import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "subtle" | "primary" | "secondary" | "ghost" | "danger" | "success-soft" | "danger-soft";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-accent-500 text-white hover:bg-accent-600 disabled:bg-accent-500/50",
  secondary: "bg-white text-ink-900 border border-line hover:bg-surface",
  subtle: "bg-[#f1f2f5] text-ink-900 hover:bg-line",
  ghost: "text-ink-700 hover:bg-surface",
  danger: "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-600/50",
  "success-soft": "bg-accent-50 text-accent-700 border border-accent-100 hover:bg-accent-100",
  "danger-soft": "bg-red-50 text-red-700 border border-red-100 hover:bg-red-100",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3.5 text-[13px]",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-sm",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
}

export function Button({ variant = "primary", size = "md", block, className, type = "button", ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        block && "w-full",
        className,
      )}
      {...rest}
    />
  );
}
