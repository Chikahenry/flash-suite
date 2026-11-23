"use client";

import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Download, Eye, IdCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { ErrorState } from "@/components/ui/query-state";
import { Notice } from "@/components/ui/layout";
import { Pager } from "@/components/ui/toolbar";
import { CopyRef } from "@/components/ops/tables";
import { ApiCaseModal } from "@/components/cases/api-case-modal";
import { proxyUrl } from "@/lib/bo/client";
import { kycContentPath, useCustomerActivity, useCustomerCase, useCustomerCases, useCustomerTransactions, useKycDocuments } from "@/lib/bo/customers";
import { downloadFile } from "@/lib/bo/download";
import { formatApiDateTime, formatBytes, formatMoney, humanise, statusTone } from "@/lib/bo/format";
import { cn } from "@/lib/cn";
import type { CaseSummary, CustomerActivity, CustomerTransaction } from "@/lib/bo/types";

const SIZE = 10;

const txnColumns: Column<CustomerTransaction>[] = [
  {
    key: "date", header: "Date & Time",
    cell: (t) => {
      const debit = /DEBIT|OUT/i.test(t.direction ?? "");
      return (
        <span className="flex items-center gap-3">
          <span className={cn("grid size-5 place-items-center rounded border", debit ? "border-red-300 text-red-600" : "border-accent-500 text-accent-600")}>{debit ? <ArrowUpRight size={12} aria-hidden /> : <ArrowDownLeft size={12} aria-hidden />}</span>
          <span><span className="block whitespace-nowrap">{formatApiDateTime(t.createdAt)}</span><span className="block text-xs text-ink-500">{humanise(t.direction)}</span></span>
        </span>
      );
    },
  },
  { key: "amount", header: "Amount", cell: (t) => <span className="whitespace-nowrap font-medium tabular">{formatMoney(t.amount, t.currency ?? "NGN")}</span> },
  { key: "ref", header: "Reference", cell: (t) => (t.reference ? <CopyRef value={t.reference} /> : "—") },
  { key: "chref", header: "Channel Ref.", cell: (t) => (t.channelReference ? <CopyRef value={t.channelReference} /> : "—") },
  { key: "type", header: "Type", cell: (t) => humanise(t.type) },
  { key: "dest", header: "Destination", cell: (t) => <span className="tabular">{t.destinationAccount ?? "—"}</span> },
  { key: "narr", header: "Narration", cell: (t) => <span className="line-clamp-2 max-w-[220px]">{t.narration || "—"}</span> },
  { key: "status", header: "Status", cell: (t) => <Badge tone={statusTone(t.status)}>{humanise(t.status)}</Badge> },
];

export function TransactionsTab({ customerId, account }: { customerId: string; account?: string }) {
  const [page, setPage] = useState(1);
  const [prev, setPrev] = useState(account);
  if (prev !== account) { setPrev(account); setPage(1); }
  const q = useCustomerTransactions(customerId, { sourceAccount: account, page, size: SIZE });
  if (q.isError && !q.data) return <ErrorState error={q.error} onRetry={() => void q.refetch()} title="Transactions could not be loaded" />;
  const rows = q.data?.data ?? [];
  const meta = q.data?.page;
  return (
    <DataTable
      headerFill
      columns={txnColumns}
      rows={rows}
      rowKey={(t) => String(t.id)}
      loading={q.isLoading}
      empty="No transaction found on the selected account."
      footer={<Pager page={meta?.page ?? page} totalPages={meta?.totalPages} total={meta?.total} size={meta?.size ?? SIZE} shown={rows.length} noun="transactions" onPage={setPage} />}
    />
  );
}

const activityColumns: Column<CustomerActivity>[] = [
  { key: "at", header: "Date & Time", cell: (a) => <span className="whitespace-nowrap tabular">{formatApiDateTime(a.createdAt)}</span> },
  { key: "action", header: "Activity", cell: (a) => <span className="text-accent-700">{humanise(a.action)}</span> },
  { key: "ip", header: "IP Address", cell: (a) => <span className="tabular">{a.ipAddress ?? "—"}</span> },
];

export function ActivityTab({ customerId }: { customerId: string }) {
  const [page, setPage] = useState(1);
  const q = useCustomerActivity(customerId, page, SIZE);
  if (q.isError && !q.data) return <ErrorState error={q.error} onRetry={() => void q.refetch()} title="Activity could not be loaded" />;
  const rows = q.data?.data ?? [];
  const meta = q.data?.page;
  return (
    <DataTable
      headerFill
      columns={activityColumns}
      rows={rows}
      rowKey={(a) => a.id}
      loading={q.isLoading}
      empty="No activity recorded."
      footer={<Pager page={meta?.page ?? page} totalPages={meta?.totalPages} total={meta?.total} size={meta?.size ?? SIZE} shown={rows.length} noun="activities" onPage={setPage} />}
    />
  );
}

