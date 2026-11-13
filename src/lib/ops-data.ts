// Mock data and types for the modules beyond Corporate/SME. Read through src/lib/api.ts.
// Each list maps to one Back Office endpoint, named beside its getter in api.ts.

import type { AccessStatus } from "./types";

// ---------- Retail customers, Instant Banking, devices, cards ----------
export interface Device {
  id: string;
  maskedId: string;
  type: string;
  channel: string;
  registered: string;
  lastActive: string;
  status: "Registered" | "Deregistered";
  risk: "Normal" | "Flagged";
}

export interface Card {
  id: string;
  maskedPan: string;
  scheme: "Mastercard" | "Visa" | "Verve";
  account: string;
  expiry: string;
  status: "Active" | "Permanently blocked" | "Expired";
}

export interface CustomerDoc {
  id: string;
  type: string;
  name: string;
  status: "Verified" | "Pending review" | "Expired";
}

export interface RetailCustomer {
  cif: string;
  firstName: string;
  lastName: string;
  accountNo: string;
  phone: string;
  email: string;
  dob: string;
  gender: string;
  marital: string;
  nationality: string;
  stateOfOrigin: string;
  lga: string;
  channelType: string;
  bvn: string;
  nin: string;
  staff: boolean;
  kyc: "Verified" | "Pending" | "Review";
  compliance: "Clear" | "Under review";
  crmUpdated: string;
  syncStatus: "In sync" | "Sync failed";
  accounts: { number: string; type: string; tier: string; currency: string; linked: boolean; status: "Active" | "Dormant"; balance: number }[];
  profile: { username: string; channel: string; status: AccessStatus | "Not enrolled"; lastLogin?: string };
  inb: { enrolled: boolean; phone: string; status: "Active" | "Locked" | "Disabled"; blacklisted: boolean; updated: string };
  devices: Device[];
  cards: Card[];
  documents: CustomerDoc[];
  activity: { at: string; text: string }[];
}

const dev = (id: string, type: string, channel: string, lastActive: string, status: Device["status"] = "Registered", risk: Device["risk"] = "Normal"): Device => ({
  id, maskedId: `••••-${id.slice(-4)}`, type, channel, registered: "2026-02-18T10:12:00", lastActive, status, risk,
});

export const customers: RetailCustomer[] = [
  {
    cif: "R002284417", firstName: "Maduakolam", lastName: "Justice", accountNo: "0124886099", phone: "0813 563 6533", email: "justice.m@example.com",
    dob: "1990-12-22", gender: "Male", marital: "Single", nationality: "Nigerian", stateOfOrigin: "Abia State", lga: "Umuahia South", channelType: "Savings", bvn: "•••••••••533", nin: "•••••••••533", staff: false, kyc: "Verified", compliance: "Clear",
    crmUpdated: "2026-11-10T09:14:00", syncStatus: "In sync",
    accounts: [
      { number: "0124886099", type: "Savings", tier: "Tier 1", currency: "NGN", linked: true, status: "Active", balance: 15500.75 },
      { number: "6424577048", type: "Savings", tier: "Tier 2", currency: "NGN", linked: true, status: "Active", balance: 8300.5 },
      { number: "7251628192", type: "Current", tier: "Tier 3", currency: "NGN", linked: false, status: "Active", balance: 12750 },
      { number: "1203928172", type: "Savings", tier: "Tier 3", currency: "NGN", linked: false, status: "Dormant", balance: 9999.99 },
    ],
    profile: { username: "justice.m", channel: "Retail Mobile and Web", status: "Active", lastLogin: "2026-11-11T08:05:00" },
    inb: { enrolled: true, phone: "0813 563 6533", status: "Active", blacklisted: false, updated: "2026-11-11T08:00:00" },
    devices: [dev("DV-88120441", "iPhone 15", "Retail Mobile", "2026-11-11T08:05:00"), dev("DV-88120797", "Samsung A54", "Retail Mobile", "2026-09-02T19:40:00", "Registered", "Flagged")],
    cards: [
      { id: "CD-1022", maskedPan: "5399 83•• •••• 1022", scheme: "Mastercard", account: "0124886099", expiry: "09/30", status: "Active" },
      { id: "CD-2032", maskedPan: "4187 45•• •••• 2032", scheme: "Visa", account: "6424577048", expiry: "08/32", status: "Permanently blocked" },
      { id: "CD-0392", maskedPan: "4187 45•• •••• 0392", scheme: "Visa", account: "7251628192", expiry: "06/31", status: "Active" },
    ],
    documents: [
      { id: "D-1", type: "National ID", name: "NIN-slip.pdf", status: "Verified" },
      { id: "D-2", type: "Utility bill", name: "IKEDC-bill-Aug.pdf", status: "Verified" },
      { id: "D-3", type: "Signature mandate", name: "Mandate-card.pdf", status: "Pending review" },
    ],
    activity: [
      { at: "2026-11-11T08:05:00", text: "Signed in on mobile app" },
      { at: "2026-11-10T14:30:00", text: "Updated NIN document" },
      { at: "2026-11-10T09:14:00", text: "Phone number changed in CRM and synchronised" },
    ],
  },
  {
    cif: "R002291083", firstName: "Samantha", lastName: "Green", accountNo: "0293029383", phone: "0813 563 6534", email: "s.green@example.com",
    dob: "1986-04-03", gender: "Female", marital: "Single", nationality: "Nigerian", stateOfOrigin: "Abia State", lga: "Umuahia South", channelType: "Savings", bvn: "•••••••••118", nin: "•••••••••902", staff: true, kyc: "Review", compliance: "Under review",
    crmUpdated: "2026-11-08T16:02:00", syncStatus: "Sync failed",
    accounts: [{ number: "0293029383", type: "Current", tier: "Tier 3", currency: "NGN", linked: true, status: "Active", balance: 482000 }],
    profile: { username: "sgreen86", channel: "Retail Mobile and Web", status: "Locked", lastLogin: "2026-11-07T21:15:00" },
    inb: { enrolled: true, phone: "0813 563 6534", status: "Locked", blacklisted: false, updated: "2026-11-09T11:20:00" },
    devices: [dev("DV-77120031", "Pixel 8", "Retail Mobile", "2026-11-07T21:15:00")],
    cards: [{ id: "CD-1211", maskedPan: "5061 04•• •••• 1211", scheme: "Verve", account: "0293029383", expiry: "08/31", status: "Active" }],
    documents: [{ id: "D-1", type: "International passport", name: "Passport.pdf", status: "Expired" }],
    activity: [{ at: "2026-11-07T21:15:00", text: "Profile locked after failed sign-in attempts" }],
  },
  {
    cif: "R002300551", firstName: "Emily", lastName: "Wang", accountNo: "0293029385", phone: "0813 563 6536", email: "emily.wang@example.com",
    dob: "1995-07-19", gender: "Female", marital: "Single", nationality: "Nigerian", stateOfOrigin: "Abia State", lga: "Umuahia South", channelType: "Savings", bvn: "•••••••••740", nin: "•••••••••221", staff: false, kyc: "Verified", compliance: "Clear",
    crmUpdated: "2026-10-28T10:00:00", syncStatus: "In sync",
    accounts: [{ number: "0293029385", type: "Savings", tier: "Tier 2", currency: "NGN", linked: false, status: "Active", balance: 64250.1 }],
    profile: { username: "", channel: "Retail Mobile and Web", status: "Not enrolled" },
    inb: { enrolled: true, phone: "0813 563 6536", status: "Disabled", blacklisted: true, updated: "2026-11-05T13:45:00" },
    devices: [], cards: [], documents: [{ id: "D-1", type: "National ID", name: "NIN-slip.pdf", status: "Verified" }], activity: [],
  },
  {
    cif: "R002318870", firstName: "Isabella", lastName: "Martinez", accountNo: "0365987123", phone: "0612 345 7890", email: "isabella.m@example.com",
    dob: "1979-01-30", gender: "Female", marital: "Single", nationality: "Nigerian", stateOfOrigin: "Abia State", lga: "Umuahia South", channelType: "Savings", bvn: "•••••••••605", nin: "•••••••••377", staff: false, kyc: "Pending", compliance: "Clear",
    crmUpdated: "2026-09-12T12:30:00", syncStatus: "In sync",
    accounts: [{ number: "0365987123", type: "Savings", tier: "Tier 1", currency: "NGN", linked: true, status: "Dormant", balance: 1200 }],
    profile: { username: "bella.martinez", channel: "Retail Mobile and Web", status: "Pending activation" },
    inb: { enrolled: false, phone: "0612 345 7890", status: "Active", blacklisted: false, updated: "2026-09-12T12:30:00" },
    devices: [], cards: [], documents: [], activity: [],
  },
];

