import Image from "next/image";
import { cn } from "@/lib/cn";

/**
 * Fidelity logo. On white it is the supplied PNG. On the navy sidebar the PNG's blue lettering
 * would disappear, so a white version is drawn here until the Bank supplies a reversed logo file.
 */
export function Brand({ tone = "light", className }: { tone?: "light" | "dark"; className?: string }) {
  if (tone === "dark") {
    return <Image src="/fidelity-logo.png" alt="Fidelity" width={139} height={44} priority className={cn("h-10 w-auto", className)} />;
  }
  return (
    <span className={cn("inline-flex items-center gap-2", className)} role="img" aria-label="Fidelity">
      <svg width="34" height="28" viewBox="0 0 34 28" aria-hidden>
        <rect x="1" y="1" width="32" height="26" fill="#101e8a" stroke="#fff" strokeWidth="2" />
        <path d="M2 2h30L2 26z" fill="#4cc14a" />
        <path d="M32 2 2 26" stroke="#fff" strokeWidth="2.5" />
      </svg>
      <span className="font-serif text-[26px] font-bold leading-none tracking-tight text-white">Fidelity</span>
    </span>
  );
}
