import { proxyUrl } from "./client";

/**
 * Downloads a file through the proxy (CSV export, KYC document) and saves it from the browser.
 * Fetching first, instead of just navigating, lets the screen show a message when the Bank refuses.
 * Returns an error message, or null on success.
 */
export async function downloadFile(path: string, query: Record<string, string | undefined> = {}, fallbackName = "download"): Promise<string | null> {
  try {
    const res = await fetch(proxyUrl(path, query));
    if (res.status === 401) {
      window.location.assign(new URL("/login?reason=expired", window.location.origin));
      return "Your session has ended.";
    }
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      return body?.error?.message ?? "The file could not be downloaded.";
    }
    const disposition = res.headers.get("content-disposition") ?? "";
    const named = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition)?.[1];
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = named ? decodeURIComponent(named) : fallbackName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return null;
  } catch {
    return "Could not reach the server. Check your connection and try again.";
  }
}