// ---------- Transactions ----------
export type TxnStatus = "Completed" | "Pending" | "Failed" | "Unknown" | "Partially successful";

export interface BatchItem { ref: string; beneficiary: string; amount: number; status: TxnStatus; failureReason?: string }

export interface Transaction {
  ref: string;
  date: string;
  cif: string;
  customer: string;
  account: string;
  amount: number;
  currency: string;
  channel: string;
  type: string;
  status: TxnStatus;
  bank: string;
  beneficiary: string;
  sessionId: string;
  coreRef: string;
  providerRef?: string;
  responseCode: string;
  failureReason?: string;
  debit: "Confirmed" | "Not debited" | "Unknown";
  credit: "Confirmed" | "Not confirmed" | "Unknown";
  reversal: "None" | "Reversed" | "Reversal pending";
  lastUpdated: string;
  conflict?: { source: string; status: string; at: string }[];
  batch?: BatchItem[];
  caseRefs: string[];
}

export const transactions: Transaction[] = [
  { ref: "FT26315089273441", date: "2026-11-11T10:42:00", cif: "R002284417", customer: "Maduakolam Justice", account: "0124886099", amount: 86300.5, currency: "NGN", channel: "Retail Mobile", type: "Transfer", status: "Pending", bank: "Union Bank", beneficiary: "Ekeledirichukwu Justice", sessionId: "000013261111104200089273", coreRef: "FIN-7781204", providerRef: "NIP-55102", responseCode: "09", debit: "Confirmed", credit: "Not confirmed", reversal: "None", lastUpdated: "2026-11-11T10:44:00", caseRefs: [] },
  { ref: "FT26315089274002", date: "2026-11-11T09:15:00", cif: "R002284417", customer: "Maduakolam Justice", account: "0124886099", amount: 15000, currency: "NGN", channel: "Retail Mobile", type: "Transfer", status: "Completed", bank: "First Bank", beneficiary: "Chukwuemeka Obi", sessionId: "000013261111091500089274", coreRef: "FIN-7780932", providerRef: "NIP-55088", responseCode: "00", debit: "Confirmed", credit: "Confirmed", reversal: "None", lastUpdated: "2026-11-11T09:15:00", caseRefs: [] },
  { ref: "AT26314089275110", date: "2026-11-10T18:20:00", cif: "R002291083", customer: "Samantha Green", account: "0293029383", amount: 5790.75, currency: "NGN", channel: "Instant Banking/USSD", type: "Airtime", status: "Failed", bank: "Fidelity Bank", beneficiary: "0813 563 6534 (MTN)", sessionId: "000013261110182000089275", coreRef: "FIN-7779001", responseCode: "91", failureReason: "Provider did not respond.", debit: "Confirmed", credit: "Not confirmed", reversal: "Reversal pending", lastUpdated: "2026-11-10T18:26:00", caseRefs: ["CAS-10281-M9Q7"] },
  { ref: "BL26313089276220", date: "2026-11-09T12:05:00", cif: "R002300551", customer: "Emily Wang", account: "0293029385", amount: 12300, currency: "NGN", channel: "Retail Web", type: "Bills", status: "Failed", bank: "Fidelity Bank", beneficiary: "IKEDC Prepaid 4501 ••• 221", sessionId: "000013261109120500089276", coreRef: "FIN-7770418", providerRef: "QT-908812", responseCode: "51", debit: "Not debited", credit: "Not confirmed", reversal: "None", lastUpdated: "2026-11-09T12:05:00", caseRefs: [] },
  { ref: "FT26312089277330", date: "2026-11-08T15:48:00", cif: "R002284417", customer: "Maduakolam Justice", account: "6424577048", amount: 250000, currency: "NGN", channel: "Retail Mobile", type: "Transfer", status: "Unknown", bank: "GTBank", beneficiary: "Amaka Eze", sessionId: "000013261108154800089277", coreRef: "FIN-7765500", providerRef: "NIP-54310", responseCode: "—", debit: "Confirmed", credit: "Unknown", reversal: "None", lastUpdated: "2026-11-08T15:50:00", conflict: [{ source: "Core banking", status: "Debit posted", at: "2026-11-08T15:48:00" }, { source: "NIP switch", status: "No record", at: "2026-11-08T15:50:00" }], caseRefs: ["CAS-10293-R4T8"] },
  {
    ref: "BK26311089278440", date: "2026-11-07T11:00:00", cif: "ORG-000184", customer: "Zenith Agro Allied Ltd", account: "5600184438", amount: 4350000, currency: "NGN", channel: "Corporate Web", type: "Bulk payment", status: "Partially successful", bank: "Multiple", beneficiary: "4 beneficiaries", sessionId: "—", coreRef: "FIN-7760012", responseCode: "—", debit: "Confirmed", credit: "Unknown", reversal: "None", lastUpdated: "2026-11-07T11:12:00", caseRefs: [],
    batch: [
      { ref: "BK26311089278440-01", beneficiary: "Adaobi Nwosu · Access Bank", amount: 1200000, status: "Completed" },
      { ref: "BK26311089278440-02", beneficiary: "Michael Ibe · Zenith Bank", amount: 950000, status: "Completed" },
      { ref: "BK26311089278440-03", beneficiary: "Olivia Akpan · UBA", amount: 1100000, status: "Failed", failureReason: "Invalid beneficiary account." },
      { ref: "BK26311089278440-04", beneficiary: "John Doe · FCMB", amount: 1100000, status: "Unknown" },
    ],
  },
  { ref: "DT26310089279550", date: "2026-11-06T08:31:00", cif: "R002318870", customer: "Isabella Martinez", account: "0365987123", amount: 1200, currency: "NGN", channel: "Instant Banking/USSD", type: "Data", status: "Failed", bank: "Fidelity Bank", beneficiary: "0612 345 7890 (Airtel)", sessionId: "000013261106083100089279", coreRef: "FIN-7755107", responseCode: "96", debit: "Not debited", credit: "Not confirmed", reversal: "None", lastUpdated: "2026-11-06T08:31:00", caseRefs: [] },
  { ref: "CL26309089280660", date: "2026-11-05T13:10:00", cif: "ORG-000207", customer: "Lekki Fresh Foods", account: "4410027715", amount: 78450, currency: "NGN", channel: "SME Digital Banking", type: "Collections", status: "Completed", bank: "Fidelity Bank", beneficiary: "LIRS PAYE", sessionId: "000013261105131000089280", coreRef: "FIN-7750883", providerRef: "RMT-221094", responseCode: "00", debit: "Confirmed", credit: "Confirmed", reversal: "None", lastUpdated: "2026-11-05T13:10:00", caseRefs: [] },
];

