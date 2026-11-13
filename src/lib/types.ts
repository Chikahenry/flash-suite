// Domain types shared by screens and the (mock) API layer.
// Names follow the BRD: a "request" is any staff-initiated change under maker-checker.

export type RequestStatus =
  | "PENDING_APPROVAL"
  | "RETURNED"
  | "REJECTED"
  | "APPROVED"
  | "PROCESSING"
  | "COMPLETED"
  | "PARTIALLY_COMPLETED"
  | "FAILED"
  | "UNKNOWN"
  | "CANCELLED";

export type ItemOutcome = "PENDING" | "COMPLETED" | "FAILED" | "UNKNOWN" | "REJECTED";

export type RequestModule = "Corporate" | "SME" | "Staff access" | "Accounts";

export interface Evidence {
  id: string;
  type: string;
  name: string;
  source: "Uploaded" | "Linked from repository";
}

export interface RequestItem {
  id: string;
  label: string;
  detail: string;
  outcome: ItemOutcome;
  sourceRef?: string;
  failureReason?: string;
}

export interface ChangeRow {
  field: string;
  current: string;
  proposed: string;
}

export interface TimelineEvent {
  at: string;
  actor: string;
  action: string;
  note?: string;
}

export interface BackOfficeRequest {
  ref: string;
  action: string;
  module: RequestModule;
  target: string;
  targetId: string;
  status: RequestStatus;
  version: number;
  maker: string;
  checker?: string;
  branch: string;
  submittedAt: string;
  ageHours: number;
  targetHours?: number;
  reason: string;
  instruction: { authorisedBy: string; date: string; channel: string };
  changes: ChangeRow[];
  items: RequestItem[];
  evidence: Evidence[];
  timeline: TimelineEvent[];
}

export type AccessStatus = "Active" | "Pending activation" | "Locked" | "Deactivated";
export type CorporateRole =
  | "Inputter"
  | "Verifier"
  | "Authorizer"
  | "Workflow Administrator"
  | "Super Administrator"
  | "View-Only";

export interface CorporateUser {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  roles: CorporateRole[];
  status: AccessStatus;
  dailyLimit: number;
  accounts: string[];
  lastLogin?: string;
}

export interface LinkedAccount {
  number: string;
  name: string;
  type: string;
  currency: string;
  status: "Active" | "Dormant" | "Restricted";
  linked: boolean;
}

export interface UserGroup {
  id: string;
  name: string;
  kind: "Inputter" | "Verifier" | "Authorizer";
  members: string[];
}

export interface PolicyBand {
  id: string;
  transactionType: string;
  currency: string;
  min: number;
  max: number | null;
  inputterGroup: string;
  verifierGroup?: string;
  verifiersRequired: number;
  authorizerGroup: string;
  authorizersRequired: number;
  routing: "Sequential" | "Parallel";
}

export interface Organization {
  id: string;
  name: string;
  cif: string;
  segment: "Corporate" | "SME";
  status: "Active" | "Pending setup" | "Deactivated";
  branch: string;
  createdAt: string;
  lastUpdated: string;
  users: CorporateUser[];
  accounts: LinkedAccount[];
  groups: UserGroup[];
  policies: PolicyBand[];
  pendingTransactions: number;
}

export interface StaffSession {
  staffId: string;
  name: string;
  role: string;
  team: string;
  branch: string;
  initials: string;
}
