import { backendFetch } from "@/lib/server/backend";
import { config } from "@/lib/server/config";
import { failure, isSameOrigin, json, readJson, text, guard } from "@/lib/server/http";

// Forgotten password, in three calls to the Authentication API (all before sign-in):
//   start    POST /api/v1/auth/password/recovery/initiate  { username }               -> recoveryId, destination
//   verify   POST /api/v1/auth/password/recovery/verify    { recoveryId, otp }        -> recoveryToken
//   complete POST /api/v1/auth/password/recovery/complete  { recoveryId, recoveryToken, newPassword }
// The recovery token is handed to the browser only to be sent straight back on the last step.
async function handle(request: Request) {
  if (!isSameOrigin(request)) return failure(403, "FORBIDDEN", "Request refused.");

  const body = await readJson(request);
  const action = text(body?.action, 12);
  const call = (path: string, payload: Record<string, unknown>) => backendFetch<Record<string, unknown>>(path, { method: "POST", base: config.authBaseUrl, body: payload });

  if (action === "start") {
    const username = text(body?.username, 254);
    if (!username) return failure(400, "VALIDATION", "Enter your email address.");
    const r = await call(config.paths.recoveryInitiate, { username });
    if (!r.ok) return failure(r.status, r.error.code, r.error.message);
    const d = r.body.data ?? {};
    return json({ status: "started", recoveryId: text(d.recoveryId, 100), destination: text(d.destination, 100) });
  }

  if (action === "verify") {
    const recoveryId = text(body?.recoveryId, 100);
    const otp = text(body?.otp, 12);
    if (!recoveryId || !otp) return failure(400, "VALIDATION", "Enter the code you received.");
    const r = await call(config.paths.recoveryVerify, { recoveryId, otp });
    if (!r.ok) return failure(r.status, r.error.code, r.error.message);
    return json({ status: "verified", recoveryToken: text(r.body.data?.recoveryToken, 2000) });
  }

  if (action === "complete") {
    const recoveryId = text(body?.recoveryId, 100);
    const recoveryToken = text(body?.recoveryToken, 2000);
    const newPassword = text(body?.newPassword, 256);
    if (!recoveryId || !recoveryToken) return failure(400, "VALIDATION", "Start again from Forgot Password.");
    if (!newPassword || newPassword.length < 8) return failure(400, "VALIDATION", "The new password must be at least 8 characters.");
    const r = await call(config.paths.recoveryComplete, { recoveryId, recoveryToken, newPassword });
    if (!r.ok) return failure(r.status, r.error.code, r.error.message);
    return json({ status: "completed" });
  }

  return failure(400, "VALIDATION", "Unknown request.");
}
export const POST = guard(handle);
