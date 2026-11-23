"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AtSign, Eye, EyeOff, KeyRound, Lock } from "lucide-react";
import { authButton, authInput } from "@/components/ui/auth-styles";
import { Notice } from "@/components/ui/layout";

type Step = "credentials" | "otp" | "newPassword" | "forgotEmail" | "forgotCode" | "forgotNew";
type Reply = { status: string; message?: string; recoveryId?: string; recoveryToken?: string; destination?: string };

const REASONS: Record<string, string> = {
  timeout: "You were signed out after 15 minutes without activity. Log in again to continue.",
  expired: "Your session has ended. Log in again to continue.",
};

/** Only follow a return address that stays inside the app. */
const safeNext = (value: string | null) => (value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/login") ? value : "/dashboard");

async function post(url: string, body: unknown): Promise<Reply> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data: unknown = await res.json().catch(() => null);
    const d = (data ?? {}) as Reply;
    if (!res.ok && d.status !== "error") return { status: "error", message: "Something went wrong. Try again." };
    return { ...d, message: d.message ?? (d.status === "error" ? "Something went wrong. Try again." : undefined) };
  } catch {
    return { status: "error", message: "Could not reach the server. Check your connection and try again." };
  }
}

function PasswordInput({ id, label, value, onChange, autoComplete, autoFocus }: { id: string; label: string; value: string; onChange: (v: string) => void; autoComplete: string; autoFocus?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="mb-2.5 block text-sm font-medium text-ink-900">{label}</label>
      <div className="relative">
        <Lock size={18} aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 fill-ink-400 text-ink-400" />
        <input id={id} name={id} type={show ? "text" : "password"} autoComplete={autoComplete} autoFocus={autoFocus} placeholder="******************" value={value} onChange={(e) => onChange(e.target.value)} className={authInput} />
        <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1.5 text-ink-700 hover:text-ink-900">
          {show ? <Eye size={20} /> : <EyeOff size={20} />}
        </button>
      </div>
    </div>
  );
}

const Heading = ({ title, sub }: { title: string; sub: string }) => (
  <>
    <h1 className="text-center text-[28px] font-bold leading-9 text-ink-900">{title}</h1>
    <p className="mt-[18px] text-center text-lg text-ink-500">{sub}</p>
  </>
);

