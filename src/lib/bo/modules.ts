"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { CaseDetail, CasePage, CustomerDetail, KycDocument } from "./types";

// Case management, cards, account upgrades, new-to-bank, accounts and broadcasts:
// /api/v1/backoffice/** (see the swagger, "secured" definition).

const enc = encodeURIComponent;
type Q = Record<string, string | number | boolean | undefined>;
const useList = <T>(key: string, path: string, query: Q) =>
  useQuery({ queryKey: [key, "list", query], queryFn: () => api<T[]>(path, { query }), placeholderData: keepPreviousData });

// ---- cases (read-only: cases are handled in CRM) ----
export interface CaseState { code: number; name: string }

export const useCaseStates = () =>
  useQuery({ queryKey: ["cases", "states"], queryFn: async () => (await api<CaseState[]>("/cases/references/states")).data, staleTime: 10 * 60_000 });

export const useCases = (q: { stateCode?: string; from?: string; to?: string; page: number; pageSize: number }) =>
  useQuery({ queryKey: ["cases", "list", q], queryFn: async () => (await api<CasePage>("/cases", { query: { ...q, sortBy: "createdAt", sortDirection: "desc" } })).data, placeholderData: keepPreviousData });

export const useCase = (ticketId: string) =>
  useQuery({ queryKey: ["cases", ticketId], queryFn: async () => (await api<CaseDetail>(`/cases/${enc(ticketId)}`)).data });

// ---- card requests and physical cards ----
export interface CardRequest {
  id: string; userId?: string; formFactor?: string; linkedAccountNumber?: string; nickname?: string; deliveryAddress?: string;
  status?: string; platformReference?: string; failureReason?: string; cardProductCode?: string; deliveryMode?: string;
  pickupBranchId?: number; debitAccountNumber?: string; chargeAmount?: number; deliveryChargeAmount?: number; chargeCurrency?: string;
  createdAt?: string; updatedAt?: string;
}
export interface PhysicalCard {
  id: string; requestId?: string; linkedAccountNumber?: string; cardProductCode?: string; status?: string; pickupBranchId?: number;
  maskedPan?: string; expiryMonth?: string; expiryYear?: string; embossedName?: string; productionReference?: string;
  requestedAt?: string; forwardedAt?: string; readyAt?: string; collectedAt?: string; rejectedAt?: string; rejectionReason?: string;
}
export interface CardEvent { fromStatus?: string; toStatus?: string; actorId?: string; note?: string; occurredAt?: string }
export interface CardProduced { maskedPan: string; expiryMonth: string; expiryYear: string; embossedName: string; productionReference: string; note?: string }

export const useCardRequests = (q: Q) => useList<CardRequest>("card-requests", "/card-requests", q);
export const usePhysicalCards = (q: Q) => useList<PhysicalCard>("physical-cards", "/physical-cards", q);
export const useCardTrail = (cardId: string | null) =>
  useQuery({ queryKey: ["physical-cards", "trail", cardId], queryFn: async () => (await api<CardEvent[]>(`/physical-cards/${enc(cardId ?? "")}/trail`)).data, enabled: !!cardId });

function useMutate<V>(keys: string[], run: (v: V) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: run, onSuccess: () => keys.forEach((k) => void qc.invalidateQueries({ queryKey: [k] })) });
}

type CardStep = { cardId: string; step: "production" | "collected" | "reject" | "ready"; body: Record<string, unknown> };
export const useCardStep = () =>
  useMutate<CardStep>(["physical-cards"], ({ cardId, step, body }) => api(`/physical-cards/${enc(cardId)}/${step}`, { method: "POST", body }));
export const useChangePickupBranch = () =>
  useMutate<{ cardId: string; pickupBranchId: number }>(["physical-cards"], ({ cardId, pickupBranchId }) => api(`/physical-cards/${enc(cardId)}/pickup-branch`, { method: "PATCH", body: { pickupBranchId } }));

