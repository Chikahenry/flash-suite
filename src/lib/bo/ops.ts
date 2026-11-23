"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";

// Transactions, approval requests, reports and the dashboard summary: /api/v1/backoffice/** (see the swagger).

const enc = encodeURIComponent;
type Q = Record<string, string | number | boolean | undefined>;

/** The screen picks plain dates; these APIs take date-times, so a day runs from 00:00 to 23:59:59 West Africa Time. */
export const startOfDay = (d?: string) => (d ? `${d}T00:00:00+01:00` : undefined);
export const endOfDay = (d?: string) => (d ? `${d}T23:59:59+01:00` : undefined);

function useMutate<V>(keys: string[], run: (v: V) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: run, onSuccess: () => keys.forEach((k) => void qc.invalidateQueries({ queryKey: [k] })) });
}

// ---- transactions (read-only) ----
export interface TransactionRow {
  id: string; reference?: string; bankReference?: string; type?: string; status?: string; sourceAccount?: string; sourceAccountName?: string;
  currency?: string; amount?: number; itemCount?: number; makerUsername?: string; createdAt?: string; submittedAt?: string;
  approverUsername?: string; approvedAt?: string; updatedAt?: string; channel?: string;
}
export interface TransactionItem {
  reference?: string; beneficiaryName?: string; accountNumber?: string; bankName?: string; amount?: number; currency?: string;
  status?: string; providerReference?: string; failureReason?: string;
}
export interface TransactionDetail { transaction: TransactionRow; items?: TransactionItem[] }
export interface TransactionEvent { occurredAt?: string; event?: string; previousStatus?: string; status?: string; actor?: string; reason?: string }
export interface TransactionFilters { search?: string; status?: string; channel?: string; type?: string; account?: string; minAmount?: string; maxAmount?: string; from?: string; to?: string }

export const transactionQuery = (f: TransactionFilters): Q => ({ ...f, from: startOfDay(f.from), to: endOfDay(f.to) });

export const useTransactions = (f: TransactionFilters & { page: number; size: number }) =>
  useQuery({ queryKey: ["transactions", "list", f], queryFn: () => api<TransactionRow[]>("/transactions", { query: transactionQuery(f) as Q }), placeholderData: keepPreviousData });
export const useTransactionOptions = () =>
  useQuery({ queryKey: ["transactions", "options"], queryFn: async () => (await api<{ statuses?: string[]; channels?: string[]; types?: string[] }>("/transactions/filter-options")).data, staleTime: 10 * 60_000 });
export const useTransaction = (id: string) =>
  useQuery({ queryKey: ["transactions", id], queryFn: async () => (await api<TransactionDetail>(`/transactions/${enc(id)}`)).data });
export const useTransactionTimeline = (id: string) =>
  useQuery({ queryKey: ["transactions", id, "timeline"], queryFn: async () => (await api<TransactionEvent[]>(`/transactions/${enc(id)}/timeline`)).data });

// ---- approval requests (maker-checker) ----
export interface ApprovalRequest {
  id: number; type?: string; requestId?: string; reference?: string; amount?: number; status?: string; currentStep?: number;
  makerId?: string; makerUsername?: string; createdAt?: string; completedAt?: string; updatedAt?: string;
}
export interface ApprovalAction { id: number; action?: string; step?: number; cycle?: number; actorId?: string; actorUsername?: string; assignedTo?: string; comment?: string; createdAt?: string }
export interface ApprovalDetail { request: ApprovalRequest; history?: ApprovalAction[] }
export interface ApprovalFilters { status?: string; type?: string; maker?: string; from?: string; to?: string }
export type ApprovalVerb = "approve" | "reject" | "return-to-maker" | "resubmit" | "cancel";

export const useApprovals = (f: ApprovalFilters & { page: number; size: number }) =>
  useQuery({ queryKey: ["approvals", "list", f], queryFn: () => api<ApprovalRequest[]>("/approval-requests", { query: { ...f, from: startOfDay(f.from), to: endOfDay(f.to) } }), placeholderData: keepPreviousData });
export const useApprovalOptions = () =>
  useQuery({ queryKey: ["approvals", "options"], queryFn: async () => (await api<{ statuses?: string[]; types?: string[] }>("/approval-requests/filter-options")).data, staleTime: 10 * 60_000 });
