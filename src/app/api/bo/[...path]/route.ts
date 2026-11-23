import { backendRaw, safeMessage } from "@/lib/server/backend";
import { failure, isSameOrigin, noStore } from "@/lib/server/http";
import { getValidAccessToken } from "@/lib/server/session";

// Staff API proxy. The browser calls /api/bo/<path>; this forwards it to /api/v1/backoffice/<path> on the
// Bank back end with the staff member's token, which the browser never sees.
//
//  - Only the back-office area is reachable, and only with well-formed path segments (no "..", no encoded slashes).
//  - Writes must come from our own pages (Origin check; cookies are also SameSite=Strict).
//  - A 401 from the back end triggers one forced token refresh and one retry.
//  - JSON errors are cleaned (no stack traces); files such as KYC documents and the CSV export are streamed through.

const SEGMENT = /^[A-Za-z0-9._~@-]{1,128}$/;
const FORWARD_HEADERS = ["idempotency-key", "x-step-up-token", "if-match"] as const;
const MAX_BODY = 64 * 1024;

async function handle(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const method = request.method;
  if (method !== "GET" && !isSameOrigin(request)) return failure(403, "FORBIDDEN", "Request refused.");

  const { path } = await ctx.params;
  if (!path.length || !path.every((s) => SEGMENT.test(s) && s !== "." && s !== "..")) return failure(400, "BAD_PATH", "That address is not valid.");

  let rawBody: string | undefined;
  if (method !== "GET" && method !== "DELETE") {
    const text = await request.text();
    if (text.length > MAX_BODY) return failure(413, "TOO_LARGE", "The request is too large.");
    rawBody = text || undefined;
  }

  const headers: Record<string, string> = {};
  for (const name of FORWARD_HEADERS) {
    const value = request.headers.get(name);
    if (value && value.length <= 512) headers[name] = value;
  }

  const target = `/api/v1/backoffice/${path.map(encodeURIComponent).join("/")}${new URL(request.url).search}`;

  const call = async (token: string) => backendRaw(target, { method: method as "GET", rawBody, accessToken: token, headers });

  let token = await getValidAccessToken();
  if (!token) return failure(401, "UNAUTHENTICATED", "Your session has ended. Log in again.");

  let res = await call(token);
  // A background lookup (the signed-in profile) marks itself optional: if the Bank refuses it, report that
  // to the page instead of treating it as an expired session and signing the person out.
  const optional = request.headers.get("x-optional") === "1";
  if (res?.status === 401 && !optional) {
    token = await getValidAccessToken({ force: true });
    if (!token) return failure(401, "UNAUTHENTICATED", "Your session has ended. Log in again.");
    res = await call(token);
  }
  if (!res) return failure(503, "BACKEND_UNREACHABLE", "The Bank service could not be reached. Try again shortly.");

  const type = res.headers.get("content-type") ?? "";

  // Files and any other non-JSON body: pass through untouched.
  if (res.ok && !type.includes("json")) {
    const out = new Headers(noStore);
    out.set("Content-Type", type || "application/octet-stream");
    const disposition = res.headers.get("content-disposition");
    if (disposition) out.set("Content-Disposition", disposition);
    out.set("X-Content-Type-Options", "nosniff");
    return new Response(res.body, { status: res.status, headers: out });
  }

  // JSON: pass successful envelopes through; clean up failures.
  const text = await res.text();
  let parsed: { error?: { code?: string; message?: string; fieldErrors?: { field?: unknown; message?: unknown }[] } } | null = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }
  const errored = !!(parsed?.error && (parsed.error.code || parsed.error.message));

  if (res.ok && !errored) {
    return new Response(text || "{}", { status: res.status, headers: { ...noStore, "Content-Type": "application/json" } });
  }

  const fieldErrors = Array.isArray(parsed?.error?.fieldErrors)
    ? parsed.error.fieldErrors
        .filter((f) => typeof f?.field === "string" && typeof f?.message === "string")
        .slice(0, 20)
        .map((f) => ({ field: String(f.field).slice(0, 80), message: safeMessage(f.message, 400) }))
    : undefined;

  return Response.json(
    { status: "ERROR", error: { code: parsed?.error?.code ?? `HTTP_${res.status}`, message: safeMessage(parsed?.error?.message, res.status), fieldErrors } },
    { status: res.status >= 400 ? res.status : 502, headers: noStore },
  );
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
