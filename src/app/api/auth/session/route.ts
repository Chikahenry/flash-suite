import { failure, json } from "@/lib/server/http";
import { getValidAccessToken, readSession } from "@/lib/server/session";

// Is this browser still signed in? Renews the short-lived access token behind the scenes when needed.
// Returns only times and IDs: never a token.
export async function GET() {
  const token = await getValidAccessToken();
  if (!token) return failure(401, "UNAUTHENTICATED", "Not signed in.");

  const session = await readSession();
  return json({ authenticated: true, expiresAt: session?.expiresAt ?? null, startedAt: session?.startedAt ?? null, userId: session?.userId ?? null, username: session?.username ?? null });
}
