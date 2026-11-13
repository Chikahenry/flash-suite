"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Banknote, CalendarDays, Copy, Hash, LayoutGrid, Ticket } from "lucide-react";
import { Pagination } from "@/components/ui/toolbar";
import { CaseDetailsModal } from "./case-details-modal";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import type { CrmCase, Transaction, TxnStatus } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatDate, formatNaira, type Tone } from "@/lib/format";

export const txnTone: Record<TxnStatus, Tone> = {
  Completed: "success",
  Pending: "warning",
  Failed: "danger",
  Unknown: "warning",
  "Partially successful": "warning",
};

export function TxnStatusBadge({ status }: { status: TxnStatus }) {
  return <Badge tone={txnTone[status]}>{status}</Badge>;
}

/** Truncated reference with a copy button, as in the Figma Trx ID and Session Id columns. */
function CopyRef({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 tabular">
      <button type="button" aria-label={`Copy ${value}`} title="Copy" onClick={(e) => { e.preventDefault(); navigator.clipboard?.writeText(value); }} className="text-ink-700 hover:text-ink-900"><Copy size={14} /></button>
      <span title={value}>{value.length > 8 ? `${value.slice(0, 6)}...` : value}</span>
    </span>
  );
}

const DEBIT_TYPES = ["Transfer", "Airtime", "Data", "Bills", "Bulk payment"];

// Figma "Transactions" columns: Date & Time, Amount, Trx ID, Session Id, Bank, Channel, Beneficiary Name, Status.
const txnColumns: Column<Transaction>[] = [
  {
    key: "date", header: "Date & Time",
    cell: (t) => {
      const debit = DEBIT_TYPES.includes(t.type);
      return (
        <Link href={`/transactions/${t.ref}`} className="flex items-center gap-3 hover:underline">
          <span className={cn("grid size-5 place-items-center rounded border", debit ? "border-red-300 text-red-600" : "border-accent-500 text-accent-600")}>{debit ? <ArrowUpRight size={12} aria-hidden /> : <ArrowDownLeft size={12} aria-hidden />}</span>
          <span><span className="block whitespace-nowrap">{formatDate(t.date)}</span><span className="block text-xs text-ink-500">{debit ? "Debit" : "Credit"}</span></span>
        </Link>
      );
    },
  },
  { key: "amount", header: "Amount", cell: (t) => <span className="font-medium tabular">{formatNaira(t.amount)}</span> },
  { key: "trx", header: "Trx ID", cell: (t) => <CopyRef value={t.ref} /> },
  { key: "session", header: "Session Id", cell: (t) => <CopyRef value={t.sessionId} /> },
  { key: "bank", header: "Bank", cell: (t) => t.bank },
  { key: "channel", header: "Channel", cell: (t) => t.type },
  { key: "beneficiary", header: "Beneficiary Name", cell: (t) => t.beneficiary },
  { key: "status", header: "Status", cell: (t) => <TxnStatusBadge status={t.status} /> },
];

export function TransactionTable({ rows, empty }: { rows: Transaction[]; empty?: string }) {
  return <DataTable headerFill columns={txnColumns} rows={rows} rowKey={(t) => t.ref} empty={empty ?? "No transaction found. Check the search criteria."} />;
}

export const caseTone: Record<CrmCase["status"], Tone> = {
  New: "warning",
  "In Progress": "info",
  Escalated: "danger",
  Resolved: "success",
  Cancelled: "neutral",
};

export const slaTone: Record<string, Tone> = {
  Met: "success", "On track": "success", Pending: "neutral", "Nearing breach": "warning", Breached: "danger",
};

// Figma "Case Management" columns: Ticket ID, Category, Account, Amount, Date Created, Status, Action.
export function CaseTable({ rows, empty, total, compact }: { rows: CrmCase[]; empty?: string; total?: number; compact?: boolean }) {
  const [open, setOpen] = useState<CrmCase | null>(null);

  // Figma "Case Management" columns: Ticket ID, Category, Account, Amount, Date Created, Status, Action.
  const columns: Column<CrmCase>[] = [
    { key: "ref", header: "Ticket ID", icon: Ticket, cell: (c) => <span className="inline-flex items-center gap-2 whitespace-nowrap tabular"><Ticket size={14} aria-hidden className="text-ink-500" />{c.ref}</span> },
    { key: "category", header: "Category", icon: LayoutGrid, cell: (c) => c.category },
    { key: "account", header: "Account", icon: Hash, cell: (c) => <span className="tabular">{c.account}</span> },
    { key: "amount", header: "Amount", icon: Banknote, cell: (c) => <span className="tabular">{c.amount ? formatNaira(c.amount) : "—"}</span> },
    { key: "created", header: "Date Created", icon: CalendarDays, cell: (c) => <span className="whitespace-nowrap tabular">{formatDate(c.created)}</span> },
    { key: "status", header: "Status", cell: (c) => <Badge tone={caseTone[c.status]}>{c.status}</Badge> },
    { key: "action", header: "Action", cell: (c) => <button type="button" onClick={() => setOpen(c)} className="inline-flex h-8 items-center whitespace-nowrap rounded-lg bg-[#f1f2f5] px-3.5 text-[13px] font-medium text-ink-900 hover:bg-line">View Details</button> },
  ];

  return (
    <>
      <DataTable grid columns={compact ? columns.filter((c) => c.key !== "account") : columns} rows={rows} rowKey={(c) => c.ref} empty={empty ?? "No related case found."} footer={total !== undefined ? <Pagination shown={rows.length} total={total} noun="cases" /> : undefined} />
      <CaseDetailsModal crmCase={open} onClose={() => setOpen(null)} />
    </>
  );
}
