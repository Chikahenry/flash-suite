"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Field, ReadOnlyField, Select } from "@/components/ui/form";
import { DefinitionGrid, Notice, PageHeader } from "@/components/ui/layout";
import { DateRangeButton, DownloadCsvButton, FiltersButton, Pagination, SearchField, Toolbar } from "@/components/ui/toolbar";
import { Modal } from "@/components/ui/modal";
import { StepUpModal } from "@/components/requests/step-up-modal";
import { auditLog, type AuditEntry } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

const outcomeTone = { Success: "success", Failed: "danger", Denied: "warning" } as const;
const CATEGORIES: AuditEntry["category"][] = ["Sign-in", "Enquiry", "Submission", "Approval", "Processing", "Evidence", "Export", "Configuration"];

// Audit trail (BRD DRA013..015). Read-only: records cannot be changed or deleted here,
// and opening this page is itself audited. GET /audit-logs, /audit-logs/export.
export default function AuditLogsPage() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [outcome, setOutcome] = useState("");
  const [from, setFrom] = useState("");
  const [open, setOpen] = useState<AuditEntry | null>(null);
  const [stepUp, setStepUp] = useState(false);
  const [exported, setExported] = useState(false);

  const rows = auditLog.filter((a) =>
    `${a.actor} ${a.action} ${a.record} ${a.requestRef ?? ""} ${a.id}`.toLowerCase().includes(q.toLowerCase().trim()) &&
    (!category || a.category === category) && (!outcome || a.outcome === outcome) && (!from || a.at.slice(0, 10) >= from));

  // Figma "Audit Logs" columns: Time Stamp, User, Action. The record is highlighted in green,
  // and the action opens the full entry.
  const columns: Column<AuditEntry>[] = [
    { key: "at", header: "Time Stamp", className: "w-[200px]", cell: (a) => <span className="tabular">{a.at.replace("T", " ").slice(0, 16)}</span> },
    { key: "actor", header: "User", className: "w-[280px]", cell: (a) => <span>{a.actor}{a.outcome !== "Success" && <span className="ml-2"><Badge tone={outcomeTone[a.outcome]}>{a.outcome}</Badge></span>}</span> },
    { key: "action", header: "Action", cell: (a) => <button type="button" onClick={() => setOpen(a)} className="text-left hover:underline">{a.action} <span className="font-medium text-accent-700">{a.record}</span>.</button> },
  ];

  return (
    <>
      <PageHeader title="Audit Logs" />
      {exported && <div className="mb-4"><Notice tone="success">Export started with the current filters. This export is itself recorded in the audit log.</Notice></div>}
      <Toolbar actions={<DownloadCsvButton onClick={() => setStepUp(true)} />}>
        <SearchField value={q} onChange={setQ} placeholder="Search by Account No, Name" />
        <FiltersButton active={[category, outcome].filter(Boolean).length}>
          <Field label="Category" htmlFor="a-cat"><Select id="a-cat" value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All categories</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
          <Field label="Outcome" htmlFor="a-out"><Select id="a-out" value={outcome} onChange={(e) => setOutcome(e.target.value)}><option value="">All outcomes</option><option>Success</option><option>Failed</option><option>Denied</option></Select></Field>
        </FiltersButton>
        <DateRangeButton from={from} to="" onChange={(f) => setFrom(f)} />
      </Toolbar>
      <DataTable headerFill columns={columns} rows={rows} rowKey={(a) => a.id} empty="No audit record matches these filters." footer={<Pagination shown={rows.length} total={auditLog.length} noun="entries" />} />

      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.action ?? ""} description={open ? `${open.id} · ${formatDateTime(open.at)}` : undefined} footer={<Button variant="secondary" onClick={() => setOpen(null)}>Close</Button>}>
        {open && (
          <div className="flex flex-col gap-4">
            <DefinitionGrid cols={2}>
              <ReadOnlyField label="User" value={open.actor} />
              <ReadOnlyField label="Role" value={open.role} />
              <ReadOnlyField label="Team or branch" value={open.branch} />
              <ReadOnlyField label="Outcome" value={<Badge tone={outcomeTone[open.outcome]}>{open.outcome}</Badge>} />
              <ReadOnlyField label="Affected record" value={open.record} />
              <ReadOnlyField label="Request" value={open.requestRef ? <Link href={`/requests/${open.requestRef}`} className="tabular text-brand-700 hover:underline">{open.requestRef}</Link> : "None"} />
            </DefinitionGrid>
            {(open.before || open.after) && (
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-line p-3 text-sm">
                <div><p className="text-xs text-ink-500">Previous value</p><p className="mt-1">{open.before ?? "None"}</p></div>
                <div><p className="text-xs text-ink-500">Resulting value</p><p className="mt-1 font-medium">{open.after ?? "None"}</p></div>
              </div>
            )}
            {open.reason && <div><p className="text-xs text-ink-500">Reason</p><p className="mt-1 text-sm">{open.reason}</p></div>}
          </div>
        )}
      </Modal>
      <StepUpModal open={stepUp} onClose={() => setStepUp(false)} onVerified={() => { setStepUp(false); setExported(true); }} actionLabel="export the audit log" />
    </>
  );
}