export const useApprovalCounts = () =>
  useQuery({ queryKey: ["approvals", "counts"], queryFn: async () => (await api<{ status: string; count: number }[]>("/approval-requests/counts")).data });
export const useApproval = (id: number | null) =>
  useQuery({ queryKey: ["approvals", id], queryFn: async () => (await api<ApprovalDetail>(`/approval-requests/${id}`)).data, enabled: id !== null });

/** Each decision carries a fresh Idempotency-Key, so a double click or a retry never decides twice. */
export const useApprovalAction = () =>
  useMutate<{ id: number; verb: ApprovalVerb; reason?: string; comment?: string }>(["approvals", "dashboard"], ({ id, verb, reason, comment }) =>
    api<ApprovalDetail>(`/approval-requests/${id}/${verb}`, { method: "POST", body: { reason, comment }, headers: { "Idempotency-Key": crypto.randomUUID() } }));

// ---- reports ----
export interface ReportCatalogEntry { reportType: string; name?: string; formats?: string[]; description?: string }
export interface ReportSummary { reportId: string; reportType?: string; format?: string; fileName?: string; contentType?: string; fileSize?: number; generatedBy?: string; generatedAt?: string }
export interface ReportRequest { reportType: string; format?: string; search?: string; status?: string; channel?: string; type?: string; account?: string; minAmount?: number; maxAmount?: number; from?: string; to?: string }
export interface ReportSchedule { scheduleId: string; name?: string; reportType?: string; frequency?: string; status?: string; nextRunAt?: string; lastRunAt?: string; lastReportId?: string; report?: ReportRequest; createdAt?: string }
export interface ReportOptions { reportTypes?: string[]; formats?: string[]; statuses?: string[]; transactionTypes?: string[]; channels?: string[] }

export const useReportCatalog = () =>
  useQuery({ queryKey: ["reports", "catalog"], queryFn: async () => (await api<ReportCatalogEntry[]>("/reports/catalog")).data, staleTime: 10 * 60_000 });
export const useReportOptions = () =>
  useQuery({ queryKey: ["reports", "options"], queryFn: async () => (await api<ReportOptions>("/reports/filter-options")).data, staleTime: 10 * 60_000 });
export const useReportHistory = (page: number, size: number) =>
  useQuery({ queryKey: ["reports", "history", page, size], queryFn: () => api<ReportSummary[]>("/reports/history", { query: { page, size } }), placeholderData: keepPreviousData });
export const useGenerateReport = () =>
  useMutate<ReportRequest>(["reports", "dashboard"], async (body) => (await api<ReportSummary>("/reports/generate", { method: "POST", body: { ...body, from: startOfDay(body.from), to: endOfDay(body.to) } })).data);

export const useSchedules = () =>
  useQuery({ queryKey: ["reports", "schedules"], queryFn: async () => (await api<ReportSchedule[]>("/reports/schedules")).data });
export const useCreateSchedule = () =>
  useMutate<{ name: string; frequency: string; nextRunAt?: string; report: ReportRequest }>(["reports", "dashboard"], ({ report, ...rest }) =>
    api("/reports/schedules", { method: "POST", body: { ...rest, report: { ...report, from: startOfDay(report.from), to: endOfDay(report.to) } } }));
export const useUpdateSchedule = () =>
  useMutate<{ scheduleId: string; status?: string; name?: string; frequency?: string }>(["reports", "dashboard"], ({ scheduleId, ...body }) =>
    api(`/reports/schedules/${enc(scheduleId)}`, { method: "PATCH", body }));
export const useDeleteSchedule = () => useMutate<string>(["reports", "dashboard"], (id) => api(`/reports/schedules/${enc(id)}`, { method: "DELETE" }));
export const useRunSchedule = () => useMutate<string>(["reports", "dashboard"], (id) => api(`/reports/schedules/${enc(id)}/run`, { method: "POST" }));

// ---- dashboard ----
export interface DashboardSummary {
  totalTransactions?: number; transactionsLast30Days?: number; transactionsPendingSubmissionOrApproval?: number;
  approvalRequestsPending?: number; activeReportSchedules?: number;
}
export const useDashboardSummary = () =>
  useQuery({ queryKey: ["dashboard", "summary"], queryFn: async () => (await api<DashboardSummary>("/dashboard/summary")).data, staleTime: 60_000 });
