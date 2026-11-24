"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";

// Customer enrolment: self-registrations waiting for a decision, and enrolment done by staff.
// Proposed contract under /api/v1/backoffice (not in the swagger yet, see Bank-API-Requirements-Phase-1.txt):
//   GET  /enrolment-requests            list, filtered by status / search / from / to
//   GET  /enrolment-requests/{id}       one request with documents and users
//   POST /enrolment-requests/{id}/approve   { version, comments? }
//   POST /enrolment-requests/{id}/reject    { version, reason }
//   POST /enrolment-requests                staff-assisted enrolment
// The Bank sends the customer, and each user, their emails; nothing is emailed from here.

const enc = encodeURIComponent;
type Q = Record<string, string | number | boolean | undefined>;

export type EnrolmentRole = "USER" | "AUTHORIZER";

export interface EnrolmentItem {
  id: string; referenceId?: string; organisationName?: string; accountNumber?: string; phone?: string; email?: string;
  status?: string; source?: string; submittedAt?: string; version?: number;
}
export interface EnrolmentUser { fullName?: string; email?: string; phone?: string; role?: EnrolmentRole | string }
export interface EnrolmentDocument { id: string; type?: string; fileName?: string }
export interface EnrolmentDetail extends EnrolmentItem {
  rcNumber?: string; address?: string; contactName?: string; authorisedBy?: string; users?: EnrolmentUser[]; documents?: EnrolmentDocument[];
  rejectionReason?: string; reviewedBy?: string; reviewedAt?: string; cif?: string;
}

export const useEnrolments = (q: Q) =>
  useQuery({ queryKey: ["enrolments", "list", q], queryFn: () => api<EnrolmentItem[]>("/enrolment-requests", { query: q }), placeholderData: keepPreviousData });

export const useEnrolment = (id: string | null) =>
  useQuery({ queryKey: ["enrolments", id], queryFn: async () => (await api<EnrolmentDetail>(`/enrolment-requests/${enc(id ?? "")}`)).data, enabled: !!id });

export const enrolmentDocumentPath = (id: string, documentId: string) => `/enrolment-requests/${enc(id)}/documents/${enc(documentId)}/content`;

export function useEnrolmentDecision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, approve, ...body }: { id: string; approve: boolean; version: number; comments?: string; reason?: string }) =>
      api(`/enrolment-requests/${enc(id)}/${approve ? "approve" : "reject"}`, { method: "POST", body, headers: { "Idempotency-Key": crypto.randomUUID() } }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["enrolments"] }),
  });
}

export interface NewEnrolment {
  accountNumber: string; organisationName: string; email: string; phone: string; authorisedBy: string; users: EnrolmentUser[];
}

export function useCreateEnrolment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: NewEnrolment) => api<{ id?: string; referenceId?: string; status?: string }>("/enrolment-requests", { method: "POST", body, headers: { "Idempotency-Key": crypto.randomUUID() } }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["enrolments"] }); void qc.invalidateQueries({ queryKey: ["customers"] }); },
  });
}
