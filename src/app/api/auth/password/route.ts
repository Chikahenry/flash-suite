import { backendFetch } from "@/lib/server/backend";
import { config } from "@/lib/server/config";
import { failure, isSameOrigin, json, readJson, text } from "@/lib/server/http";
import { extractTokens, readSession, saveSession } from "@/lib/server/session";

// Change the signed-in staff member's password, or replace a temporary one at sign-in
// (Authentication API: POST /api/v1/auth/password/change). On success the back end returns fresh tokens,
// which replace the session. Passwords are forwarded only; never stored or logged.
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return failure(403, "FORBIDDEN", "Request refused.");

  const body = await readJson(request);
  const session = await readSession();
  const username = session?.username ?? text(body?.username, 254);
  const currentPassword = text(body?.currentPassword, 256);
  const newPassword = text(body?.newPassword, 256);
  if (!username) return failure(400, "VALIDATION", "Start again: enter your email and password.");
  if (!currentPassword || !newPassword) return failure(400, "VALIDATION", "Fill in the current and the new password.");
  if (newPassword.length < 8) return failure(400, "VALIDATION", "The new password must be at least 8 characters.");
  if (newPassword === currentPassword) return failure(400, "VALIDATION", "The new password must be different from the current one.");

  const result = await backendFetch<Record<string, unknown>>(config.paths.passwordChange, {
    method: "POST",
    base: config.authBaseUrl,
    accessToken: session?.accessToken,
    body: { username, currentPassword, newPassword, channel: config.channel },
  });
  if (!result.ok) return failure(result.status, result.error.code, result.error.message);

  const tokens = extractTokens(result.body.data);
  if (tokens) await saveSession(tokens, { keepStart: true, username });
  return json({ status: tokens ? "authenticated" : "changed" });
}
