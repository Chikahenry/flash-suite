import { Check, Circle } from "lucide-react";
import { PASSWORD_RULES } from "@/lib/password";

/** Live checklist under a new-password field: each rule turns green as it is met. */
export function PasswordRules({ value }: { value: string }) {
  return (
    <ul className="grid gap-1.5 text-[13px]" aria-label="Password rules">
      {PASSWORD_RULES.map((r) => {
        const ok = r.test(value);
        return (
          <li key={r.id} className={ok ? "flex items-center gap-2 text-accent-700" : "flex items-center gap-2 text-ink-500"}>
            {ok ? <Check size={14} aria-hidden /> : <Circle size={14} aria-hidden />} {r.label}
          </li>
        );
      })}
    </ul>
  );
}
