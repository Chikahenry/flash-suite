import "server-only";

// Server-only settings. Read from .env.local (see .env.example) or the host's environment; nothing here reaches the browser.
// The addresses are read when first used, not when the file loads, so a build never needs them: a missing one
// fails the request that needs it, with a clear message, instead of failing the whole deploy.

const required = (name: string, fallback?: string): string => {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Missing environment variable ${name}. Set it in .env.local, or in the host's environment settings (see .env.example).`);
  return value;
};

export const config = {
  get baseUrl() {
    return required("BACKEND_BASE_URL").replace(/\/+$/, "");
  },
  /** Authentication service (Fidelity Bank Authentication API). */
  get authBaseUrl() {
    return required("AUTH_BASE_URL").replace(/\/+$/, "");
  },
  channel: process.env.BACKEND_CHANNEL ?? "BACKOFFICE",
  /** Give up on a back-end call after this long, so a slow system never hangs a screen. */
  timeoutMs: 20_000,
  paths: {
    login: process.env.AUTH_LOGIN_PATH ?? "/api/v1/auth/login",
    otpVerify: process.env.AUTH_OTP_VERIFY_PATH ?? "/api/v1/auth/otp/verify",
    refresh: process.env.AUTH_REFRESH_PATH ?? "/api/v1/auth/token/refresh",
    passwordChange: process.env.AUTH_PASSWORD_CHANGE_PATH ?? "/api/v1/auth/password/change",
    recoveryInitiate: "/api/v1/auth/password/recovery/initiate",
    recoveryVerify: "/api/v1/auth/password/recovery/verify",
    recoveryComplete: "/api/v1/auth/password/recovery/complete",
    logout: process.env.AUTH_LOGOUT_PATH ?? "/api/v1/auth/logout",
  },
} as const;
