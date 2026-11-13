"use client";

import { useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { Notice, PageHeader, SourceStamp, Tabs } from "@/components/ui/layout";
import { DateRangeButton, SearchField } from "@/components/ui/toolbar";
import { CaseTable } from "@/components/ops/tables";
import { cases } from "@/lib/api";
import { SourceBanner } from "@/components/ui/source-banner";

type Tab = "active" | "resolved" | "cancelled";
const STATUSES = ["New", "In Progress", "Escalated"];

// Figma "Case Management – Cases": title and subtitle, green action top right, Active / Resolved /
// Cancelled tabs, search, Status and Date Range, table, pagination.
// The Figma's "Log New Case" opens CRM instead, because the BRD keeps case logging in CRM (CDS-006).
export default function CasesPage() {
  const [tab, setTab] = useState<Tab>("active");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [crm, setCrm] = useState(false);

  const inTab = (t: Tab) => cases.filter((c) => (t === "active" ? !["Resolved", "Cancelled"].includes(c.status) : t === "resolved" ? c.status === "Resolved" : c.status === "Cancelled"));
  const rows = inTab(tab).filter((c) => {
    const day = c.created.slice(0, 10);
    return `${c.ref} ${c.tracking} ${c.customer} ${c.account} ${c.txnRef ?? ""}`.toLowerCase().includes(q.toLowerCase().trim()) && (!status || c.status === status) && (!from || day >= from) && (!to || day <= to);
  });

  return (
    <>
      <PageHeader
        title="Case Management"
        description="Track complaints and service cases logged for customers"
        actions={
          <button type="button" onClick={() => setCrm(true)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent-500 px-4 text-sm font-medium text-white hover:bg-accent-600">
            <Plus size={16} aria-hidden /> Log New Case
          </button>
        }
      />
      <SourceBanner source="CRM" affects="Cases and SLA positions" />
      {crm && <div className="mb-4"><Notice tone="info" title="Cases are logged in CRM">Opening CRM to log the case. Cases cannot be created, reassigned, updated or closed in the Back Office; they appear here once CRM has them.</Notice></div>}

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="[&>div]:mb-0"><Tabs<Tab> value={tab} onChange={setTab} tabs={[{ id: "active", label: "Active" }, { id: "resolved", label: "Resolved" }, { id: "cancelled", label: "Cancelled" }]} /></div>
        <div className="min-w-[240px] flex-1"><SearchField value={q} onChange={setQ} placeholder="Search by Ticket ID or Account No." /></div>
        <label className="relative inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-white pl-3.5 pr-8 text-sm font-medium">
          <span className="sr-only">Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="appearance-none bg-transparent outline-none">
            <option value="">Status</option>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <ChevronDown size={14} aria-hidden className="pointer-events-none absolute right-3" />
        </label>
        <DateRangeButton from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
      </div>

      <CaseTable rows={rows} total={inTab(tab).length} empty="No case matches. Use Log New Case to raise one in CRM." />
      <p className="mt-3"><SourceStamp source="CRM" at="2026-11-11T12:18:00" /></p>
    </>
  );
}
