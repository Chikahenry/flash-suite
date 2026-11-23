// Shapes returned by the back-office API (from the swagger, "secured" definition).
// Everything the API may leave out is optional; screens must cope with missing values.

export interface CustomerSummary {
  customerId: string;
  displayName?: string;
  phone?: string;
  email?: string;
  kycTier?: number;
  kycStatus?: string;
  retailStatus?: string;
  createdAt?: string;
  version?: number;
}

export interface CustomerDetail {
  customerId: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  maritalStatus?: string;
  nationality?: string;
  stateOfOrigin?: string;
  lga?: string;
  phone?: string;
  email?: string;
  avatarUrl?: string;
  maskedBvn?: string;
  maskedNin?: string;
  kycTier?: number;
  kycStatus?: string;
  retailStatus?: string;
  corporateStatus?: string;
  ussdStatus?: string;
  createdAt?: string;
  updatedAt?: string;
  version?: number;
}

export interface CustomerFilterOptions {
  statuses?: string[];
  kycStatuses?: string[];
  kycTiers?: number[];
}

export interface CustomerAccount {
  accountNumber: string;
  accountName?: string;
  schemeCode?: string;
  currency?: string;
  status?: string;
  kycTier?: number;
  availableBalance?: number;
  balanceAvailable?: boolean;
  defaultAccount?: boolean;
  accountTier?: string;
  sourceChannel?: string;
  digitalChannelBlocked?: boolean;
}

export interface CustomerCard {
  cardId: string;
  maskedPan?: string;
  ownerName?: string;
  status?: string;
  scheme?: string;
  expiryMonth?: string;
  expiryYear?: string;
}

export interface CustomerTransaction {
  id: number;
  reference?: string;
  channelReference?: string;
  type?: string;
  direction?: string;
  sourceAccount?: string;
  destinationAccount?: string;
  destinationBankCode?: string;
  amount?: number;
  currency?: string;
  status?: string;
  narration?: string;
  createdAt?: string;
}

export interface CustomerActivity {
  id: string;
  action?: string;
  actorId?: string;
  correlationId?: string;
  ipAddress?: string;
  createdAt?: string;
}

export interface KycDocument {
  type: string;
  label?: string;
  fileName?: string;
  contentType?: string;
  fileSize?: number;
  downloadUrl?: string;
}

export interface CaseSummary {
  ticketId: string;
  complaintTrackingNumber?: string;
  maskedAccountNumber?: string;
  customerDisplayName?: string;
  categoryName?: string;
  subcategoryName?: string;
  stateCode?: number;
  stateName?: string;
  statusCode?: number;
  statusName?: string;
  priorityCode?: number;
  priorityName?: string;
  amountInDispute?: number;
  currency?: string;
  escalated?: boolean;
  firstResponseSlaStatus?: string;
  resolutionSlaStatus?: string;
  createdAt?: string;
  modifiedAt?: string;
  closedAt?: string;
}

export interface CaseDetail extends CaseSummary {
  description?: string;
  complainantName?: string;
  location?: string;
  transactionDate?: string;
  transactionChannel?: string;
  transactionNarration?: string;
  maskedPan?: string;
  rrn?: string;
  stanSessionId?: string;
  caseOrigin?: string;
  queryType?: string;
  caseType?: string;
}

export interface CasePage {
  items: CaseSummary[];
  page?: { page?: number; pageSize?: number; totalCount?: number; totalPages?: number; hasPreviousPage?: boolean; hasNextPage?: boolean; truncated?: boolean };
}

export interface CustomerStatusResult {
  customerId: string;
  retailStatus?: string;
  version?: number;
  updatedAt?: string;
}

export interface CredentialResetResult {
  customerId?: string;
  action?: string;
  status?: string;
  challenge?: { reference?: string; maskedDestination?: string; expiresAt?: string };
  triggeredAt?: string;
}

export interface CardBlockResult {
  customerId?: string;
  cardId?: string;
  status?: string;
  last4?: string;
  reason?: string;
}

export interface AccountRestrictionResult {
  customerId?: string;
  accountNumber?: string;
  blocked?: boolean;
  restrictionScope?: string;
}

export interface UpdateCustomerBody {
  version: number;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  dateOfBirth?: string;
  maritalStatus?: string;
  nationality?: string;
  stateOfOrigin?: string;
  lga?: string;
}