// Against the Authentication API (see /api/auth/*):
//   email + password -> signed in, or a one-time code is needed, or a temporary password must be replaced
//   one-time code    -> signed in
//   Forgot Password  -> email, code sent to the registered contact, new password
// Passwords stay in this component's memory between steps; they are never stored.
export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const reason = REASONS[params.get("reason") ?? ""];

  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [show, setShow] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [again, setAgain] = useState("");
  const [recovery, setRecovery] = useState<{ id: string; token: string; destination?: string }>({ id: "", token: "" });
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const finish = () => {
    router.replace(safeNext(params.get("next")));
    router.refresh();
  };
  const go = (next: Step) => { setStep(next); setError(null); setOtp(""); setNewPassword(""); setAgain(""); };

  /** Runs one call, shows its error, and hands the reply to `then` when it did not fail. */
  const run = async (url: string, body: unknown, then: (r: Reply) => void) => {
    setError(null);
    setBusy(true);
    const r = await post(url, body);
    setBusy(false);
    if (r.status === "error") return setError(r.message ?? "Something went wrong. Try again.");
    then(r);
  };

  const checkNew = () => {
    if (newPassword.length < 8) return setError("The new password must be at least 8 characters."), false;
    if (newPassword !== again) return setError("The new password and the re-typed password do not match."), false;
    return true;
  };

  const submitCredentials = (e: FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Enter your Bank email address.");
    if (!password) return setError("Enter your password.");
    setInfo(null);
    void run("/api/auth/login", { username: email.trim(), password }, (r) => {
      if (r.status === "authenticated") return finish();
      if (r.status === "otp_required") return go("otp");
      if (r.status === "password_change_required") return go("newPassword");
      setError("Something went wrong. Try again.");
    });
  };

  const submitOtp = (e: FormEvent) => {
    e.preventDefault();
    if (!/^[A-Za-z0-9]{4,12}$/.test(otp.trim())) return setError("Enter the one-time code.");
    void run("/api/auth/otp", { username: email.trim(), password, otp: otp.trim() }, (r) => {
      if (r.status === "authenticated") return finish();
      setError("Something went wrong. Try again.");
    });
    setOtp("");
  };

  /** Asks the Bank to send a fresh code by repeating step 1. The password is still only in memory. */
  const resendOtp = () => {
    setInfo(null);
    void run("/api/auth/login", { username: email.trim(), password }, (r) => {
      if (r.status === "authenticated") return finish();
      if (r.status === "otp_required") return setInfo("A new code has been sent.");
      setError("Something went wrong. Try again.");
    });
  };

  const submitNewPassword = (e: FormEvent) => {
    e.preventDefault();
    if (!checkNew()) return;
    void run("/api/auth/password", { username: email.trim(), currentPassword: password, newPassword }, (r) => {
      if (r.status === "authenticated") return finish();
      // Changed, but the back end wants a fresh sign-in with the new password.
      setPassword("");
      setInfo("Password changed. Log in with your new password.");
      go("credentials");
    });
  };

  const startRecovery = (e: FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Enter your Bank email address.");
    void run("/api/auth/recovery", { action: "start", username: email.trim() }, (r) => {
      if (!r.recoveryId) return setError("Something went wrong. Try again.");
      setRecovery({ id: r.recoveryId, token: "", destination: r.destination });
      go("forgotCode");
    });
  };

  const verifyRecovery = (e: FormEvent) => {
    e.preventDefault();
    if (!/^[A-Za-z0-9]{4,12}$/.test(otp.trim())) return setError("Enter the code you received.");
    void run("/api/auth/recovery", { action: "verify", recoveryId: recovery.id, otp: otp.trim() }, (r) => {
      if (!r.recoveryToken) return setError("Something went wrong. Try again.");
      setRecovery((v) => ({ ...v, token: r.recoveryToken ?? "" }));
      go("forgotNew");
    });
  };

  const completeRecovery = (e: FormEvent) => {
    e.preventDefault();
    if (!checkNew()) return;
    void run("/api/auth/recovery", { action: "complete", recoveryId: recovery.id, recoveryToken: recovery.token, newPassword }, () => {
      setPassword("");
      setRecovery({ id: "", token: "" });
      setInfo("Password reset. Log in with your new password.");
      go("credentials");
    });
  };

  const errorNotice = error && <Notice tone="danger">{error}</Notice>;
  const back = (to: Step, label: string) => <button type="button" onClick={() => go(to)} className="text-sm text-ink-500 hover:text-ink-900">{label}</button>;

  if (step === "otp" || step === "forgotCode") {
    const forgot = step === "forgotCode";
    return (
      <form onSubmit={forgot ? verifyRecovery : submitOtp} noValidate>
        <Heading title="Verify it's you." sub={forgot ? `Enter the code sent to ${recovery.destination ?? "your registered contact"}` : "Enter your one-time code to finish logging in"} />
        <div className="mt-8 flex flex-col gap-6">
          {errorNotice}
          {info && !error && <Notice tone="info">{info}</Notice>}
          <div>
            <label htmlFor="otp" className="mb-2.5 block text-sm font-medium text-ink-900">{forgot ? "Code" : "One-time code"}</label>
            <div className="relative">
              <KeyRound size={20} aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
              <input id="otp" name="otp" inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={12} placeholder="Enter the code" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\s/g, ""))} className={authInput} />
            </div>
          </div>
          <button type="submit" disabled={busy} className={authButton}>{busy ? "Verifying…" : forgot ? "Verify code" : "Verify and log in"}</button>
          {!forgot && <button type="button" disabled={busy} onClick={resendOtp} className="text-sm font-medium text-accent-700 hover:underline disabled:opacity-50">Resend code</button>}
          {back("credentials", forgot ? "Back to log in" : "Use a different account")}
        </div>
      </form>
    );
  }

  if (step === "newPassword" || step === "forgotNew") {
    const forgot = step === "forgotNew";
    return (
      <form onSubmit={forgot ? completeRecovery : submitNewPassword} noValidate>
        <Heading title={forgot ? "Set a new password." : "Choose a new password."} sub={forgot ? "Pick a password you have not used before" : "Your password is temporary. Set your own to continue"} />
        <div className="mt-8 flex flex-col gap-6">
          {errorNotice}
          <PasswordInput id="new-password" label="New Password" value={newPassword} onChange={setNewPassword} autoComplete="new-password" autoFocus />
          <PasswordInput id="again-password" label="Re-type Password" value={again} onChange={setAgain} autoComplete="new-password" />
          <button type="submit" disabled={busy} className={authButton}>{busy ? "Saving…" : forgot ? "Reset password" : "Change password and log in"}</button>
          {back("credentials", "Back to log in")}
        </div>
      </form>
    );
  }

  if (step === "forgotEmail") {
    return (
      <form onSubmit={startRecovery} noValidate>
        <Heading title="Forgot your password?" sub="Enter your email and we will send a code to your registered contact" />
        <div className="mt-8 flex flex-col gap-6">
          {errorNotice}
          <div>
            <label htmlFor="email" className="mb-2.5 block text-sm font-medium text-ink-900">Email</label>
            <div className="relative">
              <AtSign size={20} aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
              <input id="email" name="email" type="email" autoComplete="username" autoFocus placeholder="hey.john@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className={authInput} />
            </div>
          </div>
          <button type="submit" disabled={busy} className={authButton}>{busy ? "Sending…" : "Send code"}</button>
          {back("credentials", "Back to log in")}
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={submitCredentials} noValidate>
      <Heading title="Log in to your account." sub="Enter your credentials to login to your account" />
      <div className="mt-8 flex flex-col gap-6">
        {reason && !error && !info && <Notice tone="warning">{reason}</Notice>}
        {info && !error && <Notice tone="success">{info}</Notice>}
        {errorNotice}

        <div>
          <label htmlFor="email" className="mb-2.5 block text-sm font-medium text-ink-900">Email</label>
          <div className="relative">
            <AtSign size={20} aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
            <input id="email" name="email" type="email" autoComplete="username" autoFocus placeholder="hey.john@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className={authInput} />
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
          <button type="button" onClick={() => go("forgotEmail")} className="mt-3 text-sm text-ink-500 hover:text-ink-900">Forgot Password?</button>
        </div>

        <button type="submit" disabled={busy} className={authButton}>{busy ? "Checking…" : "Login"}</button>
      </div>
    </form>
  );
}
