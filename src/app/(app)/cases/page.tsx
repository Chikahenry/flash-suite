"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Select } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/layout";
import { ErrorState } from "@/components/ui/query-state";
import { DateRangeButton, Pager } from "@/components/ui/toolbar";
import { useCases, useCaseStates } from "@/lib/bo/modules";
import { formatApiDateTime, formatMoney, humanise, statusTone } from "@/lib/bo/format";
import { useUrlState } from "@/lib/bo/use-url-state";
import type { CaseSummary } from "@/lib/bo/types";

const SIZE = 20;

const columns: Column<CaseSummary>[] = [
  { key: "ref", header: "Ticket ID", cell: (c) => <span className="whitespace-nowrap tabular">{c.ticketId}</span> },
  { key: "cat", header: "Category", cell: (c) => <span>{c.categoryName ?? "—"}{c.subcategoryName && <span className="block text-xs text-ink-500">{c.subcategoryName}</span>}</span> },
  { key: "cust", header: "Customer", cell: (c) => c.customerDisplayName ?? "—" },
  { key: "acct", header: "Account", cell: (c) => <span className="tabular">{c.maskedAccountNumber ?? "—"}</span> },
  { key: "amt", header: "Amount", cell: (c) => <span className="tabular">{c.amountInDispute ? formatMoney(c.amountInDispute, c.currency ?? "NGN") : "—"}</span> },
  { key: "created", header: "Date Created", cell: (c) => <span className="whitespace-nowrap tabular">{formatApiDateTime(c.createdAt)}</span> },
  { key: "status", header: "Status", cell: (c) => <Badge tone={statusTone(c.statusName)}>{humanise(c.statusName)}</Badge> },
  { key: "action", header: "Action", cell: (c) => <Link href={`/cases/${encodeURIComponent(c.ticketId)}`} className="inline-flex h-8 items-center whitespace-nowrap rounded-lg bg-[#f1f2f5] px-3.5 text-[13px] font-medium text-ink-900 hover:bg-line">View Details</Link> },
];

// Figma "Case Management – Cases". GET /cases (filtered and paged on the server), /cases/references/states.
// Cases are logged and handled in CRM; here they are read-only.
export default function CasesPage() {
  const router = useRouter();
  const url = useUrlState();
  const [ticket, setTicket] = useState("");
  const stateCode = url.get("state");
  const from = url.get("from");
  const to = url.get("to");

  const states = useCaseStates().data;
  const list = useCases({ stateCode, from, to, page: url.page, pageSize: SIZE });
  const rows = list.data?.items ?? [];
  const meta = list.data?.page;

  const open = (e: FormEvent) => {
    e.preventDefault();
    if (ticket.trim()) router.push(`/cases/${encodeURIComponent(ticket.trim())}`);
  };

  return (
    <>
      <PageHeader title="Case Management" description="Track complaints and service cases logged for customers in CRM" />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <form onSubmit={open} className="relative min-w-[240px] flex-1 max-w-md">
          <Search size={16} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
          <input aria-label="Open a case by Ticket ID" placeholder="Open a case by Ticket ID, then press Enter" value={ticket} onChange={(e) => setTicket(e.target.value)} className="h-10 w-full rounded-lg border border-line bg-white pl-10 pr-3 text-sm placeholder:text-ink-400 focus:outline-2 focus:outline-brand-600" />
        </form>
        <Select aria-label="Case state" value={stateCode} onChange={(e) => url.set({ state: e.target.value })} className="w-48">
          <option value="">All states</option>
          {states?.map((s) => <option key={s.code} value={s.code}>{humanise(s.name)}</option>)}
        </Select>
        <DateRangeButton from={from} to={to} onChange={(f, t) => url.set({ from: f, to: t })} />
      </div>

      {list.isError && !list.data ? (
        <ErrorState error={list.error} onRetry={() => void list.refetch()} title="Cases could not be loaded" />
      ) : (
        <DataTable
          grid
          columns={columns}
          rows={rows}
          rowKey={(c) => c.ticketId}
          loading={list.isLoading}
          empty="No case matches these filters."
          footer={<Pager page={meta?.page ?? url.page} totalPages={meta?.totalPages} total={meta?.totalCount} size={meta?.pageSize ?? SIZE} shown={rows.length} noun="cases" onPage={(p) => url.set({ page: String(p) })} />}
        />
      )}
    </>
  );
}