// ---------- CRM cases (read-only) ----------
export interface CrmCase {
  ref: string;
  tracking: string;
  category: string;
  subcategory: string;
  description: string;
  status: "New" | "In Progress" | "Escalated" | "Resolved" | "Cancelled";
  team: string;
  customer: string;
  cif: string;
  account: string;
  amount?: number;
  created: string;
  updated: string;
  slaFirst: "Met" | "Pending" | "Breached";
  slaResolution: "On track" | "Nearing breach" | "Breached" | "Met";
  txnRef?: string;
  evidence: { name: string; available: boolean }[];
  progress: { at: string; text: string }[];
  resolution?: string;
  refreshFailed?: boolean;
}

export const cases: CrmCase[] = [
  { ref: "CAS-10293-R4T8", tracking: "CMP-2026-004830", category: "Funds Transfer", subcategory: "Beneficiary not credited", description: "Customer was debited ₦250,000 for a transfer to GTBank. Beneficiary has not received value.", status: "New", team: "E-Banking Operations", customer: "Maduakolam Justice", cif: "R002284417", account: "••••7048", amount: 250000, created: "2026-11-09T09:02:00", updated: "2026-11-09T09:02:00", slaFirst: "Pending", slaResolution: "On track", txnRef: "FT26312089277330", evidence: [{ name: "Debit-alert.png", available: true }], progress: [{ at: "2026-11-09T09:02:00", text: "Case logged in CRM by Trueserve." }] },
  { ref: "CAS-10281-M9Q7", tracking: "CMP-2026-004817", category: "Airtime", subcategory: "Debited, not delivered", description: "Airtime purchase of ₦5,790.75 failed after debit. Customer is requesting a reversal.", status: "Escalated", team: "E-Banking Operations", customer: "Samantha Green", cif: "R002291083", account: "••••9383", amount: 5790.75, created: "2026-11-10T18:40:00", updated: "2026-11-11T09:14:00", slaFirst: "Met", slaResolution: "Nearing breach", txnRef: "AT26314089275110", evidence: [{ name: "USSD-session-log.txt", available: true }, { name: "Provider-response.pdf", available: false }], progress: [{ at: "2026-11-10T18:40:00", text: "Case logged in CRM." }, { at: "2026-11-11T09:14:00", text: "Escalated to E-Banking Operations for reversal." }] },
  { ref: "CAS-10268-K2P1", tracking: "CMP-2026-004802", category: "ATM Dispute", subcategory: "Cash not dispensed", description: "ATM withdrawal of ₦49,000 debited without cash dispensed at Lekki Phase 1.", status: "In Progress", team: "Card Operations", customer: "Emily Wang", cif: "R002300551", account: "••••9385", amount: 49000, created: "2026-11-08T10:42:00", updated: "2026-11-10T11:02:00", slaFirst: "Met", slaResolution: "On track", evidence: [], progress: [{ at: "2026-11-08T10:42:00", text: "Case logged in CRM." }, { at: "2026-11-10T11:02:00", text: "Journal requested from acquirer." }], refreshFailed: true },
  { ref: "CAS-10240-S7E5", tracking: "CMP-2026-004761", category: "Internet Banking", subcategory: "Unable to sign in", description: "Customer could not sign in after device change.", status: "Resolved", team: "Channels Support", customer: "Isabella Martinez", cif: "R002318870", account: "••••7123", created: "2026-10-28T14:00:00", updated: "2026-10-29T10:15:00", slaFirst: "Met", slaResolution: "Met", evidence: [], progress: [{ at: "2026-10-28T14:00:00", text: "Case logged in CRM." }, { at: "2026-10-29T10:15:00", text: "Device deregistered; customer re-registered." }], resolution: "Old device deregistered. Customer signed in on the new device." },
];

