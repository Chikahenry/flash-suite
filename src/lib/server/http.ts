import "server-only";

/** Small helpers shared by the API route handlers. */

export const noStore = { "Cache-Control": "no-store" } as const;

export const json = (body: unknown, status = 200) => Response.json(body, { status, headers: noStore });

export const failure = (status: number, code: string, message: string) => json({ status: "error", code, message }, status);

/**
 * Rejects a state-changing request that comes from another website. Cookies are already SameSite=Strict;
 * this is a second guard that checks the Origin header against our own host.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // non-browser callers (and same-origin GET) send none
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

/** Reads a small JSON object body. Returns null when it is missing, too large or not an object. */
export async function readJson(request: Request, maxBytes = 4096): Promise<Record<string, unknown> | null> {
  const text = await request.text();
  if (!text || text.length > maxBytes) return null;
  try {
    const value: unknown = JSON.parse(text);
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export const text = (value: unknown, max: number): string | null => (typeof value === "string" && value.length > 0 && value.length <= max ? value : null);
