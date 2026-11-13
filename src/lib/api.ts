// Single seam between screens and data. Today it returns mock data; later each function
// becomes a call to the Back Office API (see the API scope document, /api/v1/...).

import { organizations, requests, session, trend, DATA_AS_OF } from "./mock-data";
import type { BackOfficeRequest, Organization, RequestStatus } from "./types";

export const getSession = () => session; // GET /auth/me
export const getDataAsOf = () => DATA_AS_OF;

export const listOrganizations = (): Organization[] => organizations; // GET /organizations
export const getOrganization = (id: string) => organizations.find((o) => o.id === id); // GET /organizations/{id}

export const listRequests = (): BackOfficeRequest[] => requests; // GET /requests
export const getRequest = (ref: string) => requests.find((r) => r.ref === ref); // GET /requests/{ref}

export const getTrend = () => trend; // GET /dashboards/trends

/** GET /dashboards/summary — counts requests, never individual processing items (BRD DRA006). */
export function getSummary() {
  const count = (...s: RequestStatus[]) => requests.filter((r) => s.includes(r.status)).length;
  return {
    pending: count("PENDING_APPROVAL"),
    returned: count("RETURNED"),
    rejected: count("REJECTED"),
    completed: count("COMPLETED"),
    failed: count("FAILED", "PARTIALLY_COMPLETED"),
    unresolved: count("UNKNOWN", "PROCESSING"),
    overdue: requests.filter((r) => isOverdue(r)).length,
  };
}

const OPEN: RequestStatus[] = ["PENDING_APPROVAL", "RETURNED", "PROCESSING", "PARTIALLY_COMPLETED", "FAILED", "UNKNOWN"];
export const isOpen = (r: BackOfficeRequest) => OPEN.includes(r.status);

/** Overdue only when a target is configured (BRD TAT003). */
export const isOverdue = (r: BackOfficeRequest) =>
  isOpen(r) && r.targetHours !== undefined && r.ageHours > r.targetHours;

// Remaining modules. Each export in ops-data stands in for one endpoint:
// customers → GET /customers, transactions → GET /transactions, cases → GET /cases,
// campaigns → GET /campaigns, services/alerts → GET /system-status/*, reportCatalogue/reportJobs → GET /reports/*,
// auditLog → GET /audit-logs, staff/directory → GET /staff, roleBundles → GET /roles,
// serviceTargets/notificationRules/evidenceChecklists → GET /config/*, notifications → GET /notifications.
export * from "./ops-data";
