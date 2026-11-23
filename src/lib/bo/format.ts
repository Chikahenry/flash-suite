import type { Tone } from "@/lib/format";

// Formatting for values that come from the back-office API.

const LAGOS = "Africa/Lagos";

/** "PENDING_REVIEW" or "pending review" becomes "Pending Review". Missing values become a dash. */
export function humanise(value?: string | null): string {
  if (!value) return "—";
  return value
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Colour for a status the API reports as free text. Unknown words stay neutral rather than guessing. */
export function statusTone(value?: string | null): Tone {
  const v = (value ?? "").toUpperCase();
  if (!v) return "neutral";
  if (/BLOCK|SUSPEND|LOCK|CLOSE|INACTIVE|DEACTIVAT|FAIL|REJECT|DECLIN|LOST|STOLEN|EXPIRED|DISABLE|RESTRICT|BREACH|OVERDUE/.test(v)) return "danger";
  if (/PENDING|REVIEW|PROCESS|AWAIT|OPEN|NEW|PARTIAL|UNKNOWN|NEARING|AT.?RISK/.test(v)) return "warning";
  if (/ACTIVE|SUCCESS|COMPLETE|VERIFIED|APPROVED|RESOLVED|DELIVERED|ENABLED|MET|ON.?TRACK/.test(v)) return "success";
  return "neutral";
}

export const isBlocked = (status?: string | null) => /BLOCK|SUSPEND|RESTRICT|DISABLE/i.test(status ?? "");

/** 10 Nov 2026, 09:14 in West Africa Time (the Bank's time zone). Safe on the client because data loads after mount. */
export function formatApiDateTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", { timeZone: LAGOS, day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(d).replace(",", "");
}

export function formatApiDate(iso?: string | null): string {
  if (!iso) return "—";
  // Plain dates (date of birth) are read as written: converting them would shift the day.
  const plain = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (plain) return `${Number(plain[3])} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(plain[2]) - 1]} ${plain[1]}`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", { timeZone: LAGOS, day: "numeric", month: "short", year: "numeric" }).format(d);
}

export function formatMoney(amount?: number | null, currency = "NGN"): string {
  if (amount === undefined || amount === null || Number.isNaN(amount)) return "—";
  const symbol = currency === "NGN" ? "₦" : `${currency} `;
  const [whole, frac] = Math.abs(amount).toFixed(2).split(".");
  return `${amount < 0 ? "-" : ""}${symbol}${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${frac}`;
}

export const initialsOf = (name?: string) =>
  (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("") || "··";

export function formatBytes(n?: number): string {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
