"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Input, Select } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/layout";
import { RefreshButton } from "@/components/ui/refresh-button";
import { ErrorState } from "@/components/ui/query-state";
import { Pager } from "@/components/ui/toolbar";
import { useCustomerFilterOptions, useCustomers } from "@/lib/bo/customers";
import { formatApiDate, humanise, statusTone } from "@/lib/bo/format";
import type { CustomerSummary } from "@/lib/bo/types";

const SIZE = 20;

const columns: Column<CustomerSummary>[] = [
  {
    key: "name",
    header: "Organisation",
    cell: (o) => (
      <div>
        <Link href={`/customers/${encodeURIComponent(o.customerId)}`} className="font-medium text-brand-700 hover:underline">{o.displayName || o.customerId}</Link>
        <p className="text-xs tabular text-ink-500">CIF {o.customerId}</p>
      </div>
    ),
  },
  { key: "phone", header: "Phone", cell: (o) => <span className="whitespace-nowrap tabular">{o.phone || "—"}</span> },
  { key: "email", header: "Email", cell: (o) => <span className="break-all">{o.email || "—"}</span> },
  { key: "kyc", header: "KYC", cell: (o) => <span className="whitespace-nowrap">{o.kycTier !== undefined && `Tier ${o.kycTier} · `}{humanise(o.kycStatus)}</span> },
  { key: "status", header: "Status", cell: (o) => <Badge tone={statusTone(o.retailStatus)}>{humanise(o.retailStatus)}</Badge> },
  { key: "created", header: "Created", cell: (o) => <span className="whitespace-nowrap tabular text-ink-500">{formatApiDate(o.createdAt)}</span> },
];

// Organisation list. GET /customers: a corporate customer is an organisation, and its CIF is the customer ID.
// Search, status and page live in the address bar. Open an organisation to see its accounts, cases and actions.
export default function CorporatePage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const page = Math.max(1, Number(params.get("page")) || 1);
  const search = params.get("q") ?? "";
  const status = params.get("status") ?? "";

  const setParams = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!("page" in patch)) next.delete("page");
    const t = next.toString();
    router.replace(t ? `${pathname}?${t}` : pathname, { scroll: false });
  };

  const [text, setText] = useState(search);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const onSearch = (v: string) => {
    setText(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setParams({ q: v.trim() }), 400);
  };

  const options = useCustomerFilterOptions().data;
  const list = useCustomers({ search, status, page, size: SIZE });
  const rows = list.data?.data ?? [];
  const meta = list.data?.page;

  return (
    <>
      <PageHeader title="Corporate & SME" description="Find an organisation by name, phone or email, then open it to act on it without searching again." actions={<RefreshButton />} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="w-full max-w-sm">
          <Input aria-label="Search organisations" placeholder="Name, phone or email" value={text} onChange={(e) => onSearch(e.target.value)} icon={<Search size={16} />} />
        </div>
        <Select aria-label="Status" value={status} onChange={(e) => setParams({ status: e.target.value })} className="w-44">
          <option value="">All statuses</option>
          {options?.statuses?.map((s) => <option key={s} value={s}>{humanise(s)}</option>)}
        </Select>
      </div>

      {list.isError && !list.data ? (
        <ErrorState error={list.error} onRetry={() => void list.refetch()} title="Organisations could not be loaded" />
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(o) => o.customerId}
          loading={list.isLoading}
          empty="No organisation matches. Check the search or the status filter."
          footer={<Pager page={meta?.page ?? page} totalPages={meta?.totalPages} total={meta?.total} size={meta?.size ?? SIZE} shown={rows.length} noun="organisations" onPage={(p) => setParams({ page: String(p) })} />}
        />
      )}
    </>
  );
}
