"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type {
  AccountRestrictionResult, CardBlockResult, CaseDetail, CasePage, CredentialResetResult, CustomerAccount, CustomerActivity, CustomerCard,
  CustomerDetail, CustomerFilterOptions, CustomerStatusResult, CustomerSummary, CustomerTransaction, KycDocument, UpdateCustomerBody,
} from "./types";

// Customers module: /api/v1/backoffice/customers/**. The customer ID is the CIF.

export interface CustomerListParams {
  search?: string;
  status?: string;
  kycStatus?: string;
  kycTier?: string;
  createdFrom?: string;
  createdTo?: string;
  page: number;
  size: number;
}

const id = (customerId: string) => encodeURIComponent(customerId);

export const useCustomerFilterOptions = () =>
  useQuery({
    queryKey: ["customers", "filter-options"],
    queryFn: async () => (await api<CustomerFilterOptions>("/customers/filter-options")).data,
    staleTime: 5 * 60_000,
  });

export const useCustomers = (params: CustomerListParams) =>
  useQuery({
    queryKey: ["customers", "list", params],
    queryFn: () => api<CustomerSummary[]>("/customers", { query: { ...params } }),
    placeholderData: keepPreviousData,
  });

export const useCustomer = (customerId: string) =>
  useQuery({ queryKey: ["customers", customerId], queryFn: async () => (await api<CustomerDetail>(`/customers/${id(customerId)}`)).data });

export const useCustomerAccounts = (customerId: string) =>
  useQuery({ queryKey: ["customers", customerId, "accounts"], queryFn: async () => (await api<CustomerAccount[]>(`/customers/${id(customerId)}/accounts`)).data });

export const useCustomerCards = (customerId: string) =>
  useQuery({ queryKey: ["customers", customerId, "cards"], queryFn: async () => (await api<CustomerCard[]>(`/customers/${id(customerId)}/cards`)).data });

export const useCustomerTransactions = (
  customerId: string,
  params: { search?: string; status?: string; sourceAccount?: string; dateFrom?: string; dateTo?: string; page: number; size: number },
) =>
  useQuery({
    queryKey: ["customers", customerId, "transactions", params],
    queryFn: () => api<CustomerTransaction[]>(`/customers/${id(customerId)}/transactions`, { query: { ...params } }),
    placeholderData: keepPreviousData,
  });

export const useCustomerActivity = (customerId: string, page: number, size: number) =>
  useQuery({
    queryKey: ["customers", customerId, "activity", page, size],
    queryFn: () => api<CustomerActivity[]>(`/customers/${id(customerId)}/activity`, { query: { page, size } }),
    placeholderData: keepPreviousData,
  });

export const useKycDocuments = (customerId: string) =>
  useQuery({ queryKey: ["customers", customerId, "kyc"], queryFn: async () => (await api<KycDocument[]>(`/customers/${id(customerId)}/kyc-documents`)).data });

export const useCustomerCases = (customerId: string, params: { accountNumber?: string; status?: string; page: number; pageSize: number }) =>
  useQuery({
    queryKey: ["customers", customerId, "cases", params],
    queryFn: async () => (await api<CasePage>(`/customers/${id(customerId)}/cases`, { query: { ...params } })).data,
    placeholderData: keepPreviousData,
    // The API only lists cases for one account, so wait until an account is chosen.
    enabled: !!params.accountNumber,
  });

export const useCustomerCase = (customerId: string, ticketId: string | null, accountNumber?: string) =>
  useQuery({
    queryKey: ["customers", customerId, "case", ticketId, accountNumber],
    queryFn: async () => (await api<CaseDetail>(`/customers/${id(customerId)}/cases/${encodeURIComponent(ticketId ?? "")}`, { query: { accountNumber } })).data,
    enabled: !!ticketId && !!accountNumber,
  });

/** Path (without the /api/bo prefix) of one KYC document's file, for viewing or downloading. */
export const kycContentPath = (customerId: string, type: string) => `/customers/${id(customerId)}/kyc-documents/${encodeURIComponent(type)}/content`;

// ---- actions: each runs immediately on the back end, so the screen asks for a reason first ----

function useCustomerMutation<V, R>(customerId: string, run: (v: V) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["customers", customerId] });
      void qc.invalidateQueries({ queryKey: ["customers", "list"] });
    },
  });
}

export const useUpdateCustomer = (customerId: string) =>
  useCustomerMutation(customerId, async (body: UpdateCustomerBody) => (await api<CustomerDetail>(`/customers/${id(customerId)}`, { method: "PATCH", body })).data);

export const useSetCustomerBlocked = (customerId: string) =>
  useCustomerMutation(
    customerId,
    async ({ block, version, reason }: { block: boolean; version: number; reason: string }) =>
      (await api<CustomerStatusResult>(`/customers/${id(customerId)}/${block ? "block" : "unblock"}`, { method: "POST", body: { version, reason } })).data,
  );

export const useResetCredential = (customerId: string) =>
  useCustomerMutation(customerId, async (kind: "password" | "pin") => (await api<CredentialResetResult>(`/customers/${id(customerId)}/${kind}-reset`, { method: "POST" })).data);

// Retail auto-enrolment: POST/GET /customers/{id}/credentials/auto-enrol, .../resend, .../revoke.
// The Bank generates a temporary password and emails it. It is never returned here, so nothing on this side can show or log it.
export type AutoEnrolStatus = "NOT_ENROLLED" | "PENDING_FIRST_LOGIN" | "ACTIVE";
export interface AutoEnrolState { customerId: string; retailIdentityPresent?: boolean; enabled?: boolean; passwordChangeRequired?: boolean; status?: AutoEnrolStatus | string }
export interface AutoEnrolResult { customerId: string; action?: string; status?: string; maskedEmail?: string; triggeredAt?: string; revokedAt?: string }

export const useAutoEnrol = (customerId: string) =>
  useQuery({ queryKey: ["customers", customerId, "auto-enrol"], queryFn: async () => (await api<AutoEnrolState>(`/customers/${id(customerId)}/credentials/auto-enrol`)).data });

export const useAutoEnrolAction = (customerId: string) =>
  useCustomerMutation(customerId, async (action: "trigger" | "resend" | "revoke") =>
    (await api<AutoEnrolResult>(`/customers/${id(customerId)}/credentials/auto-enrol${action === "trigger" ? "" : `/${action}`}`, { method: "POST", headers: { "Idempotency-Key": crypto.randomUUID() } })).data);

export const useBlockCard = (customerId: string) =>
  useCustomerMutation(
    customerId,
    async ({ cardId, reason }: { cardId: string; reason: "LOST" | "STOLEN" | "OTHERS" }) =>
      (await api<CardBlockResult>(`/customers/${id(customerId)}/cards/${encodeURIComponent(cardId)}/block`, { method: "POST", body: { reason } })).data,
  );

export const useSetAccountRestricted = (customerId: string) =>
  useCustomerMutation(
    customerId,
    async ({ accountNumber, restrict }: { accountNumber: string; restrict: boolean }) =>
      (await api<AccountRestrictionResult>(`/customers/${id(customerId)}/accounts/${encodeURIComponent(accountNumber)}/${restrict ? "block" : "unblock"}`, { method: "POST" })).data,
  );
