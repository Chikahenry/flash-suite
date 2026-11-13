"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, CircleUserRound, FileText, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Field, Select } from "@/components/ui/form";
import { PageHeader, Tabs } from "@/components/ui/layout";
import { DateRangeButton, FiltersButton, Pagination, SearchField } from "@/components/ui/toolbar";
import { RequestDetailsModal } from "@/components/requests/request-details-modal";
import { RequestStatusBadge } from "@/components/requests/request-bits";
import { getSession, isOpen, isOverdue, listRequests } from "@/lib/api";
import { formatDate, requestStatusLabel } from "@/lib/format";
import { activeFilterCount, applyFilters, inScope, parseFilters, type RequestFilters, type Scope } from "@/lib/request-filters";
import type { BackOfficeRequest, RequestStatus } from "@/lib/types";

type Tab = "customer" | "users";
type Queue = "approvals" | "mine" | "all" | "history";

const baseColumns: Column<BackOfficeRequest>[] = [
  { key: "ref", header: "Ref ID", icon: FileText, cell: (r) => <span className="inline-flex items-center gap-2 whitespace-nowrap tabular"><FileText size={14} aria-hidden className="text-ink-500" />{r.ref}</span> },
  { key: "type", header: "Type", icon: Layers, cell: (r) => r.action },
  { key: "customer", header: "Customer", icon: CircleUserRound, cell: (r) => <span className="inline-flex items-center gap-2"><CircleUserRound size={14} aria-hidden className="text-ink-500" />{r.target}</span> },
  { key: "date", header: "Date", icon: CalendarDays, cell: (r) => <span className="whitespace-nowrap tabular">{formatDate(r.submittedAt)}</span> },
  { key: "status", header: "Status", cell: (r) => <span className="inline-flex items-center gap-2"><RequestStatusBadge status={r.status} />{isOverdue(r) && <Badge tone="danger">Overdue</Badge>}</span> },
];

const uniq = (v: (string | undefined)[]) => [...new Set(v.filter((x): x is string => !!x))].sort();