// ---- account upgrade requests ----
export interface UpgradeItem { id: string; customerId?: string; customerName?: string; accountNumber?: string; targetKycTier?: number; status?: string; resubmissionCount?: number; submittedAt?: string; version?: number }
export interface UpgradeDetail extends UpgradeItem {
  submissionReason?: string; rejectionReason?: string; documentTypes?: string[]; reviewedAt?: string; reviewedBy?: string;
  customer?: CustomerDetail; documents?: KycDocument[];
}
export const useUpgrades = (q: Q) => useList<UpgradeItem>("upgrades", "/account-upgrade-requests", q);
export const useUpgrade = (id: string | null) =>
  useQuery({ queryKey: ["upgrades", id], queryFn: async () => (await api<UpgradeDetail>(`/account-upgrade-requests/${enc(id ?? "")}`)).data, enabled: !!id });
export const useUpgradeDecision = () =>
  useMutate<{ id: string; approve: boolean; version: number; rejectionReason?: string }>(["upgrades"], ({ id, approve, ...body }) =>
    api(`/account-upgrade-requests/${enc(id)}/${approve ? "approve" : "reject"}`, { method: "POST", body }));

// ---- new-to-bank ----
export interface ReviewItem {
  id: string; referenceId?: string; customerName?: string; bvn?: string; nin?: string; phone?: string; email?: string;
  accountType?: string; accountTier?: string; status?: string; submittedAt?: string; version?: number;
}
export interface ReviewDetail extends ReviewItem {
  rejectionReason?: string; reviewedBy?: string; reviewedAt?: string; downstreamCifId?: string; downstreamAccountNumber?: string; decisionMessage?: string;
}
export interface RetryItem {
  id: string; referenceId?: string; customerId?: string; accountNumber?: string; customerName?: string; status?: string; attemptCount?: number;
  lastFailureMessage?: string; lastAttemptedAt?: string; createdAt?: string; version?: number;
}
export const useReviews = (q: Q) => useList<ReviewItem>("reviews", "/new-to-bank/reviews", q);
export const useReview = (id: string | null) =>
  useQuery({ queryKey: ["reviews", id], queryFn: async () => (await api<ReviewDetail>(`/new-to-bank/reviews/${enc(id ?? "")}`)).data, enabled: !!id });
export const useReviewDecision = () =>
  useMutate<{ id: string; approve: boolean; version: number; comments?: string }>(["reviews"], ({ id, approve, ...body }) =>
    api(`/new-to-bank/reviews/${enc(id)}/${approve ? "approve" : "reject"}`, { method: "POST", body }));
export const useRetries = (q: Q) => useList<RetryItem>("retries", "/new-to-bank/mandate-retries", q);
export const useRetryMandate = () =>
  useMutate<{ id: string; version: number; comments?: string }>(["retries"], ({ id, ...body }) => api(`/new-to-bank/mandate-retries/${enc(id)}/retry`, { method: "POST", body }));

// ---- accounts ----
export interface AccountItem {
  accountNumber: string; customerId?: string; customerName?: string; accountName?: string; productCode?: string; currency?: string;
  status?: string; accountTier?: string; sourceChannel?: string; branchId?: string; branchName?: string; availableBalance?: number; balanceAvailable?: boolean;
}
export const useAccounts = (q: Q) => useList<AccountItem>("accounts", "/accounts", q);

// ---- broadcasts ----
export interface Broadcast { id: string; type?: string; title?: string; message?: string; severity?: string; publishedAt?: string; expiresAt?: string; createdAt?: string }
export const useBroadcasts = (q: Q) => useList<Broadcast>("broadcasts", "/notifications", q);
export const usePublishBroadcast = () =>
  useMutate<{ kind: "announcements" | "security-alerts"; title: string; message: string; severity: string; expiresAt?: string }>(["broadcasts"], ({ kind, ...body }) =>
    api(`/notifications/${kind}`, { method: "POST", body }));