// ---------- Campaigns ----------
export interface Campaign {
  id: string;
  title: string;
  sourceRef: string;
  body: string;
  link?: string;
  channels: string[];
  start: string;
  end: string;
  status: "Pending approval" | "Scheduled" | "Live" | "Expired" | "Withdrawn" | "Returned";
  version: number;
  maker: string;
  checker?: string;
  outcomes: { channel: string; status: "Published" | "Scheduled" | "Failed" | "Removed" | "Not sent" }[];
  versions: { version: number; at: string; by: string; note: string }[];
}

export const campaigns: Campaign[] = [
  { id: "CMP-0091", title: "December savings challenge", sourceRef: "BRAND-2026-311", body: "Save ₦5,000 weekly in December and win. Terms apply.", link: "https://www.example.com/savings-challenge", channels: ["Retail Mobile", "Retail Web", "Instant Banking/USSD"], start: "2026-12-01T00:00:00", end: "2026-12-31T23:59:00", status: "Pending approval", version: 2, maker: "Chidinma Okoro", outcomes: [{ channel: "Retail Mobile", status: "Not sent" }, { channel: "Retail Web", status: "Not sent" }, { channel: "Instant Banking/USSD", status: "Not sent" }], versions: [{ version: 1, at: "2026-11-09T10:00:00", by: "Chidinma Okoro", note: "Submitted" }, { version: 1, at: "2026-11-09T15:10:00", by: "Emeka Ude", note: "Returned: end date falls after the Brand-approved period." }, { version: 2, at: "2026-11-10T09:30:00", by: "Chidinma Okoro", note: "Resubmitted with corrected end date" }] },
  { id: "CMP-0088", title: "Corporate token migration notice", sourceRef: "BRAND-2026-298", body: "Soft token is replacing hard token for Corporate Web users from 15 November.", channels: ["Corporate Web", "SME Digital Banking"], start: "2026-11-01T08:00:00", end: "2026-11-30T23:59:00", status: "Live", version: 1, maker: "Chidinma Okoro", checker: "Emeka Ude", outcomes: [{ channel: "Corporate Web", status: "Published" }, { channel: "SME Digital Banking", status: "Failed" }], versions: [{ version: 1, at: "2026-10-30T11:00:00", by: "Chidinma Okoro", note: "Submitted" }, { version: 1, at: "2026-10-30T14:20:00", by: "Emeka Ude", note: "Approved" }] },
  { id: "CMP-0080", title: "Independence Day cashback", sourceRef: "BRAND-2026-240", body: "Get 5% cashback on bill payments on 1 October.", channels: ["Retail Mobile"], start: "2026-09-28T00:00:00", end: "2026-10-02T23:59:00", status: "Expired", version: 1, maker: "Emeka Ude", checker: "Chidinma Okoro", outcomes: [{ channel: "Retail Mobile", status: "Removed" }], versions: [{ version: 1, at: "2026-09-25T09:00:00", by: "Emeka Ude", note: "Submitted" }, { version: 1, at: "2026-09-25T12:00:00", by: "Chidinma Okoro", note: "Approved" }] },
];

export const CHANNELS = ["Retail Mobile", "Retail Web", "SME Digital Banking", "Corporate Web", "Instant Banking/USSD"];

// ---------- System and integration status ----------
export type ServiceState = "Available" | "Degraded" | "Unavailable" | "Unknown";

export interface ServiceStatus {
  id: string;
  name: string;
  kind: "Service" | "Integration";
  state: ServiceState;
  description: string;
  lastSuccess: string;
  team: string;
  channels: string[];
  impact: "Confirmed outage" | "Dependency warning" | "Unconfirmed" | "None";
  refresh: "Current" | "Stale" | "Retrieval failed";
  incident?: string;
  guidance?: string;
}

