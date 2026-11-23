import { backendFetch } from "@/lib/server/backend";
import { config } from "@/lib/server/config";
import { failure, isSameOrigin, json, readJson, text, guard } from "@/lib/server/http";
import { extractTokens, saveSession } from "@/lib/server/session";

// Step 2 of sign-in: completes it with the one-time code the staff member typed.
// The back end checks the code together with the credentials, so the browser keeps them in memory
// between the two steps and sends them again here. Nothing is stored.
async function handle(request: Request) {
  if (!isSameOrigin(request)) return failure(403, "FORBIDDEN", "Request refused.");

  const body = await readJson(request);
  const username = text(body?.username, 254);
  const password = text(body?.password, 256);
  const otp = text(body?.otp, 12);
  if (!username || !password) return failure(400, "VALIDATION", "Start again: enter your email and password.");
  if (!otp || !/^[A-Za-z0-9]{4,12}$/.test(otp)) return failure(400, "VALIDATION", "Enter the one-time code.");

  const result = await backendFetch<Record<string, unknown>>(config.paths.otpVerify, {
    method: "POST",
    base: config.authBaseUrl,
    body: { username, password, otp, channel: config.channel },
  });

  if (!result.ok) return failure(result.status, result.error.code, result.error.message);

  const tokens = extractTokens(result.body.data);
  if (!tokens) return failure(502, "UNEXPECTED_RESPONSE", "The sign-in service returned something unexpected. Try again, or contact Channels Support.");

  await saveSession(tokens, { username });
  return json({ status: "authenticated" });
}
export const POST = guard(handle);
