"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Copy, ExternalLink, FileText, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/layout";
import { Modal } from "@/components/ui/modal";
import { transactions, type CrmCase } from "@/lib/api";
import { formatDate, formatNaira, type Tone } from "@/lib/format";

const slaTone: Record<string, Tone> = { Met: "success", "On track": "success", Pending: "neutral", "Nearing breach": "warning", Breached: "danger" };
const slaLabel: Record<string, string> = { Met: "Succeeded", "On track": "On track", Pending: "Pending", "Nearing breach": "Nearing Breach", Breached: "Breached" };

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs text-ink-500">{label}</p>
      <div className="mt-1 text-[13px] font-medium text-ink-900">{children}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line pt-4">
      <h3 className="mb-3 text-sm font-semibold text-ink-900">{title}</h3>
      {children}
    </section>
  );
}

const time = (iso: string) => `${formatDate(iso)} · ${iso.slice(11, 16)}`;

/**
 * Figma "Case Management – Case Details": ticket header with status chips, then Case Information,
 * Customer & Transaction, Description and SLA & Tracking, with Close and Refresh Status.
 * Read-only (BRD CDS-006). GET /cases/{crmRef}; SLA values are shown as CRM reports them.
 */
export function CaseDetailsModal({ crmCase: c, onClose }: { crmCase: CrmCase | null; onClose: () => void }) {
  const [refreshed, setRefreshed] = useState<"idle" | "ok" | "failed">("idle");
  const [copied, setCopied] = useState(false);
  const close = () => { setRefreshed("idle"); setCopied(false); onClose(); };

  if (!c) return <Modal open={false} onClose={close} title="">{null}</Modal>;
  const txn = transactions.find((t) => t.ref === c.txnRef);
  const stages: CrmCase["status"][] = ["New", "In Progress", "Escalated"];
  const closed = c.status === "Resolved" || c.status === "Cancelled";

  return (
    <Modal
      open
      onClose={close}
      size="lg"
      title="Case Details"
      footer={
        <>
          <Link href={`/cases/${c.ref}`} className="mr-auto inline-flex h-10 items-center gap-2 text-[13px] font-medium text-brand-700 hover:underline"><ExternalLink size={14} aria-hidden /> Open in CRM</Link>
          <button type="button" onClick={close} className="h-10 rounded-lg px-4 text-sm font-medium text-ink-900 hover:bg-surface">Close</button>
          <button type="button" onClick={() => setRefreshed(c.refreshFailed ? "failed" : "ok")} className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent-500 px-4 text-sm font-medium text-white hover:bg-accent-600"><RefreshCw size={15} aria-hidden /> Refresh Status</button>
        </>
      }
    >
      <div className="flex flex-col gap-4 pb-2">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface px-4 py-3">
          <div>
            <p className="text-xs text-ink-500">Ticket ID</p>
            <p className="mt-0.5 flex items-center gap-2 text-base font-semibold tabular">
              {c.ref}
              <button type="button" aria-label="Copy ticket ID" title={copied ? "Copied" : "Copy"} onClick={() => { navigator.clipboard?.writeText(c.ref); setCopied(true); }} className="text-ink-500 hover:text-ink-900"><Copy size={14} /></button>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {closed
              ? <Badge tone={c.status === "Resolved" ? "success" : "neutral"}>{c.status}</Badge>
              : stages.map((s) => <span key={s} className={s === c.status ? "" : "opacity-45"}><Badge tone={s === "New" ? "neutral" : s === "In Progress" ? "info" : "danger"}>{s === "New" ? "Active" : s}</Badge></span>)}
          </div>
        </div>

        {refreshed === "ok" && <Notice tone="success">Status refreshed from CRM just now. No change.</Notice>}
        {(refreshed === "failed" || (c.refreshFailed && refreshed === "idle")) && <Notice tone="warning" title="Not refreshed">CRM did not answer. Showing information confirmed at {time(c.updated)}.</Notice>}

        <section>
          <h3 className="mb-3 text-sm font-semibold text-ink-900">Case Information</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
            <Item label="Tracking No."><span className="tabular">{c.tracking}</span></Item>
            <Item label="Category">{c.category}</Item>
            <Item label="Subcategory">{c.subcategory}</Item>
            <Item label="Priority">{c.status === "Escalated" ? "High" : "Normal"}</Item>
            <Item label="Query Type">Complaint</Item>
            <Item label="Case Type">Complaints</Item>
            <Item label="Case Origin">Complaint Channel</Item>
            <Item label="Assigned Team">{c.team}</Item>
          </div>
        </section>

        <Section title="Customer & Transaction">
          <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
            <Item label="Complainant"><Link href={`/customers/${c.cif}`} className="text-brand-700 hover:underline">{c.customer}</Link></Item>
            <Item label="Account No."><span className="tabular">{c.account}</span></Item>
            <Item label="Amount in Dispute"><span className="tabular">{c.amount ? formatNaira(c.amount) : "—"}</span></Item>
            <Item label="Transaction Date">{txn ? time(txn.date) : "—"}</Item>
            <Item label="Channel">{txn?.channel ?? "—"}</Item>
            <Item label="Transaction Ref">{txn ? <Link href={`/transactions/${txn.ref}`} className="break-all tabular text-brand-700 hover:underline">{txn.ref}</Link> : "—"}</Item>
            <Item label="Core Ref"><span className="tabular">{txn?.coreRef ?? "—"}</span></Item>
            <Item label="STAN / Session ID"><span className="break-all tabular">{txn?.sessionId ?? "—"}</span></Item>
          </div>
        </Section>

        <Section title="Description">
          <p className="rounded-lg bg-surface px-4 py-3 text-[13px] text-ink-900">{c.description}</p>
          {c.resolution && <p className="mt-3 rounded-lg bg-accent-50 px-4 py-3 text-[13px] text-ink-900"><span className="font-semibold text-accent-700">Resolution: </span>{c.resolution}</p>}
        </Section>

        {c.evidence.length > 0 && (
          <Section title="Evidence">
            <ul className="grid gap-2 sm:grid-cols-2">
              {c.evidence.map((e) => (
                <li key={e.name} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-[13px]">
                  <FileText size={15} aria-hidden className="text-ink-500" />
                  <span className="flex-1 truncate">{e.name}</span>
                  {e.available ? <button type="button" className="font-medium text-brand-700 hover:underline">View</button> : <Badge tone="warning">Unavailable</Badge>}
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section title="SLA & Tracking">
          <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
            <Item label="First Response SLA"><Badge tone={slaTone[c.slaFirst]}>{slaLabel[c.slaFirst]}</Badge></Item>
            <Item label="Resolution SLA"><Badge tone={slaTone[c.slaResolution]}>{slaLabel[c.slaResolution]}</Badge></Item>
            <Item label="Created">{time(c.created)}</Item>
            <Item label="Last Updated">{time(c.updated)}</Item>
          </div>
        </Section>
      </div>
    </Modal>
  );
}
