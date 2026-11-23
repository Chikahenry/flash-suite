import "server-only";
import { cookies } from "next/headers";
import { backendFetch } from "./backend";
import { config } from "./config";

// The staff session lives in httpOnly cookies, so page scripts can never read the tokens.
// Access tokens are short (about 5 minutes); the refresh token keeps the session going.

const NAME = { access: "bo_at", refresh: "bo_rt", expiresAt: "bo_exp", startedAt: "bo_start", sessionId: "bo_sid", userId: "bo_uid", username: "bo_user" } as const;

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
  refreshExpiresIn?: number;
  sessionId?: string;
  userId?: string;
}

const asString = (v: unknown) => (typeof v === "string" && v ? v : undefined);
const asNumber = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : undefined);

/**
 * Pulls the tokens out of a sign-in or refresh response. The back end returns them either
 * nested (data.tokens, from login) or flat (data, from OTP verify and refresh); both are handled.
 */
export function extractTokens(data: unknown): Tokens | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const t = (d.tokens && typeof d.tokens === "object" ? d.tokens : d) as Record<string, unknown>;
  const accessToken = asString(t.accessToken);
  const refreshToken = asString(t.refreshToken);
  if (!accessToken || !refreshToken) return null;
  return {
    accessToken,
    refreshToken,
    expiresIn: asNumber(t.expiresIn),
    refreshExpiresIn: asNumber(t.refreshExpiresIn),
    sessionId: asString(t.sessionId),
    userId: asString(t.userId),
  };
}

const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge,
});

/** Writes the session cookies. Route handlers only: Next.js does not allow cookie writes while rendering a page. */
export async function saveSession(tokens: Tokens, { keepStart = false, username }: { keepStart?: boolean; username?: string } = {}) {
  const jar = await cookies();
  const now = Date.now();
  const accessTtl = tokens.expiresIn ?? 300;
  const sessionTtl = tokens.refreshExpiresIn ?? 1800;

  jar.set(NAME.access, tokens.accessToken, cookieOptions(sessionTtl));
  jar.set(NAME.refresh, tokens.refreshToken, cookieOptions(sessionTtl));
  jar.set(NAME.expiresAt, String(now + accessTtl * 1000), cookieOptions(sessionTtl));
  if (!keepStart || !jar.has(NAME.startedAt)) jar.set(NAME.startedAt, String(now), cookieOptions(60 * 60 * 9));
  if (tokens.sessionId) jar.set(NAME.sessionId, tokens.sessionId, cookieOptions(sessionTtl));
  if (tokens.userId) jar.set(NAME.userId, tokens.userId, cookieOptions(sessionTtl));
  // The signed-in email, only to show who is signed in. Lives as long as the 8-hour session limit.
  if (username) jar.set(NAME.username, username, cookieOptions(60 * 60 * 9));
}

export async function clearSession() {
  const jar = await cookies();
  for (const name of Object.values(NAME)) jar.delete(name);
}

export interface SessionInfo {
  accessToken?: string;
  refreshToken?: string;
  expiresAt: number;
  startedAt: number;
  sessionId?: string;
  userId?: string;
  username?: string;
}

export async function readSession(): Promise<SessionInfo | null> {
  const jar = await cookies();
  const accessToken = jar.get(NAME.access)?.value;
  const refreshToken = jar.get(NAME.refresh)?.value;
  if (!accessToken && !refreshToken) return null;
  return {
    accessToken,
    refreshToken,
    expiresAt: Number(jar.get(NAME.expiresAt)?.value) || 0,
    startedAt: Number(jar.get(NAME.startedAt)?.value) || 0,
    sessionId: jar.get(NAME.sessionId)?.value,
    userId: jar.get(NAME.userId)?.value,
    username: jar.get(NAME.username)?.value,
  };
}

// Two calls arriving together must not both spend the same refresh token.
const refreshing = new Map<string, Promise<Tokens | null>>();

async function refreshTokens(refreshToken: string): Promise<Tokens | null> {
  const pending = refreshing.get(refreshToken);
  if (pending) return pending;
  const job = (async () => {
    const result = await backendFetch<unknown>(config.paths.refresh, {
      method: "POST",
      base: config.authBaseUrl,
      body: { refreshToken, channel: config.channel },
    });
    return result.ok ? extractTokens(result.body.data) : null;
  })().finally(() => refreshing.delete(refreshToken));
  refreshing.set(refreshToken, job);
  return job;
}

/**
 * Returns an access token that is still valid, refreshing it first if it is about to expire.
 * Returns null, and clears the session, when it cannot be renewed: the staff member must sign in again.
 * Route handlers only, because a refresh writes new cookies.
 */
export async function getValidAccessToken({ force = false }: { force?: boolean } = {}): Promise<string | null> {
  const session = await readSession();
  if (!session) return null;
  if (!force && session.accessToken && Date.now() < session.expiresAt - 15_000) return session.accessToken;
  if (!session.refreshToken) {
    await clearSession();
    return null;
  }
  const tokens = await refreshTokens(session.refreshToken);
  if (!tokens) {
    await clearSession();
    return null;
  }
  await saveSession(tokens, { keepStart: true });
  return tokens.accessToken;
}
