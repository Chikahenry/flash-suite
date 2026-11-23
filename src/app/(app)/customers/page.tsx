"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, CircleUserRound, Hash, Mail, Phone, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Field, Select } from "@/components/ui/form";
import { Notice, PageHeader } from "@/components/ui/layout";
import { RefreshButton } from "@/components/ui/refresh-button";
import { ErrorState } from "@/components/ui/query-state";
import { DateRangeButton, DownloadCsvButton, FiltersButton, Pager, SearchField, Toolbar } from "@/components/ui/toolbar";
import { useCustomerFilterOptions, useCustomers } from "@/lib/bo/customers";
import { downloadFile } from "@/lib/bo/download";
import { formatApiDate, humanise, statusTone } from "@/lib/bo/format";
import type { CustomerSummary } from "@/lib/bo/types";

const SIZE = 20;

const columns: Column<CustomerSummary>[] = [
  { key: "name", header: "Customer / Organisation", icon: CircleUserRound, cell: (c) => <span className="font-medium">{c.displayName || "—"}</span> },
  { key: "id", header: "Customer ID", icon: Hash, cell: (c) => <span className="whitespace-nowrap tabular">{c.customerId}</span> },
  { key: "phone", header: "Phone", icon: Phone, cell: (c) => <span className="whitespace-nowrap tabular">{c.phone || "—"}</span> },
  { key: "email", header: "Email", icon: Mail, cell: (c) => <span className="break-all">{c.email || "—"}</span> },
  {
    key: "kyc", header: "KYC", icon: ShieldCheck,
    cell: (c) => (
      <span className="inline-flex items-center gap-2 whitespace-nowrap">
        {c.kycTier !== undefined && <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-xs font-medium text-brand-800">Tier {c.kycTier}</span>}
        <span className="text-ink-700">{humanise(c.kycStatus)}</span>
      </span>
    ),
  },
  { key: "status", header: "Status", cell: (c) => <Badge tone={statusTone(c.retailStatus)}>{humanise(c.retailStatus)}</Badge> },
  { key: "created", header: "Created", icon: CalendarDays, cell: (c) => <span className="whitespace-nowrap tabular">{formatApiDate(c.createdAt)}</span> },
  {
    key: "action", header: "Action",
    cell: (c) => (
      <Link href={`/customers/${encodeURIComponent(c.customerId)}`} className="inline-flex h-8 items-center whitespace-nowrap rounded-lg bg-[#f1f2f5] px-3.5 text-[13px] font-medium text-ink-900 hover:bg-line">View Details</Link>
    ),
  },
];

// Figma "Customers": title, search, Filters, Date Range, Download as CSV and a table of customers.
// GET /customers (searched, filtered and paged on the server), /customers/filter-options, /customers/export.
// Search, filters and page live in the address bar, so going into a customer and back keeps your place.
export default function CustomersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const page = Math.max(1, Number(params.get("page")) || 1);
  const search = params.get("q") ?? "";
  const status = params.get("status") ?? "";
  const kycStatus = params.get("kycStatus") ?? "";
  const kycTier = params.get("kycTier") ?? "";
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";

  const setParams = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!("page" in patch)) next.delete("page"); // any filter change goes back to page 1
    const text = next.toString();
    router.replace(text ? `${pathname}?${text}` : pathname, { scroll: false });
  };

  const [text, setText] = useState(search);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const onSearch = (value: string) => {
    setText(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setParams({ q: value.trim() }), 400);
  };

  const [selected, setSelected] = useState<string[]>([]);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const filterOptions = useCustomerFilterOptions().data;
  const list = useCustomers({ search, status, kycStatus, kycTier, createdFrom: from, createdTo: to, page, size: SIZE });
  const rows = list.data?.data ?? [];
  const meta = list.data?.page;

  const exportCsv = async () => {
    setExporting(true);
    setExportError(null);
    setExportError(await downloadFile("/customers/export", { search, status, kycStatus, kycTier, createdFrom: from, createdTo: to }, "customers.csv"));
    setExporting(false);
  };

  const activeFilters = [status, kycStatus, kycTier].filter(Boolean).length;

  return (
    <>
      <PageHeader title="Customers" actions={<RefreshButton />} />
      {exportError && <div className="mb-4"><Notice tone="danger" title="Export failed">{exportError}</Notice></div>}

      <Toolbar actions={<DownloadCsvButton onClick={() => void exportCsv()} label={exporting ? "Preparing…" : "Download as CSV"} />}>
        <SearchField value={text} onChange={onSearch} placeholder="Search by name, phone or email" />
        <FiltersButton active={activeFilters}>
          <Field label="Status" htmlFor="f-status">
            <Select id="f-status" value={status} onChange={(e) => setParams({ status: e.target.value })}>
              <option value="">All statuses</option>
              {filterOptions?.statuses?.map((s) => <option key={s} value={s}>{humanise(s)}</option>)}
            </Select>
          </Field>
          <Field label="KYC status" htmlFor="f-kyc">
            <Select id="f-kyc" value={kycStatus} onChange={(e) => setParams({ kycStatus: e.target.value })}>
              <option value="">All KYC statuses</option>
              {filterOptions?.kycStatuses?.map((s) => <option key={s} value={s}>{humanise(s)}</option>)}
            </Select>
          </Field>
          <Field label="KYC tier" htmlFor="f-tier">
            <Select id="f-tier" value={kycTier} onChange={(e) => setParams({ kycTier: e.target.value })}>
              <option value="">All tiers</option>
              {filterOptions?.kycTiers?.map((t) => <option key={t} value={t}>Tier {t}</option>)}
            </Select>
          </Field>
        </FiltersButton>
        <DateRangeButton from={from} to={to} onChange={(f, t) => setParams({ from: f, to: t })} />
      </Toolbar>

      {list.isError && !list.data ? (
        <ErrorState error={list.error} onRetry={() => void list.refetch()} title="Customers could not be loaded" />
      ) : (
        <DataTable
          grid
          columns={columns}
          rows={rows}
          rowKey={(c) => c.customerId}
          loading={list.isLoading}
          selectable={{ selected, onChange: setSelected }}
          empty="No customer matches. Check the spelling, or clear the filters."
          footer={
            <Pager
              page={meta?.page ?? page}
              totalPages={meta?.totalPages}
              total={meta?.total}
              size={meta?.size ?? SIZE}
              shown={rows.length}
              noun="customers"
              onPage={(p) => setParams({ page: String(p) })}
            />
          }
        />
      )}
    </>
  );
}
