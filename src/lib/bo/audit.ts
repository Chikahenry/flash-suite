"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "./client";

// Audit module: GET /api/v1/backoffice/audit/events (searched, filtered and paged on the server).

export interface AuditEvent {
  eventId: string;
  eventType?: string;
  entityType?: string;
  entityId?: string;
  actorId?: string;
  actorType?: string;
  channel?: string;
  ipAddress?: string;
  correlationId?: string;
  before?: string;
  after?: string;
  description?: string;
  eventTime?: string;
  createdAt?: string;
  integrityStatus?: string;
}

export interface AuditParams {
  search?: string;
  eventType?: string;
  entityType?: string;
  entityId?: string;
  actorId?: string;
  channel?: string;
  from?: string;
  to?: string;
  page: number;
  size: number;
}

/** The screen picks plain dates; the audit API takes date-times, so a day runs from 00:00 to 23:59:59 West Africa Time. */
const startOfDay = (d: string) => (d ? `${d}T00:00:00+01:00` : undefined);
const endOfDay = (d: string | undefined) => (d ? `${d}T23:59:59+01:00` : undefined);

export const useAuditEvents = (p: AuditParams) =>
  useQuery({
    queryKey: ["audit", "events", p],
    queryFn: () => api<AuditEvent[]>("/audit/events", { query: { ...p, from: startOfDay(p.from ?? ""), to: endOfDay(p.to) } }),
    placeholderData: keepPreviousData,
  });

export const useAuditEvent = (eventId: string | null) =>
  useQuery({
    queryKey: ["audit", "event", eventId],
    queryFn: async () => (await api<AuditEvent>(`/audit/events/${encodeURIComponent(eventId ?? "")}`)).data,
    enabled: !!eventId,
  });
