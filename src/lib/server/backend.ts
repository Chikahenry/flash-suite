import "server-only";
import { config } from "./config";

/** The back end wraps every response as { status, data, error, page }. */
export interface FieldError {
  field: string;
  message: string;
}

export interface Envelope<T> {
  status?: string;
  data?: T;
  error?: { code?: string; message?: string; fieldErrors?: FieldError[] } | null;
  page?: { total?: number; page?: number; size?: number; totalPages?: number };
}

export interface ApiError {
  code: string;
  message: string;
  fieldErrors?: FieldError[];
}

export type BackendResult<T> =
  | { ok: true; status: number; body: Envelope<T> }
  | { ok: false; status: number; error: ApiError };

const GENERIC: Record<number, string> = {
  400: "The request was not accepted. Check the details and try again.",
  401: "Sign-in failed. Check your details and try again.",
  403: "You do not have permission to do this.",
  404: "That record could not be found.",
  409: "That conflicts with the current state. Refresh and try again.",
  429: "Too many attempts. Wait a moment and try again.",
};

/** Keeps a back-end message short and free of anything that looks like a stack trace or path. */
export const safeMessage = (message: unknown, status: number): string => {
  if (typeof message === "string") {
    const text = message.trim();
    if (text && text.length <= 200 && !/\bat\s+[\w.$]+\(|exception|\/[\w.-]+\/[\w.-]+/i.test(text)) return text;
  }
  return GENERIC[status] ?? (status >= 500 ? "The service could not complete the request. Try again shortly." : "The request failed.");
};

export interface BackendRequest {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  accessToken?: string;
  headers?: Record<string, string>;
  /** Service address to call. Defaults to the back-office service; sign-in calls use the authentication service. */
  base?: string;
}

/**
 * One place that talks to the back end. Adds the bearer token, a correlation ID for support,
 * a timeout, and turns every failure (network, HTTP error, error body) into one shape.
 * Request and response bodies are never logged: they can hold passwords and codes.
 */
export async function backendFetch<T>(path: string, { method = "GET", body, accessToken, headers, base }: BackendRequest = {}): Promise<BackendResult<T>> {
  let res: Response;
  try {
    res = await fetch(`${base ?? config.baseUrl}${path}`, {
      method,
      cache: "no-store",
      signal: AbortSignal.timeout(config.timeoutMs),
      headers: {
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        "X-Correlation-Id": crypto.randomUUID(),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (e) {
    const timedOut = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    return {
      ok: false,
      status: 503,
      error: { code: timedOut ? "BACKEND_TIMEOUT" : "BACKEND_UNREACHABLE", message: "The Bank service could not be reached. Try again shortly." },
    };
  }

  const text = await res.text();
  let parsed: Envelope<T> | undefined;
  try {
    parsed = text ? (JSON.parse(text) as Envelope<T>) : undefined;
  } catch {
    parsed = undefined;
  }

  const errored = !!(parsed?.error && (parsed.error.code || parsed.error.message));
  if (res.ok && !errored) return { ok: true, status: res.status, body: parsed ?? {} };

  return {
    ok: false,
    status: res.status,
    error: {
      code: parsed?.error?.code ?? `HTTP_${res.status}`,
      message: safeMessage(parsed?.error?.message, res.status),
      fieldErrors: cleanFieldErrors(parsed?.error?.fieldErrors),
    },
  };
}

/** Keeps per-field validation messages so a form can show them next to the right input. */
function cleanFieldErrors(list: unknown): FieldError[] | undefined {
  if (!Array.isArray(list)) return undefined;
  const cleaned = list
    .filter((x): x is FieldError => !!x && typeof (x as FieldError).field === "string" && typeof (x as FieldError).message === "string")
    .slice(0, 20)
    .map((x) => ({ field: x.field.slice(0, 80), message: safeMessage(x.message, 400) }));
  return cleaned.length ? cleaned : undefined;
}

export interface RawRequest extends BackendRequest {
  /** Raw request body text, forwarded as is (already validated by the caller). */
  rawBody?: string;
}

/**
 * Same as backendFetch but hands back the raw response, for files (KYC documents, CSV export)
 * and for pass-through of JSON. Adds the same token, correlation ID and timeout.
 */
export async function backendRaw(path: string, { method = "GET", rawBody, accessToken, headers }: RawRequest = {}): Promise<Response | null> {
  try {
    return await fetch(`${config.baseUrl}${path}`, {
      method,
      cache: "no-store",
      signal: AbortSignal.timeout(config.timeoutMs),
      headers: {
        Accept: "application/json, */*",
        ...(rawBody === undefined ? {} : { "Content-Type": "application/json" }),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        "X-Correlation-Id": crypto.randomUUID(),
        ...headers,
      },
      body: rawBody,
    });
  } catch {
    return null;
  }
}
