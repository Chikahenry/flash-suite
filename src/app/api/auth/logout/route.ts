import { backendFetch } from "@/lib/server/backend";
import { config } from "@/lib/server/config";
import { failure, isSameOrigin, json, guard } from "@/lib/server/http";
import { clearSession, readSession } from "@/lib/server/session";

// Ends the session: tells the back end to revoke it, then always clears our cookies,
// even if the back end could not be reached, so the staff member is signed out on this browser either way.
async function handle(request: Request) {
  if (!isSameOrigin(request)) return failure(403, "FORBIDDEN", "Request refused.");

  const session = await readSession();
  if (session?.refreshToken) {
    await backendFetch(config.paths.logout, { method: "POST", base: config.authBaseUrl, accessToken: session.accessToken, body: { refreshToken: session.refreshToken, channel: config.channel } });
  }
  await clearSession();
  return json({ status: "signed_out" });
}
export const POST = guard(handle);