export const services: ServiceStatus[] = [
  { id: "S-1", name: "Retail Online Banking platform", kind: "Service", state: "Available", description: "Operating normally.", lastSuccess: "2026-11-11T12:19:00", team: "Channels Support", channels: ["Retail Mobile", "Retail Web"], impact: "None", refresh: "Current" },
  { id: "S-2", name: "Corporate/SME platform", kind: "Service", state: "Degraded", description: "Slow responses on workflow updates.", lastSuccess: "2026-11-11T12:19:00", team: "Channels Support", channels: ["Corporate Web", "SME Digital Banking"], impact: "Dependency warning", refresh: "Current", incident: "INC-2026-11873", guidance: "Submit requests as normal. Outcomes may take longer; check the source outcome before any retry." },
  { id: "S-3", name: "Instant Banking/USSD gateway", kind: "Service", state: "Available", description: "Operating normally.", lastSuccess: "2026-11-11T12:19:00", team: "Channels Support", channels: ["Instant Banking/USSD"], impact: "None", refresh: "Current" },
  { id: "S-4", name: "NIP switch (NIBSS)", kind: "Integration", state: "Unavailable", description: "Outbound transfers are timing out.", lastSuccess: "2026-11-11T11:58:00", team: "E-Banking Operations", channels: ["Retail Mobile", "Retail Web", "Corporate Web", "SME Digital Banking", "Instant Banking/USSD"], impact: "Confirmed outage", refresh: "Current", incident: "INC-2026-11880", guidance: "Advise customers that interbank transfers are delayed. Do not ask them to retry debited transfers." },
  { id: "S-5", name: "CRM", kind: "Integration", state: "Available", description: "Last reading before the monitoring feed stopped.", lastSuccess: "2026-11-11T12:05:00", team: "CRM/Trueserve Owners", channels: [], impact: "Unconfirmed", refresh: "Stale" },
  { id: "S-6", name: "Card-management system", kind: "Integration", state: "Unknown", description: "Source returned a status this application does not recognise.", lastSuccess: "2026-11-11T12:19:00", team: "Card Operations", channels: [], impact: "Unconfirmed", refresh: "Current" },
  { id: "S-7", name: "Finacle (core banking)", kind: "Integration", state: "Available", description: "Operating normally.", lastSuccess: "2026-11-11T12:19:00", team: "Platforms Management", channels: [], impact: "None", refresh: "Current" },
  { id: "S-8", name: "Notification service", kind: "Integration", state: "Available", description: "Could not be reached for a status reading.", lastSuccess: "2026-11-11T11:40:00", team: "IT Service Monitoring", channels: [], impact: "Unconfirmed", refresh: "Retrieval failed" },
];

export interface ServiceAlert { id: string; service: string; severity: "Critical" | "Major" | "Minor"; start: string; update: string; state: "Active" | "Resolved"; summary: string; incident?: string }

export const alerts: ServiceAlert[] = [
  { id: "AL-5521", service: "NIP switch (NIBSS)", severity: "Critical", start: "2026-11-11T11:58:00", update: "2026-11-11T12:15:00", state: "Active", summary: "Outbound NIP transfers timing out.", incident: "INC-2026-11880" },
  { id: "AL-5519", service: "Corporate/SME platform", severity: "Major", start: "2026-11-11T10:30:00", update: "2026-11-11T12:02:00", state: "Active", summary: "Workflow update latency above threshold.", incident: "INC-2026-11873" },
  { id: "AL-5498", service: "Instant Banking/USSD gateway", severity: "Minor", start: "2026-11-10T02:10:00", update: "2026-11-10T03:05:00", state: "Resolved", summary: "Session drops on one aggregator route." },
];

// ---------- Reports ----------
export interface ReportDef { id: string; name: string; area: string; description: string; source: string }

export const reportCatalogue: ReportDef[] = [
  { id: "R-01", name: "Staff access review", area: "Staff access", description: "Staff profiles, branch, roles, maker/checker designation and access status.", source: "Back Office" },
  { id: "R-02", name: "Requests by module and status", area: "Request processing", description: "Requests by module, action, status, branch, team and processing outcome.", source: "Back Office" },
  { id: "R-03", name: "Approval decisions", area: "Approvals", description: "Pending, approved, rejected and returned requests with checkers and decision times.", source: "Back Office" },
  { id: "R-04", name: "Turnaround and overdue requests", area: "Service performance", description: "Request age, turnaround time and overdue requests against configured targets.", source: "Back Office" },
  { id: "R-05", name: "Failed and unresolved requests", area: "Exceptions", description: "Failed, unresolved and partially completed requests with recovery outcomes.", source: "Back Office" },
  { id: "R-06", name: "Corporate setup and workflow changes", area: "Corporate / SME", description: "Organisations, users, roles, groups, policy bands and workflow changes.", source: "Back Office, Corporate platform" },
  { id: "R-07", name: "Digital-channel transactions", area: "Transactions", description: "Counts and values by channel, type, provider and status. Currencies are reported separately.", source: "Transaction enquiry services" },
  { id: "R-08", name: "CRM cases", area: "Complaints", description: "Case counts, categories, statuses, teams, age and SLA position as reported by CRM.", source: "CRM" },
  { id: "R-09", name: "INB restrictions", area: "Instant Banking", description: "Lock, blacklist, PIN reset and disable/enable requests.", source: "Back Office, Instant Banking platform" },
  { id: "R-10", name: "Device and campaign actions", area: "Devices and channels", description: "Device deregistrations, incomplete revocations, campaign versions and channel outcomes.", source: "Back Office" },
  { id: "R-11", name: "Card blocking requests", area: "Cards", description: "Permanent block requests by approval status, processing status, branch, maker and checker.", source: "Back Office, Card-management system" },
  { id: "R-12", name: "Configuration changes", area: "Configuration", description: "Role, permission, workflow and reporting configuration changes.", source: "Back Office" },
];

export interface ReportJob { id: string; report: string; period: string; filters: string; requestedAt: string; status: "Queued" | "Generating" | "Ready" | "Failed"; rows?: number }

export const reportJobs: ReportJob[] = [
  { id: "RPT-20261111-014", report: "Turnaround and overdue requests", period: "1 Nov 2026 to 11 Nov 2026", filters: "Branch: SOL 042 · Module: Corporate", requestedAt: "2026-11-11T11:50:00", status: "Generating" },
  { id: "RPT-20261111-009", report: "Staff access review", period: "As at 11 Nov 2026", filters: "All branches", requestedAt: "2026-11-11T09:05:00", status: "Ready", rows: 412 },
  { id: "RPT-20261110-031", report: "Digital-channel transactions", period: "October 2026", filters: "Channel: Retail Mobile", requestedAt: "2026-11-10T16:22:00", status: "Failed" },
];

