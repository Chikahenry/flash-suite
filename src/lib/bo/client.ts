import { signOut } from "./session-client";

// Browser-side access to the staff API. Every call goes through our own /api/bo proxy, which adds the
// staff token on the server. Nothing here ever sees a token.

export interface PageMeta {
  total?: number;
  page?: number;
  size?: number;
  totalPages?: number;
}

export interface FieldError {
  field: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fieldErrors: FieldError[] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ApiResult<T> {
  data: T;
  page?: PageMeta;
}

type Query = Record<string, string | number | boolean | undefined | null>;

export const queryString = (query: Query = {}) => {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  const text = qs.toString();
  return text ? `?${text}` : "";
};

/** Address of a proxied path, for links and downloads the browser opens directly (CSV export, KYC documents). */
export const proxyUrl = (path: string, query?: Query) => `/api/bo${path}${queryString(query)}`;

export async function api<T>(
  path: string,
  init: { method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"; query?: Query; body?: unknown; headers?: Record<string, string> } = {},
): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(proxyUrl(path, init.query), {
      method: init.method ?? "GET",
      headers: { ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}), ...init.headers },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new ApiError(0, "NETWORK", "Could not reach the server. Check your connection and try again.");
  }

  const json = (await res.json().catch(() => null)) as {
    data?: T;
    page?: PageMeta;
    error?: { code?: string; message?: string; fieldErrors?: FieldError[] };
  } | null;

  if (res.status === 401) {
    void signOut("expired");
    throw new ApiError(401, "UNAUTHENTICATED", "Your session has ended. Log in again.");
  }
  if (!res.ok || json?.error) {
    throw new ApiError(res.status, json?.error?.code ?? `HTTP_${res.status}`, json?.error?.message ?? "The request failed. Try again.", json?.error?.fieldErrors ?? []);
  }
  return { data: json?.data as T, page: json?.page };
}
