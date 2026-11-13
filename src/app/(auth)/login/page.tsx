"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AtSign, Eye, EyeOff, Lock } from "lucide-react";
import { authButton, authInput } from "@/components/ui/auth-styles";
import { Notice } from "@/components/ui/layout";

// Figma "Login": Email, Password, "Forgot Password?" and a green Login button.
// The credentials go to the Bank identity service (POST /auth/login); 2FA follows on the next step.
export default function LoginPage() {
  const router = useRouter();
  const timedOut = useSearchParams().get("reason") === "timeout";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgot, setForgot] = useState(false);
  const [busy, setBusy] = useState(false);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Enter your Bank email address.");
    if (!password) return setError("Enter your password.");
    setError(null);
    setBusy(true);
    router.push("/login/verify");
  };

  return (
    <form onSubmit={onSubmit} noValidate>
      <h1 className="text-center text-[28px] font-bold leading-9 text-ink-900">Log in to your account.</h1>
      <p className="mt-[18px] text-center text-lg text-ink-500">Enter your credentials to login to your account</p>

      <div className="mt-8 flex flex-col gap-6">
        {timedOut && !error && <Notice tone="warning">You were signed out after 15 minutes without activity. Log in again to continue.</Notice>}
        {error && <Notice tone="danger">{error}</Notice>}
        {forgot && <Notice tone="info">Passwords are managed by the Bank identity service. Contact the IT Service Desk to reset yours.</Notice>}

        <div>
          <label htmlFor="email" className="mb-2.5 block text-sm font-medium text-ink-900">Email</label>
          <div className="relative">
            <AtSign size={20} aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
            <input id="email" name="email" type="email" autoComplete="username" placeholder="hey.john@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className={authInput} />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="mb-2.5 block text-sm font-medium text-ink-900">Password</label>
          <div className="relative">
            <Lock size={18} aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 fill-ink-400 text-ink-400" />
            <input id="password" name="password" type={show ? "text" : "password"} autoComplete="current-password" placeholder="******************" value={password} onChange={(e) => setPassword(e.target.value)} className={authInput} />
            <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1.5 text-ink-700 hover:text-ink-900">
              {show ? <Eye size={20} /> : <EyeOff size={20} />}
            </button>
          </div>
          <button type="button" onClick={() => setForgot(true)} className="mt-3 text-sm text-ink-500 hover:text-ink-900">Forgot Password?</button>
        </div>

        <button type="submit" disabled={busy} className={authButton}>{busy ? "Checking…" : "Login"}</button>
      </div>
    </form>
  );
}
