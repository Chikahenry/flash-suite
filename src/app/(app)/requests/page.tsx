"use client";

import { useState } from "react";
import { CalendarDays, CircleUserRound, FileText, Layers } from "lucide-react";
import { ApprovalPanel } from "@/components/approvals/approval-panel";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Field, Select } from "@/components/ui/form";
import { Notice, PageHeader } from "@/components/ui/layout";
import { RefreshButton } from "@/components/ui/refresh-button";
import { Modal } from "@/components/ui/modal";
import { ErrorState } from "@/components/ui/query-state";
import { DateRangeButton, FiltersButton, Pager, SearchField, Toolbar } from "@/components/ui/toolbar";
import { formatApiDateTime, formatMoney, humanise, statusTone } from "@/lib/bo/format";
import { useApprovalCounts, useApprovalOptions, useApprovals, type ApprovalRequest } from "@/lib/bo/ops";
import { useUrlState } from "@/lib/bo/use-url-state";

const SIZE = 20;

// Approval queue (maker-checker). GET /approval-requests, /approval-requests/filter-options and /counts;
// decisions are POST /approval-requests/{id}/approve|reject|return-to-maker|resubmit|cancel.
// Filters and page live in the address bar, so a dashboard count opens exactly the list it counted.
export default function RequestsPage() {
  const url = useUrlState();
  const status = url.get("status");
  const type = url.get("type");
  const maker = url.get("maker");
  const from = url.get("from");
  const to = url.get("to");
  const options = useApprovalOptions();
  const counts = useApprovalCounts();
  const list = useApprovals({ status, type, maker, from, to, page: url.page, size: SIZE });
  const [open, setOpen] = useState<ApprovalRequest | null>(null);
  const [done, setDone] = useState<string | null>(null);

  // The API has no free-text search, so the box narrows the rows already loaded on this page.
  const needle = url.search.value.toLowerCase().trim();
  const rows = (list.data?.data ?? []).filter((r) => !needle || `${r.reference} ${r.requestId} ${r.type} ${r.makerUsername}`.toLowerCase().includes(needle));
  const meta = list.data?.page;

  const columns: Column<ApprovalRequest>[] = [
    { key: "ref", header: "Ref ID", icon: FileText, cell: (r) => <span className="inline-flex items-center gap-2 whitespace-nowrap tabular"><FileText size={14} aria-hidden className="text-ink-500" />{r.reference ?? r.requestId ?? r.id}</span> },
    { key: "type", header: "Type", icon: Layers, cell: (r) => humanise(r.type) },
    { key: "maker", header: "Maker", icon: CircleUserRound, cell: (r) => r.makerUsername ?? "—" },
    { key: "amt", header: "Amount", align: "right", cell: (r) => r.amount === undefined ? "—" : <span className="tabular">{formatMoney(r.amount)}</span> },
    { key: "date", header: "Date", icon: CalendarDays, cell: (r) => <span className="whitespace-nowrap tabular">{formatApiDateTime(r.createdAt)}</span> },
    { key: "status", header: "Status", cell: (r) => <Badge tone={statusTone(r.status)}>{humanise(r.status)}</Badge> },
    { key: "action", header: "Action", cell: (r) => <button type="button" onClick={() => setOpen(r)} className="inline-flex h-8 items-center whitespace-nowrap rounded-lg bg-[#f1f2f5] px-3.5 text-[13px] font-medium text-ink-900 hover:bg-line">View Details</button> },
  ];

  return (
    <>
      <PageHeader title="Approval Queue" actions={<RefreshButton />} />
      {done && <div className="mb-4"><Notice tone="success">{done}</Notice></div>}
      {(counts.data ?? []).length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {(counts.data ?? []).map((c) => (
            <button key={c.status} type="button" onClick={() => url.set({ status: status === c.status ? "" : c.status })}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[13px] ${status === c.status ? "border-accent-500 bg-accent-50 text-accent-700" : "border-line text-ink-700 hover:bg-surface"}`}>
              {humanise(c.status)} <span className="tabular font-semibold">{c.count}</span>
            </button>
          ))}
        </div>
      )}
      <Toolbar>
        <SearchField value={url.search.value} onChange={url.search.onChange} placeholder="Search this page by reference or maker" />
        <FiltersButton active={[status, type, maker].filter(Boolean).length}>
          <Field label="Status" htmlFor="rq-status"><Select id="rq-status" value={status} onChange={(e) => url.set({ status: e.target.value })}><option value="">All statuses</option>{(options.data?.statuses ?? []).map((s) => <option key={s} value={s}>{humanise(s)}</option>)}</Select></Field>
          <Field label="Type" htmlFor="rq-type"><Select id="rq-type" value={type} onChange={(e) => url.set({ type: e.target.value })}><option value="">All types</option>{(options.data?.types ?? []).map((s) => <option key={s} value={s}>{humanise(s)}</option>)}</Select></Field>
          <Field label="Maker" htmlFor="rq-maker"><input id="rq-maker" defaultValue={maker} placeholder="Username" className="h-10 w-full rounded-lg border border-line px-3 text-sm" onBlur={(e) => url.set({ maker: e.target.value.trim() })} onKeyDown={(e) => e.key === "Enter" && url.set({ maker: e.currentTarget.value.trim() })} /></Field>
        </FiltersButton>
        <DateRangeButton from={from} to={to} onChange={(a, b) => url.set({ from: a, to: b })} />
      </Toolbar>

      {list.isError && !list.data ? <ErrorState error={list.error} onRetry={() => void list.refetch()} title="Requests could not be loaded" /> : (
        <DataTable grid columns={columns} rows={rows} rowKey={(r) => String(r.id)} loading={list.isLoading} empty="No request matches these filters."
          footer={<Pager page={meta?.page ?? url.page} totalPages={meta?.totalPages} total={meta?.total} size={meta?.size ?? SIZE} shown={rows.length} noun="requests" onPage={(p) => url.set({ page: String(p) })} />} />
      )}

      <Modal open={!!open} onClose={() => setOpen(null)} title="Request details" description={open ? String(open.reference ?? open.requestId ?? open.id) : undefined}>
        {open && <ApprovalPanel id={open.id} onChanged={(m) => { setDone(m); setOpen(null); }} />}
      </Modal>
    </>
  );
}