// ---------- Audit ----------
export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  role: string;
  branch: string;
  category: "Sign-in" | "Enquiry" | "Submission" | "Approval" | "Processing" | "Evidence" | "Export" | "Configuration";
  action: string;
  record: string;
  outcome: "Success" | "Failed" | "Denied";
  before?: string;
  after?: string;
  requestRef?: string;
  reason?: string;
}

export const auditLog: AuditEntry[] = [
  { id: "AUD-900412", at: "2026-11-11T12:14:00", actor: "Adaeze Nwosu", role: "CSU Checker", branch: "SOL 042", category: "Enquiry", action: "Viewed organisation", record: "ORG-000184 Zenith Agro Allied Ltd", outcome: "Success" },
  { id: "AUD-900398", at: "2026-11-11T09:14:00", actor: "Ifeanyi Obi", role: "CSU Maker", branch: "SOL 042", category: "Submission", action: "Submitted request", record: "Create corporate users · Zenith Agro Allied Ltd", outcome: "Success", requestRef: "BO-2026-004821", reason: "Customer nominated two additional users on the CONB form." },
  { id: "AUD-900377", at: "2026-11-11T08:31:00", actor: "Adaeze Nwosu", role: "CSU Checker", branch: "SOL 042", category: "Sign-in", action: "Signed in with token", record: "Staff FB10482", outcome: "Success" },
  { id: "AUD-900376", at: "2026-11-11T08:30:00", actor: "Adaeze Nwosu", role: "CSU Checker", branch: "SOL 042", category: "Sign-in", action: "Second factor failed", record: "Staff FB10482", outcome: "Failed" },
  { id: "AUD-900201", at: "2026-11-10T13:25:00", actor: "Adaeze Nwosu", role: "CSU Checker", branch: "SOL 042", category: "Approval", action: "Returned request", record: "Amend workflow policy · Zenith Agro Allied Ltd", outcome: "Success", requestRef: "BO-2026-004817", reason: "Band 2 lower limit must follow the new Band 1 upper limit." },
  { id: "AUD-900144", at: "2026-11-09T11:31:00", actor: "SME platform", role: "System", branch: "—", category: "Processing", action: "Linked account", record: "4410027722 · Lekki Fresh Foods", outcome: "Success", before: "Not linked", after: "Linked", requestRef: "BO-2026-004802" },
  { id: "AUD-900143", at: "2026-11-09T11:31:00", actor: "SME platform", role: "System", branch: "—", category: "Processing", action: "Link account rejected by source", record: "4410027739 · Lekki Fresh Foods", outcome: "Failed", requestRef: "BO-2026-004802", reason: "Account not eligible for the SME channel." },
  { id: "AUD-900090", at: "2026-11-08T16:40:00", actor: "Musa Danjuma", role: "Branch Checker", branch: "SOL 118", category: "Evidence", action: "Downloaded evidence", record: "Indemnity-LFF.pdf", outcome: "Success", requestRef: "BO-2026-004802" },
  { id: "AUD-900071", at: "2026-11-08T10:02:00", actor: "Blessing Obieri", role: "IAM Maker", branch: "Head Office", category: "Export", action: "Exported staff access review", record: "RPT-20261108-004", outcome: "Success" },
  { id: "AUD-900055", at: "2026-11-07T15:18:00", actor: "Kunle Ajayi", role: "Trueserve Maker", branch: "Contact Centre", category: "Enquiry", action: "Attempted to open restricted evidence", record: "CAS-10268-K2P1", outcome: "Denied" },
  { id: "AUD-900012", at: "2026-11-06T09:00:00", actor: "Emeka Ude", role: "Channels Support Checker", branch: "Head Office", category: "Configuration", action: "Approved service target change", record: "Create corporate users · Approval stage", outcome: "Success", before: "8 hours", after: "4 hours" },
];

// ---------- Staff, roles ----------
export interface StaffMember {
  staffId: string;
  name: string;
  email: string;
  phone: string;
  branch: string;
  team: string;
  roles: string[];
  designation: "Maker" | "Checker" | "Maker and Checker" | "View only";
  status: "Active" | "Suspended" | "Deactivated";
  scope: "Branch" | "Bank-wide";
  lastLogin?: string;
  delegation?: { to: string; until: string };
}

export const staff: StaffMember[] = [
  { staffId: "FB10482", name: "Adaeze Nwosu", email: "adaeze.nwosu@fidelitybank.example", phone: "08135636533", branch: "Victoria Island (SOL 042)", team: "CSU", roles: ["CSU Maker", "Branch Checker"], designation: "Maker and Checker", status: "Active", scope: "Branch", lastLogin: "2026-11-11T08:31:00" },
  { staffId: "FB10977", name: "Ifeanyi Obi", email: "ifeanyi.obi@fidelitybank.example", phone: "08135636534", branch: "Victoria Island (SOL 042)", team: "CSU", roles: ["CSU Maker"], designation: "Maker", status: "Active", scope: "Branch", lastLogin: "2026-11-11T09:01:00" },
  { staffId: "FB08113", name: "Musa Danjuma", email: "musa.danjuma@fidelitybank.example", phone: "08135636535", branch: "Lekki Phase 1 (SOL 118)", team: "CSU", roles: ["Branch Checker"], designation: "Checker", status: "Active", scope: "Branch", lastLogin: "2026-11-10T17:40:00", delegation: { to: "Adaeze Nwosu", until: "2026-11-14" } },
  { staffId: "FB12001", name: "Kunle Ajayi", email: "kunle.ajayi@fidelitybank.example", phone: "08135636536", branch: "Contact Centre", team: "Trueserve", roles: ["Trueserve Maker"], designation: "Maker", status: "Active", scope: "Bank-wide", lastLogin: "2026-11-11T07:58:00" },
  { staffId: "FB07742", name: "Emeka Ude", email: "emeka.ude@fidelitybank.example", phone: "08135636537", branch: "Head Office", team: "Channels Support", roles: ["Channels Support Checker"], designation: "Checker", status: "Active", scope: "Bank-wide", lastLogin: "2026-11-11T08:10:00" },
  { staffId: "FB09555", name: "Chidinma Okoro", email: "chidinma.okoro@fidelitybank.example", phone: "08135636538", branch: "Head Office", team: "Channels Support", roles: ["Channels Support Maker"], designation: "Maker", status: "Suspended", scope: "Bank-wide", lastLogin: "2026-11-03T12:00:00" },
  { staffId: "FB06120", name: "Blessing Obieri", email: "blessing.obieri@fidelitybank.example", phone: "08135636539", branch: "Head Office", team: "IAM", roles: ["IAM Maker"], designation: "Maker", status: "Active", scope: "Bank-wide", lastLogin: "2026-11-11T08:45:00" },
  { staffId: "FB05008", name: "Tolu Bamidele", email: "tolu.bamidele@fidelitybank.example", phone: "08135636540", branch: "Apapa (SOL 009)", team: "E-Banking Virtual", roles: ["Read-only Enquiry"], designation: "View only", status: "Deactivated", scope: "Branch" },
];