// Figma "Approvals": "Approval Queue" title, Customer / Users tabs on the left, search, Filters and
// Date Range on the right, then a selectable table. GET /requests.
// Filters, scope and queue live in the address bar, so opening a request and coming back keeps them,
// and a dashboard count opens exactly the list it counted (BRD DRA004, DRA008).
export default function RequestsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const session = getSession();
  const all = listRequests();

  const filters = useMemo(() => parseFilters((k) => params.get(k)), [params]);
  const scope = (params.get("scope") as Scope | null) ?? "all";
  const queue = ((params.get("queue") ?? (params.get("tab") === "mine" ? "mine" : "all")) as Queue);

  const [tab, setTab] = useState<Tab>(filters.module === "Staff access" ? "users" : "customer");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [open, setOpen] = useState<BackOfficeRequest | null>(null);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value); else next.delete(key);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };
  const set = (key: keyof RequestFilters) => (e: { target: { value: string } }) => setParam(key, e.target.value);

  const scoped = useMemo(() => applyFilters(all.filter((r) => inScope(r, scope, session)), filters), [all, scope, session, filters]);
  const inTab = scoped.filter((r) => (tab === "users" ? r.module === "Staff access" : r.module !== "Staff access"));
  const rows = inTab.filter((r) => {
    const inQueue = queue === "approvals" ? r.status === "PENDING_APPROVAL" && r.maker !== session.name : queue === "mine" ? r.maker === session.name : queue === "history" ? !isOpen(r) : true;
    return inQueue && `${r.ref} ${r.action} ${r.target} ${r.maker}`.toLowerCase().includes(q.toLowerCase().trim());
  });

  const columns: Column<BackOfficeRequest>[] = [
    ...baseColumns.map((c) => (c.key === "customer" && tab === "users" ? { ...c, header: "User" } : c)),
    { key: "action", header: "Action", cell: (r) => <button type="button" onClick={() => setOpen(r)} className="inline-flex h-8 items-center whitespace-nowrap rounded-lg bg-[#f1f2f5] px-3.5 text-[13px] font-medium text-ink-900 hover:bg-line">View Details</button> },
  ];

  const extra = (queue !== "all" ? 1 : 0) + (scope !== "all" ? 1 : 0);

  return (
    <>
      <PageHeader title="Approval Queue" />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="[&>div]:mb-0"><Tabs<Tab> value={tab} onChange={setTab} tabs={[{ id: "customer", label: "Customer", count: scoped.filter((r) => r.module !== "Staff access").length }, { id: "users", label: "Users", count: scoped.filter((r) => r.module === "Staff access").length }]} /></div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="w-[318px]"><SearchField value={q} onChange={setQ} placeholder="Search by Account No, Name" /></div>
          <FiltersButton active={activeFilterCount(filters) - (filters.from ? 1 : 0) - (filters.to ? 1 : 0) + extra}>
            <Field label="Queue" htmlFor="rq-queue">
              <Select id="rq-queue" value={queue} onChange={(e) => setParam("queue", e.target.value === "all" ? "" : e.target.value)}>
                <option value="all">All requests</option>
                <option value="approvals">Awaiting my approval</option>
                <option value="mine">My submissions</option>
                <option value="history">Completed history</option>
              </Select>
            </Field>
            <Field label="Scope" htmlFor="rq-scope">
              <Select id="rq-scope" value={scope} onChange={(e) => setParam("scope", e.target.value === "all" ? "" : e.target.value)}>
                <option value="all">All visible requests</option>
                <option value="team">My team</option>
                <option value="mine">My work</option>
              </Select>
            </Field>
            <Field label="Status" htmlFor="rq-status">
              <Select id="rq-status" value={filters.status} onChange={set("status")}>
                <option value="">All statuses</option>
                {(Object.keys(requestStatusLabel) as RequestStatus[]).map((s) => <option key={s} value={s}>{requestStatusLabel[s]}</option>)}
              </Select>
            </Field>
            <Field label="Branch" htmlFor="rq-branch"><Select id="rq-branch" value={filters.branch} onChange={set("branch")}><option value="">All branches</option>{uniq(all.map((r) => r.branch)).map((b) => <option key={b}>{b}</option>)}</Select></Field>
            <Field label="Module" htmlFor="rq-module"><Select id="rq-module" value={filters.module} onChange={set("module")}><option value="">All modules</option>{uniq(all.map((r) => r.module)).map((b) => <option key={b}>{b}</option>)}</Select></Field>
            <Field label="Maker" htmlFor="rq-maker"><Select id="rq-maker" value={filters.maker} onChange={set("maker")}><option value="">Any maker</option>{uniq(all.map((r) => r.maker)).map((b) => <option key={b}>{b}</option>)}</Select></Field>
            <Field label="Checker" htmlFor="rq-checker"><Select id="rq-checker" value={filters.checker} onChange={set("checker")}><option value="">Any checker</option>{uniq(all.map((r) => r.checker)).map((b) => <option key={b}>{b}</option>)}</Select></Field>
          </FiltersButton>
          <DateRangeButton from={filters.from} to={filters.to} onChange={(f, t) => { const next = new URLSearchParams(params.toString()); if (f) next.set("from", f); else next.delete("from");
            if (t) next.set("to", t); else next.delete("to"); router.replace(`${pathname}?${next.toString()}`, { scroll: false }); }} />
        </div>
      </div>

      <DataTable
        grid
        columns={columns}
        rows={rows}
        rowKey={(r) => r.ref}
        selectable={{ selected, onChange: setSelected }}
        empty={tab === "users" ? "No staff-access request matches these filters." : "No request matches these filters."}
        footer={<Pagination shown={rows.length} total={inTab.length} noun="requests" />}
      />
      <RequestDetailsModal request={open} onClose={() => setOpen(null)} />
      <p className="mt-3 text-xs text-ink-500"><Link href="/dashboard" className="text-brand-700 hover:underline">Back to the dashboard</Link></p>
    </>
  );
}
