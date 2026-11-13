// Filters and measures shared by the dashboard and the request lists, so a count and the list it
// opens are always built with the same rules, filters and data snapshot (BRD 14.4 rule 5, DRA004).

import { isOpen, isOverdue } from "./api";
import { staff } from "./ops-data";
import type { BackOfficeRequest, RequestStatus } from "./types";

export interface RequestFilters {
  from: string;
  to: string;
  branch: string;
  team: string;
  module: string;
  action: string;
  status: string;
  maker: string;
  checker: string;
}

export const EMPTY_FILTERS: RequestFilters = { from: "", to: "", branch: "", team: "", module: "", action: "", status: "", maker: "", checker: "" };
export const FILTER_KEYS = Object.keys(EMPTY_FILTERS) as (keyof RequestFilters)[];

export const parseFilters = (get: (key: string) => string | null): RequestFilters =>
  Object.fromEntries(FILTER_KEYS.map((k) => [k, get(k) ?? ""])) as unknown as RequestFilters;

/** Query string that carries the filters (and any extras) into the next screen, so they survive a round trip. */
export function filtersToQuery(f: RequestFilters, extra: Record<string, string> = {}): string {
  const params = new URLSearchParams();
  for (const k of FILTER_KEYS) if (f[k]) params.set(k, f[k]);
  for (const [k, v] of Object.entries(extra)) if (v) params.set(k, v);
  const q = params.toString();
  return q ? `?${q}` : "";
}

export const activeFilterCount = (f: RequestFilters) => FILTER_KEYS.filter((k) => f[k]).length;

export const teamOf = (name?: string) => staff.find((s) => s.name === name)?.team ?? "";

/** Status groups used by the dashboard tiles. "Failed" includes partial completion; "Unknown" includes processing. */
export const STATUS_GROUPS: Record<string, RequestStatus[]> = {
  FAILED: ["FAILED", "PARTIALLY_COMPLETED"],
  UNKNOWN: ["UNKNOWN", "PROCESSING"],
};
export const matchesStatus = (r: BackOfficeRequest, status: string) => !status || (STATUS_GROUPS[status] ?? [status]).includes(r.status);

export function applyFilters(rows: BackOfficeRequest[], f: RequestFilters): BackOfficeRequest[] {
  return rows.filter((r) => {
    const day = r.submittedAt.slice(0, 10);
    return (
      (!f.from || day >= f.from) &&
      (!f.to || day <= f.to) &&
      (!f.branch || r.branch === f.branch) &&
      (!f.team || teamOf(r.maker) === f.team) &&
      (!f.module || r.module === f.module) &&
      (!f.action || r.action === f.action) &&
      matchesStatus(r, f.status) &&
      (!f.maker || r.maker === f.maker) &&
      (!f.checker || r.checker === f.checker)
    );
  });
}

export interface Measures {
  requests: number;
  items: number;
  pending: number;
  returned: number;
  failed: number;
  unresolved: number;
  completed: number;
  rejected: number;
  overdue: number;
}

/** Counts requests, not processing items: resubmissions and several accounts in one request count once (DRA006). */
export function measure(rows: BackOfficeRequest[]): Measures {
  const n = (...s: RequestStatus[]) => rows.filter((r) => s.includes(r.status)).length;
  return {
    requests: rows.length,
    items: rows.reduce((t, r) => t + r.items.length, 0),
    pending: n("PENDING_APPROVAL"),
    returned: n("RETURNED"),
    failed: n(...STATUS_GROUPS.FAILED),
    unresolved: n(...STATUS_GROUPS.UNKNOWN),
    completed: n("COMPLETED"),
    rejected: n("REJECTED"),
    overdue: rows.filter(isOverdue).length,
  };
}

const hoursBetween = (a: string, b: string) => Math.max(0, (new Date(b).getTime() - new Date(a).getTime()) / 36e5);

/** Average hours from each submitted version to the checker's decision on it (BRD value measure VR003). */
export function approvalWaitHours(rows: BackOfficeRequest[]): number | null {
  const waits: number[] = [];
  for (const r of rows) {
    let submitted: string | null = null;
    for (const e of r.timeline) {
      if (e.action.startsWith("Submitted")) submitted = e.at;
      else if (submitted && /^(Approved|Returned|Rejected)/.test(e.action)) { waits.push(hoursBetween(submitted, e.at)); submitted = null; }
    }
  }
  return waits.length ? waits.reduce((t, w) => t + w, 0) / waits.length : null;
}

export const openRequests = (rows: BackOfficeRequest[]) => rows.filter(isOpen);

/** Definitions published beside the measures: source, calculation, counting unit, statuses and date basis (DRA005). */
export const MEASURE_DEFINITIONS = [
  { name: "Pending approval", calc: "Requests whose current version is waiting for a checker's decision.", statuses: "Pending approval" },
  { name: "Returned to maker", calc: "Requests a checker sent back for correction. A resubmission is a new version of the same request.", statuses: "Returned" },
  { name: "Failed or partial", calc: "Requests the responsible system rejected, or completed for only some items.", statuses: "Failed, Partially completed" },
  { name: "Outcome unknown", calc: "Requests approved and sent, but with no source confirmation yet, including timeouts.", statuses: "Outcome unknown, Processing" },
  { name: "Completed", calc: "Requests the responsible system has confirmed. Approval alone never counts as completed.", statuses: "Completed" },
  { name: "Rejected", calc: "Requests a checker rejected. They are not executed.", statuses: "Rejected" },
  { name: "Overdue", calc: "Open requests older than their configured service target. Requests with no target are never labelled overdue.", statuses: "All open statuses" },
  { name: "Average approval wait", calc: "Hours from each submitted version to the checker's decision on it, averaged.", statuses: "Approved, Returned, Rejected decisions" },
] as const;
export const MEASURE_META = { source: "Back Office request records", unit: "Requests (processing items are shown separately)", dateBasis: "Date the request was first submitted" };

export type Scope = "mine" | "team" | "all";

/**
 * Which requests a staff member's view covers (BRD DRA003): makers see what they submitted, checkers see
 * what is assigned to their authority, team views follow the team, and Bank-wide needs explicit permission.
 */
export function inScope(r: BackOfficeRequest, scope: Scope, me: { name: string; team: string }): boolean {
  if (scope === "all") return true;
  if (scope === "team") return teamOf(r.maker) === me.team;
  return r.maker === me.name || r.checker === me.name || (r.status === "PENDING_APPROVAL" && r.maker !== me.name);
}
