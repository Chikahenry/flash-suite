"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Field, Input, Select } from "@/components/ui/form";
import { Notice, PageHeader } from "@/components/ui/layout";
import { ErrorState } from "@/components/ui/query-state";
import { DateRangeButton, DownloadCsvButton, FiltersButton, Pager, SearchField, Toolbar } from "@/components/ui/toolbar";
import { downloadFile } from "@/lib/bo/download";
import { formatApiDateTime, formatMoney, humanise, statusTone } from "@/lib/bo/format";
import { transactionQuery, useTransactionOptions, useTransactions, type TransactionRow } from "@/lib/bo/ops";
import { useUrlState } from "@/lib/bo/use-url-state";

const SIZE = 20;

const columns: Column<TransactionRow>[] = [
  { key: "ref", header: "Reference", cell: (t) => <Link href={`/transactions/${encodeURIComponent(t.id)}`} className="whitespace-nowrap tabular font-medium text-brand-700 hover:underline">{t.reference ?? t.id}</Link> },
  { key: "type", header: "Type", cell: (t) => humanise(t.type) },
  { key: "acct", header: "Account", cell: (t) => <span><span className="tabular">{t.sourceAccount ?? "—"}</span><span className="block text-xs text-ink-500">{t.sourceAccountName}</span></span> },
  { key: "ch", header: "Channel", cell: (t) => humanise(t.channel) },
  { key: "amt", header: "Amount", align: "right", cell: (t) => <span className="tabular">{formatMoney(t.amount, t.currency ?? "NGN")}</span> },
  { key: "maker", header: "Initiated by", cell: (t) => t.makerUsername ?? "—" },
  { key: "date", header: "Date", cell: (t) => <span className="whitespace-nowrap tabular">{formatApiDateTime(t.createdAt)}</span> },
  { key: "status", header: "Status", cell: (t) => <Badge tone={statusTone(t.status)}>{humanise(t.status)}</Badge> },
];

// Transaction enquiry (BRD TMM-001..012). Read-only: no retry, no status change, no adjustment.
// GET /transactions, /transactions/filter-options and /transactions/export, searched, filtered and paged on the server.
export default function TransactionsPage() {
  const url = useUrlState();
  const f = { status: url.get("status"), channel: url.get("channel"), type: url.get("type"), account: url.get("account"), minAmount: url.get("min"), maxAmount: url.get("max"), from: url.get("from"), to: url.get("to") };
  const options = useTransactionOptions();
  const list = useTransactions({ search: url.get("q") || undefined, ...f, page: url.page, size: SIZE });
  const rows = list.data?.data ?? [];
  const meta = list.data?.page;
  const [exportMsg, setExportMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  const exportCsv = async () => {
    setExportMsg(null);
    const err = await downloadFile("/transactions/export", { search: url.get("q") || undefined, ...transactionQuery(f) } as Record<string, string | undefined>, "transactions.csv");
    setExportMsg(err ? { tone: "danger", text: err } : { tone: "success", text: "Export downloaded. The download is recorded in the audit log." });
  };

  const opts = options.data;
  const apply = (key: string) => (e: { target: { value: string } }) => url.set({ [key]: e.target.value });

  return (
    <>
      <PageHeader title="Transactions" />
      {exportMsg && <div className="mb-4"><Notice tone={exportMsg.tone}>{exportMsg.text}</Notice></div>}
      <Toolbar actions={<DownloadCsvButton onClick={() => void exportCsv()} />}>
        <SearchField value={url.search.value} onChange={url.search.onChange} placeholder="Search by reference or account" />
        <FiltersButton active={[f.channel, f.type, f.status, f.account, f.minAmount, f.maxAmount].filter(Boolean).length}>
          <Field label="Channel" htmlFor="t-ch"><Select id="t-ch" value={f.channel} onChange={apply("channel")}><option value="">All channels</option>{(opts?.channels ?? []).map((c) => <option key={c} value={c}>{humanise(c)}</option>)}</Select></Field>
          <Field label="Type" htmlFor="t-ty"><Select id="t-ty" value={f.type} onChange={apply("type")}><option value="">All types</option>{(opts?.types ?? []).map((c) => <option key={c} value={c}>{humanise(c)}</option>)}</Select></Field>
          <Field label="Status" htmlFor="t-st"><Select id="t-st" value={f.status} onChange={apply("status")}><option value="">All statuses</option>{(opts?.statuses ?? []).map((c) => <option key={c} value={c}>{humanise(c)}</option>)}</Select></Field>
          <Field label="Account number" htmlFor="t-ac"><Input id="t-ac" defaultValue={f.account} onBlur={(e) => url.set({ account: e.target.value.trim() })} onKeyDown={(e) => e.key === "Enter" && url.set({ account: e.currentTarget.value.trim() })} /></Field>
          <Field label="Minimum amount" htmlFor="t-min"><Input id="t-min" inputMode="decimal" defaultValue={f.minAmount} onBlur={(e) => url.set({ min: e.target.value.replace(/[^\d.]/g, "") })} /></Field>
          <Field label="Maximum amount" htmlFor="t-max"><Input id="t-max" inputMode="decimal" defaultValue={f.maxAmount} onBlur={(e) => url.set({ max: e.target.value.replace(/[^\d.]/g, "") })} /></Field>
        </FiltersButton>
        <DateRangeButton from={f.from} to={f.to} onChange={(a, b) => url.set({ from: a, to: b })} />
      </Toolbar>

      {list.isError && !list.data ? <ErrorState error={list.error} onRetry={() => void list.refetch()} title="Transactions could not be loaded" /> : (
        <DataTable grid columns={columns} rows={rows} rowKey={(t) => t.id} loading={list.isLoading} empty="No transaction matches these filters."
          footer={<Pager page={meta?.page ?? url.page} totalPages={meta?.totalPages} total={meta?.total} size={meta?.size ?? SIZE} shown={rows.length} noun="transactions" onPage={(p) => url.set({ page: String(p) })} />} />
      )}
    </>
  );
}