/** Identity-service directory used by staff-ID lookup (GET /staff/lookup). */
export const directory: Record<string, { name: string; email: string; branch: string; team: string }> = {
  FB13344: { name: "Halima Sule", email: "halima.sule@fidelitybank.example", branch: "Ikeja (SOL 031)", team: "CSU" },
  FB13345: { name: "Obinna Eke", email: "obinna.eke@fidelitybank.example", branch: "Onitsha Main (SOL 201)", team: "CSU" },
};

export const BRANCHES = ["Victoria Island (SOL 042)", "Lekki Phase 1 (SOL 118)", "Apapa (SOL 009)", "Ikeja (SOL 031)", "Onitsha Main (SOL 201)", "Head Office", "Contact Centre"];

export const PERMISSION_KINDS = ["View", "Initiate", "Amend", "Approve", "Export"] as const;
export type PermissionKind = (typeof PERMISSION_KINDS)[number];

export const FUNCTIONS = [
  "Staff access", "Retail digital users", "Corporate / SME setup", "Corporate workflows", "Credential recovery",
  "Instant Banking", "Account linking", "Transactions", "CRM cases", "Devices", "Campaigns", "Cards",
  "System status", "Reports", "Audit logs", "Configuration",
];

export interface RoleBundle { id: string; name: string; team: string; description: string; staffCount: number; permissions: Record<string, PermissionKind[]> }

const perms = (entries: [string, PermissionKind[]][]) => Object.fromEntries(entries);
const CUSTOMER_FUNCS = ["Retail digital users", "Corporate / SME setup", "Corporate workflows", "Credential recovery", "Instant Banking", "Account linking", "Devices", "Cards"];

export const roleBundles: RoleBundle[] = [
  { id: "RB-01", name: "CSU Maker", team: "CSU", description: "Initiates customer setup and maintenance for the assigned branch.", staffCount: 164, permissions: perms([...CUSTOMER_FUNCS.map((f): [string, PermissionKind[]] => [f, ["View", "Initiate", "Amend"]]), ["Transactions", ["View"]], ["CRM cases", ["View"]], ["System status", ["View"]]]) },
  { id: "RB-02", name: "Branch Checker", team: "CSU", description: "CSUH/TSDH or designated checker. Approves, rejects or returns branch requests.", staffCount: 71, permissions: perms([...CUSTOMER_FUNCS.map((f): [string, PermissionKind[]] => [f, ["View", "Approve"]]), ["Transactions", ["View"]], ["CRM cases", ["View"]], ["Reports", ["View", "Export"]], ["System status", ["View"]]]) },
  { id: "RB-03", name: "Trueserve Maker", team: "Trueserve", description: "Supports customers through online service channels.", staffCount: 38, permissions: perms([["Retail digital users", ["View", "Initiate"]], ["Credential recovery", ["View", "Initiate"]], ["Instant Banking", ["View", "Initiate"]], ["Transactions", ["View"]], ["CRM cases", ["View"]], ["Devices", ["View", "Initiate"]], ["Cards", ["View", "Initiate"]]]) },
  { id: "RB-04", name: "Channels Support Maker", team: "Channels Support", description: "Administration, maintenance, escalated exceptions and campaign entry.", staffCount: 12, permissions: perms([["Instant Banking", ["View", "Initiate", "Amend"]], ["Campaigns", ["View", "Initiate", "Amend"]], ["Transactions", ["View", "Export"]], ["System status", ["View", "Export"]], ["Configuration", ["View", "Initiate"]], ["Reports", ["View", "Export"]]]) },
  { id: "RB-05", name: "Channels Support Checker", team: "Channels Support", description: "Approves Support requests, campaigns and configuration changes.", staffCount: 6, permissions: perms([["Instant Banking", ["View", "Approve"]], ["Campaigns", ["View", "Approve"]], ["Configuration", ["View", "Approve"]], ["System status", ["View"]], ["Reports", ["View", "Export"]], ["Audit logs", ["View"]]]) },
  { id: "RB-06", name: "IAM Maker", team: "IAM", description: "Profiles staff, assigns role bundles and processes branch reassignment.", staffCount: 5, permissions: perms([["Staff access", ["View", "Initiate", "Amend", "Export"]], ["Audit logs", ["View"]], ["Reports", ["View", "Export"]]]) },
  { id: "RB-07", name: "IAM Checker", team: "IAM", description: "Approves staff access changes and role-bundle changes.", staffCount: 3, permissions: perms([["Staff access", ["View", "Approve", "Export"]], ["Audit logs", ["View", "Export"]], ["Reports", ["View", "Export"]]]) },
  { id: "RB-08", name: "Read-only Enquiry", team: "Shared", description: "Enquiries only. No maker or checker rights.", staffCount: 113, permissions: perms([["Retail digital users", ["View"]], ["Transactions", ["View"]], ["CRM cases", ["View"]], ["System status", ["View"]]]) },
];

