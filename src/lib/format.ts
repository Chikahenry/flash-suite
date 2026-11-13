import type { AccessStatus, ItemOutcome, Organization, RequestStatus } from "./types";

export type Tone = "neutral" | "info" | "success" | "warning" | "danger";

export const requestStatusLabel: Record<RequestStatus, string> = {
  PENDING_APPROVAL: "Pending approval",
  RETURNED: "Returned",
  REJECTED: "Rejected",
  APPROVED: "Approved",
  PROCESSING: "Processing",
  COMPLETED: "Completed",
  PARTIALLY_COMPLETED: "Partially completed",
  FAILED: "Failed",
  UNKNOWN: "Outcome unknown",
  CANCELLED: "Cancelled",
};

export const requestStatusTone: Record<RequestStatus, Tone> = {
  PENDING_APPROVAL: "warning",
  RETURNED: "info",
  REJECTED: "danger",
  APPROVED: "info",
  PROCESSING: "info",
  COMPLETED: "success",
  PARTIALLY_COMPLETED: "warning",
  FAILED: "danger",
  UNKNOWN: "warning",
  CANCELLED: "neutral",
};

export const outcomeTone: Record<ItemOutcome, Tone> = {
  PENDING: "neutral",
  COMPLETED: "success",
  FAILED: "danger",
  UNKNOWN: "warning",
  REJECTED: "danger",
};

export const outcomeLabel: Record<ItemOutcome, string> = {
  PENDING: "Not processed",
  COMPLETED: "Completed",
  FAILED: "Failed",
  UNKNOWN: "Unknown",
  REJECTED: "Rejected",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Deterministic date formatting (no locale lookups, so server and client render the same text). */
export function formatDateTime(iso: string): string {
  const [date, time = ""] = iso.split("T");
  const [y, m, d] = date.split("-").map(Number);
  const base = `${d} ${MONTHS[m - 1]} ${y}`;
  return time ? `${base}, ${time.slice(0, 5)}` : base;
}

/** "Aug 6, 2019" style used in the Figma tables. */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("T")[0].split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

export function formatNaira(amount: number): string {
  const [whole, frac] = amount.toFixed(2).split(".");
  return `₦${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${frac}`;
}

export function formatAge(hours: number): string {
  if (hours < 24) return `${hours}h`;
  const d = Math.floor(hours / 24);
  const h = hours % 24;
  return h ? `${d}d ${h}h` : `${d}d`;
}

/** Account numbers are masked by default (BRD CM-015). */
export const maskAccount = (n: string) => `${n.slice(0, 3)}****${n.slice(-3)}`;

export const orgStatusTone: Record<Organization["status"], Tone> = {
  Active: "success",
  "Pending setup": "warning",
  Deactivated: "neutral",
};

export const accessStatusTone: Record<AccessStatus, Tone> = {
  Active: "success",
  "Pending activation": "warning",
  Locked: "danger",
  Deactivated: "neutral",
};
