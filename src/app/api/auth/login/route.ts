import { backendFetch } from "@/lib/server/backend";
import { config } from "@/lib/server/config";
import { failure, isSameOrigin, json, readJson, text, guard } from "@/lib/server/http";
import { extractTokens, saveSession } from "@/lib/server/session";

// Step 1 of sign-in (Authentication API: POST /api/v1/auth/login). The browser sends the credentials here;
// this handler forwards them, so the password and the tokens never touch page scripts or browser storage.
//
// The back end answers with a step: AUTHENTICATED (tokens included), OTP_REQUIRED or PASSWORD_CHANGE_REQUIRED.
// Replies to the browser with one of:
//   { status: "authenticated" }             tokens were saved in secure cookies
//   { status: "otp_required" }              the one-time code is needed next
//   { status: "password_change_required" }  the temporary password must be replaced first
//   { status: "error", code, message }
const OTP_HINT = /otp|mfa|2fa|one.?time/i;

async function handle(request: Request) {
  if (!isSameOrigin(request)) return failure(403, "FORBIDDEN", "Request refused.");

  const body = await readJson(request);
  const username = text(body?.username, 254);
  const password = text(body?.password, 256);
  if (!username || !password) return failure(400, "VALIDATION", "Enter your email and password.");

  const result = await backendFetch<Record<string, unknown>>(config.paths.login, {
    method: "POST",
    base: config.authBaseUrl,
    body: { username, password, channel: config.channel },
  });

  if (!result.ok) {
    if (OTP_HINT.test(result.error.code)) return json({ status: "otp_required" });
    return failure(result.status, result.error.code, result.error.message);
  }

  const data = result.body.data;
  const step = typeof data?.step === "string" ? data.step : undefined;
  if (step === "OTP_REQUIRED") return json({ status: "otp_required" });
  if (step === "PASSWORD_CHANGE_REQUIRED") return json({ status: "password_change_required" });

  const tokens = extractTokens(data);
  if (tokens) {
    await saveSession(tokens, { username });
    return json({ status: "authenticated" });
  }

  return failure(502, "UNEXPECTED_RESPONSE", "The sign-in service returned something unexpected. Try again, or contact Channels Support.");
}
export const POST = guard(handle);