// ---------- Configuration ----------
export interface ServiceTarget { id: string; requestType: string; stage: "Approval" | "Processing"; targetHours: number | null; escalateAt: string; recipient: string; clockStart: string; pauseAllowed: boolean }

export const serviceTargets: ServiceTarget[] = [
  { id: "ST-1", requestType: "Create corporate users", stage: "Approval", targetHours: 4, escalateAt: "Breach of target", recipient: "CSUH, Victoria Island", clockStart: "Request submission", pauseAllowed: true },
  { id: "ST-2", requestType: "Create organisation", stage: "Approval", targetHours: 24, escalateAt: "Breach of target", recipient: "Branch Leader", clockStart: "Request submission", pauseAllowed: true },
  { id: "ST-3", requestType: "Amend workflow policy", stage: "Approval", targetHours: 8, escalateAt: "6 hours in stage", recipient: "CSUH", clockStart: "Entry into stage", pauseAllowed: false },
  { id: "ST-4", requestType: "Link accounts", stage: "Processing", targetHours: 24, escalateAt: "Breach of target", recipient: "Channels Support", clockStart: "Entry into stage", pauseAllowed: false },
  { id: "ST-5", requestType: "Permanent card block", stage: "Approval", targetHours: 1, escalateAt: "30 minutes in stage", recipient: "Branch Checker, then CSUH", clockStart: "Request submission", pauseAllowed: false },
  { id: "ST-6", requestType: "Unlock user", stage: "Approval", targetHours: null, escalateAt: "—", recipient: "—", clockStart: "—", pauseAllowed: false },
];

export interface NotificationRule { id: string; service: string; event: string; recipient: string; channel: "Email" | "SMS" | "In-app" | "Email and SMS"; timing: string; active: boolean }

export const notificationRules: NotificationRule[] = [
  { id: "NR-1", service: "All requests", event: "Submitted for approval", recipient: "Assigned checker", channel: "In-app", timing: "Immediately", active: true },
  { id: "NR-2", service: "All requests", event: "Returned for correction", recipient: "Maker", channel: "In-app", timing: "Immediately", active: true },
  { id: "NR-3", service: "Corporate users", event: "User created", recipient: "New user (verified email)", channel: "Email", timing: "On source confirmation", active: true },
  { id: "NR-4", service: "Corporate users", event: "Contact changed", recipient: "Old and new contact", channel: "Email and SMS", timing: "On source confirmation", active: true },
  { id: "NR-5", service: "Account linking", event: "Completed", recipient: "Customer", channel: "SMS", timing: "On source confirmation", active: true },
  { id: "NR-6", service: "Cards", event: "Permanent block completed", recipient: "Customer", channel: "Email and SMS", timing: "On source confirmation", active: true },
  { id: "NR-7", service: "All requests", event: "Processing failed", recipient: "Maker and Channels Support", channel: "In-app", timing: "Immediately", active: true },
  { id: "NR-8", service: "Workflow", event: "Workflow changed", recipient: "Company representative", channel: "Email", timing: "On source confirmation", active: false },
];

export interface EvidenceChecklist { id: string; action: string; customerType: "Retail" | "Corporate" | "SME" | "Any"; route: string; documents: string[] }

export const evidenceChecklists: EvidenceChecklist[] = [
  { id: "EC-1", action: "Create organisation", customerType: "Corporate", route: "Branch visit", documents: ["CONB Form", "Board Resolution"] },
  { id: "EC-2", action: "Create organisation", customerType: "Corporate", route: "Cross-branch", documents: ["CONB Form", "Board Resolution", "Domicile-branch confirmation"] },
  { id: "EC-3", action: "Create organisation", customerType: "Corporate", route: "Third-party submission", documents: ["CONB Form", "Board Resolution", "Account Officer confirmation", "Branch Leader concurrence"] },
  { id: "EC-4", action: "Create corporate users", customerType: "Corporate", route: "Any", documents: ["CONB Form", "Board Resolution"] },
  { id: "EC-5", action: "Update email or phone", customerType: "Corporate", route: "Email", documents: ["Customer instruction", "Email indemnity", "Identification"] },
  { id: "EC-6", action: "Permanent card block", customerType: "Any", route: "Any", documents: ["Customer instruction", "KYC verification"] },
  { id: "EC-7", action: "Deregister device", customerType: "Retail", route: "Any", documents: ["Customer instruction", "KYC verification"] },
  { id: "EC-8", action: "Retail enrolment", customerType: "Retail", route: "Branch visit", documents: ["Customer instruction", "Identification"] },
];

export const documentTypes = ["Customer instruction", "CONB Form", "Authority document", "Board Resolution", "Director/signatory confirmation", "KYC verification", "Identification", "Email indemnity", "Domicile-branch confirmation", "Account Officer confirmation", "Branch Leader concurrence", "Other"];
export const changeReasons = ["Customer instruction", "Customer complaint", "Staff or signatory change", "Security concern", "Branch transfer", "Role change", "Staff exit", "Other"];

// ---------- Notifications (staff, in-app) ----------
export interface StaffNotification { id: string; at: string; text: string; href: string; read: boolean; delivery: "Delivered" | "Failed" }

export const notifications: StaffNotification[] = [
  { id: "N-1", at: "2026-11-11T09:14:00", text: "Create corporate users for Zenith Agro Allied Ltd is waiting for your approval.", href: "/requests/BO-2026-004821", read: false, delivery: "Delivered" },
  { id: "N-2", at: "2026-11-11T08:00:00", text: "Amend workflow policy is overdue against its 8-hour approval target.", href: "/requests/BO-2026-004817", read: false, delivery: "Delivered" },
  { id: "N-3", at: "2026-11-09T11:31:00", text: "Link accounts for Lekki Fresh Foods partially completed: 1 of 2 linked.", href: "/requests/BO-2026-004802", read: true, delivery: "Delivered" },
  { id: "N-4", at: "2026-11-08T14:02:00", text: "Unlock user was returned to you for correction.", href: "/requests/BO-2026-004790", read: true, delivery: "Failed" },
];
