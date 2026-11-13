"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, MessageSquareText } from "lucide-react";
import { authButton } from "@/components/ui/auth-styles";
import { OtpInput } from "@/components/ui/otp-input";
import { Notice } from "@/components/ui/layout";
import { cn } from "@/lib/cn";

type Method = "token" | "sms";
const MAX_ATTEMPTS = 3;
const RESEND_SECONDS = 30;

// Step 2 of sign-in: the second factor.
// GET /auth/2fa/methods → POST /auth/2fa/challenge → POST /auth/2fa/verify (+ /resend).
// Mock rule: any 6 digits pass except 000000, which demonstrates the failure and lockout states.
export default function VerifyPage() {
  const router = useRouter();
  const [method, setMethod] = useState<Method>("token");
  const [code, setCode] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(RESEND_SECONDS);
  const locked = attempts >= MAX_ATTEMPTS;

  useEffect(() => {
    if (method !== "sms" || resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [method, resendIn]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (code.length < 6) {
      setError("Enter all 6 digits.");
      return;
    }
    if (code === "000000") {
      const next = attempts + 1;
      setAttempts(next);
      setCode("");
      setError(next >= MAX_ATTEMPTS ? null : `That code is not valid. ${MAX_ATTEMPTS - next} attempt${MAX_ATTEMPTS - next === 1 ? "" : "s"} left.`);
      return;
    }
    sessionStorage.setItem("bo-session", String(Date.now()));
    router.push("/dashboard");
  };

  if (locked) {
    return (
      <div className="flex flex-col gap-5 text-center">
        <h1 className="text-[28px] font-bold leading-9 text-ink-900">Verification locked.</h1>
        <Notice tone="danger" title="Too many incorrect codes">
          Sign-in is locked for this staff ID. Contact the IT Service Desk to unlock your token, then sign in again.
        </Notice>
        <Link href="/login" className="text-sm font-medium text-brand-700 hover:underline">Back to sign in</Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-[28px] font-bold leading-9 text-ink-900">Verify it&apos;s you.</h1>
        <p className="mt-[18px] text-lg text-ink-500">Enter the code from your second factor to continue</p>
      </div>

      <div role="radiogroup" aria-label="Verification method" className="grid grid-cols-2 gap-2">
        {([
          { id: "token", label: "Token", hint: "Hardware or app token", icon: KeyRound },
          { id: "sms", label: "SMS code", hint: "Sent to •••• 0142", icon: MessageSquareText },
        ] as const).map((m) => (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={method === m.id}
            onClick={() => { setMethod(m.id); setCode(""); setError(null); setResendIn(RESEND_SECONDS); }}
            className={cn(
              "flex items-start gap-2.5 rounded-xl border p-3.5 text-left",
              method === m.id ? "border-accent-500 bg-accent-50" : "border-line hover:bg-surface",
            )}
          >
            <m.icon size={18} aria-hidden className={method === m.id ? "text-accent-700" : "text-ink-500"} />
            <span>
              <span className="block text-sm font-medium text-ink-900">{m.label}</span>
              <span className="block text-xs text-ink-500">{m.hint}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-col items-center gap-3">
        <p className="text-sm text-ink-700">
          {method === "token" ? "Enter the 6-digit code shown on your token." : "Enter the 6-digit code we sent by SMS."}
        </p>
        <OtpInput value={code} onChange={(v) => { setCode(v); setError(null); }} invalid={!!error} autoFocus />
        {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      </div>

      <button type="submit" className={authButton}>Verify and log in</button>

      <div className="flex items-center justify-between text-[13px]">
        <Link href="/login" className="text-ink-500 hover:text-ink-900">Use a different account</Link>
        {method === "sms" && (
          <button type="button" disabled={resendIn > 0} onClick={() => setResendIn(RESEND_SECONDS)} className="font-medium text-brand-700 disabled:text-ink-400">
            {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
          </button>
        )}
      </div>
    </form>
  );
}
