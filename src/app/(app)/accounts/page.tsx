"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Field, Input, Select } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/layout";
import { ErrorState } from "@/components/ui/query-state";
import { FiltersButton, Pager, SearchField, Toolbar } from "@/components/ui/toolbar";
import { formatMoney, humanise, statusTone } from "@/lib/bo/format";
import { useAccounts, type AccountItem } from "@/lib/bo/modules";
import { useUrlState } from "@/lib/bo/use-url-state";

const SIZE = 20;

const columns: Column<AccountItem>[] = [
  { key: "acct", header: "Account", cell: (a) => <span><span className="tabular font-medium">{a.accountNumber}</span><span className="block text-xs text-ink-500">{a.accountName}</span></span> },
  { key: "cust", header: "Customer", cell: (a) => a.customerId ? <Link href={`/customers/${encodeURIComponent(a.customerId)}`} className="text-brand-700 hover:underline">{a.customerName || a.customerId}</Link> : "—" },
  { key: "tier", header: "Tier", cell: (a) => a.accountTier ?? "—" },
  { key: "ch", header: "Channel", cell: (a) => humanise(a.sourceChannel) },
  { key: "branch", header: "Branch", cell: (a) => a.branchName ?? a.branchId ?? "—" },
  { key: "bal", header: "Balance", align: "right", cell: (a) => <span className="tabular">{a.balanceAvailable === false || a.availableBalance === undefined ? "Unavailable" : formatMoney(a.availableBalance, a.currency ?? "NGN")}</span> },
  { key: "status", header: "Status", cell: (a) => <Badge tone={statusTone(a.status)}>{humanise(a.status)}</Badge> },
];

// Accounts opened through the digital channels. GET /accounts (searched, filtered and paged on the server).
export default function AccountsPage() {
  const url = useUrlState();
  const status = url.get("status");
  const tier = url.get("tier");
  const channel = url.get("channel");
  const list = useAccounts({ search: url.get("q") || undefined, status: status || undefined, accountTier: tier || undefined, sourceChannel: channel || undefined, page: url.page, size: SIZE });
  const rows = list.data?.data ?? [];
  const meta = list.data?.page;

  return (
    <>
      <PageHeader title="Accounts" description="Accounts created through the supported channels" />
      <Toolbar>
        <SearchField value={url.search.value} onChange={url.search.onChange} placeholder="Search by account number or name" />
        <FiltersButton active={[status, tier, channel].filter(Boolean).length}>
          <Field label="Status" htmlFor="ac-s"><Input id="ac-s" defaultValue={status} placeholder="e.g. ACTIVE" onBlur={(e) => url.set({ status: e.target.value.trim() })} onKeyDown={(e) => e.key === "Enter" && url.set({ status: e.currentTarget.value.trim() })} /></Field>
          <Field label="Account tier" htmlFor="ac-t"><Input id="ac-t" defaultValue={tier} onBlur={(e) => url.set({ tier: e.target.value.trim() })} onKeyDown={(e) => e.key === "Enter" && url.set({ tier: e.currentTarget.value.trim() })} /></Field>
          <Field label="Source channel" htmlFor="ac-c"><Select id="ac-c" value={channel} onChange={(e) => url.set({ channel: e.target.value })}><option value="">All channels</option><option>MOBILE</option><option>WEB</option><option>USSD</option><option>BRANCH</option></Select></Field>
        </FiltersButton>
      </Toolbar>
      {list.isError && !list.data ? <ErrorState error={list.error} onRetry={() => void list.refetch()} title="Accounts could not be loaded" /> : (
        <DataTable grid columns={columns} rows={rows} rowKey={(a) => a.accountNumber} loading={list.isLoading} empty="No account matches."
          footer={<Pager page={meta?.page ?? url.page} totalPages={meta?.totalPages} total={meta?.total} size={meta?.size ?? SIZE} shown={rows.length} noun="accounts" onPage={(p) => url.set({ page: String(p) })} />} />
      )}
    </>
  );
}