export function KycTab({ customerId }: { customerId: string }) {
  const q = useKycDocuments(customerId);
  const [error, setError] = useState<string | null>(null);
  if (q.isLoading) return <p className="text-sm text-ink-500">Loading documents…</p>;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} title="KYC documents could not be loaded" />;
  const docs = q.data ?? [];
  if (docs.length === 0) return <p className="text-sm text-ink-500">No document is on file for this customer.</p>;
  return (
    <>
      {error && <div className="mb-4"><Notice tone="danger" title="Download failed">{error}</Notice></div>}
      <ul className="grid gap-4 md:grid-cols-3">
        {docs.map((d) => {
          const path = kycContentPath(customerId, d.type);
          const image = (d.contentType ?? "").startsWith("image/") || (d.contentType ?? "") === "application/pdf";
          return (
            <li key={d.type}>
              <p className="mb-2 text-xs text-ink-500">{d.label || humanise(d.type)}</p>
              <div className="grid h-40 w-full place-items-center rounded-xl border border-line bg-surface text-ink-400"><IdCard size={36} aria-hidden /></div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="truncate text-xs text-ink-500" title={d.fileName}>{d.fileName}{d.fileSize ? ` · ${formatBytes(d.fileSize)}` : ""}</span>
                <span className="flex shrink-0 gap-1">
                  {image && <a href={proxyUrl(path)} target="_blank" rel="noopener noreferrer" aria-label={`View ${d.label ?? d.type}`} className="rounded p-1.5 text-ink-700 hover:bg-surface"><Eye size={16} /></a>}
                  <button type="button" aria-label={`Download ${d.label ?? d.type}`} onClick={async () => setError(await downloadFile(path, {}, d.fileName ?? `${d.type}`))} className="rounded p-1.5 text-ink-700 hover:bg-surface"><Download size={16} /></button>
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-xs text-ink-500">Shown from the document repository; not stored here.</p>
    </>
  );
}

export function CasesTab({ customerId, account }: { customerId: string; account?: string }) {
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const [prev, setPrev] = useState(account);
  if (prev !== account) { setPrev(account); setPage(1); setOpen(null); }
  const q = useCustomerCases(customerId, { accountNumber: account, page, pageSize: SIZE });
  const detail = useCustomerCase(customerId, open, account);

  const columns: Column<CaseSummary>[] = [
    { key: "ref", header: "Ticket ID", cell: (c) => <span className="whitespace-nowrap tabular">{c.ticketId}</span> },
    { key: "cat", header: "Category", cell: (c) => c.categoryName ?? "—" },
    { key: "acct", header: "Account", cell: (c) => <span className="tabular">{c.maskedAccountNumber ?? "—"}</span> },
    { key: "amt", header: "Amount", cell: (c) => <span className="tabular">{c.amountInDispute ? formatMoney(c.amountInDispute, c.currency ?? "NGN") : "—"}</span> },
    { key: "created", header: "Date Created", cell: (c) => <span className="whitespace-nowrap tabular">{formatApiDateTime(c.createdAt)}</span> },
    { key: "status", header: "Status", cell: (c) => <Badge tone={statusTone(c.statusName)}>{humanise(c.statusName)}</Badge> },
    { key: "action", header: "Action", cell: (c) => <button type="button" onClick={() => setOpen(c.ticketId)} className="inline-flex h-8 items-center whitespace-nowrap rounded-lg bg-[#f1f2f5] px-3.5 text-[13px] font-medium text-ink-900 hover:bg-line">View Details</button> },
  ];

  if (!account) return <p className="text-sm text-ink-500">Select an account above to view its cases.</p>;
  if (q.isError && !q.data) return <ErrorState error={q.error} onRetry={() => void q.refetch()} title="Cases could not be loaded" />;
  const rows = q.data?.items ?? [];
  const meta = q.data?.page;
  return (
    <>
      <DataTable
        grid
        columns={columns}
        rows={rows}
        rowKey={(c) => c.ticketId}
        loading={q.isLoading}
        empty="No related case found."
        footer={<Pager page={meta?.page ?? page} totalPages={meta?.totalPages} total={meta?.totalCount} size={meta?.pageSize ?? SIZE} shown={rows.length} noun="cases" onPage={setPage} />}
      />
      <ApiCaseModal open={!!open} onClose={() => setOpen(null)} query={detail} />
    </>
  );
}
