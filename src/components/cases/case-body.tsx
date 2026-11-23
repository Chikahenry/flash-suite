"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { CopyRef } from "@/components/ops/tables";
import { formatApiDateTime, formatMoney, humanise, statusTone } from "@/lib/bo/format";
import type { CaseDetail } from "@/lib/bo/types";

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs text-ink-500">{label}</p>
      <div className="mt-1 break-words text-[13px] font-medium text-ink-900">{children}</div>
    </div>
  );
}

function Section({ title, children, first }: { title: string; children: ReactNode; first?: boolean }) {
  return (
    <section className={first ? "" : "border-t border-line pt-4"}>
      <h3 className="mb-3 text-sm font-semibold text-ink-900">{title}</h3>
      {children}
    </section>
  );
}

const dash = (v?: string | number | null) => (v === undefined || v === null || v === "" ? "—" : v);

/** The sections of a case, shared by the case pop-up on a customer and the Case Management page. */
export function CaseBody({ c }: { c: CaseDetail }) {
  return (
    <div className="flex flex-col gap-4 pb-2">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface px-4 py-3">
        <div>
          <p className="text-xs text-ink-500">Ticket ID</p>
          <p className="mt-0.5 text-base font-semibold"><CopyRef value={c.ticketId ?? ""} /></p>
        </div>
        <div className="flex flex-wrap gap-2">
          {c.statusName && <Badge tone={statusTone(c.statusName)}>{humanise(c.statusName)}</Badge>}
          {c.stateName && <Badge tone="info">{humanise(c.stateName)}</Badge>}
          {c.escalated && <Badge tone="danger">Escalated</Badge>}
        </div>
      </div>

      <Section title="Case Information" first>
        <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
          <Item label="Tracking No."><span className="tabular">{dash(c.complaintTrackingNumber)}</span></Item>
          <Item label="Category">{dash(c.categoryName)}</Item>
          <Item label="Subcategory">{dash(c.subcategoryName)}</Item>
          <Item label="Priority">{humanise(c.priorityName)}</Item>
          <Item label="Query Type">{humanise(c.queryType)}</Item>
          <Item label="Case Type">{humanise(c.caseType)}</Item>
          <Item label="Case Origin">{humanise(c.caseOrigin)}</Item>
          <Item label="Location">{dash(c.location)}</Item>
        </div>
      </Section>

      <Section title="Customer & Transaction">
        <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
          <Item label="Complainant">{dash(c.complainantName ?? c.customerDisplayName)}</Item>
          <Item label="Account No."><span className="tabular">{dash(c.maskedAccountNumber)}</span></Item>
          <Item label="Amount in Dispute"><span className="tabular">{c.amountInDispute ? formatMoney(c.amountInDispute, c.currency ?? "NGN") : "—"}</span></Item>
          <Item label="Transaction Date">{formatApiDateTime(c.transactionDate)}</Item>
          <Item label="Channel">{humanise(c.transactionChannel)}</Item>
          <Item label="Card (PAN)"><span className="tabular">{dash(c.maskedPan)}</span></Item>
          <Item label="RRN"><span className="break-all tabular">{dash(c.rrn)}</span></Item>
          <Item label="STAN / Session ID"><span className="break-all tabular">{dash(c.stanSessionId)}</span></Item>
        </div>
        {c.transactionNarration && <p className="mt-3 text-[13px] text-ink-700"><span className="text-ink-500">Narration: </span>{c.transactionNarration}</p>}
      </Section>

      <Section title="Description">
        <p className="rounded-lg bg-surface px-4 py-3 text-[13px] text-ink-900">{c.description || "No description was supplied."}</p>
      </Section>

      <Section title="SLA & Tracking">
        <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-5">
          <Item label="First Response SLA">{c.firstResponseSlaStatus ? <Badge tone={statusTone(c.firstResponseSlaStatus)}>{humanise(c.firstResponseSlaStatus)}</Badge> : "—"}</Item>
          <Item label="Resolution SLA">{c.resolutionSlaStatus ? <Badge tone={statusTone(c.resolutionSlaStatus)}>{humanise(c.resolutionSlaStatus)}</Badge> : "—"}</Item>
          <Item label="Created">{formatApiDateTime(c.createdAt)}</Item>
          <Item label="Last Updated">{formatApiDateTime(c.modifiedAt)}</Item>
          <Item label="Closed">{formatApiDateTime(c.closedAt)}</Item>
        </div>
        <p className="mt-3 text-xs text-ink-500">SLA positions are reported by CRM. The Back Office does not set its own deadline.</p>
      </Section>
    </div>
  );
}
