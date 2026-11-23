"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActionDialog } from "@/components/ui/action-dialog";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Field, Select, Textarea } from "@/components/ui/form";
import { Notice, PageHeader } from "@/components/ui/layout";
import { Modal } from "@/components/ui/modal";
import { ErrorState, Skeleton } from "@/components/ui/query-state";
import { Pager } from "@/components/ui/toolbar";
import { formatApiDateTime, formatBytes, humanise, statusTone } from "@/lib/bo/format";
import { useUpgrade, useUpgradeDecision, useUpgrades, type UpgradeItem } from "@/lib/bo/modules";
import { useUrlState } from "@/lib/bo/use-url-state";

const SIZE = 20;
const STATUSES = ["PENDING", "APPROVED", "REJECTED", "RESUBMITTED"];

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  return <div><p className="text-xs text-ink-500">{label}</p><p className="mt-1 break-words text-[13px] font-medium">{value || "—"}</p></div>;
}

// Account upgrade requests (customer asks for a higher KYC tier). GET /account-upgrade-requests, /{id},
// POST /{id}/approve and /{id}/reject. The record's version is sent with each decision, so a request someone
// else already decided is refused instead of decided twice.
export default function AccountUpgradesPage() {
  const url = useUrlState();
  const status = url.get("status");
  const [openId, setOpenId] = useState<string | null>(null);
  const [decision, setDecision] = useState<"approve" | "reject" | null>(null);
  const [reason, setReason] = useState("");
  const [done, setDone] = useState<string | null>(null);

  const list = useUpgrades({ status: status || undefined, page: url.page, size: SIZE });
  const rows = list.data?.data ?? [];
  const meta = list.data?.page;
  const detail = useUpgrade(openId);
  const decide = useUpgradeDecision();
  const d = detail.data;
  const pending = (d?.status ?? "").toUpperCase() === "PENDING" || (d?.status ?? "").toUpperCase() === "RESUBMITTED";

  const columns: Column<UpgradeItem>[] = [
    { key: "at", header: "Submitted", cell: (r) => <span className="whitespace-nowrap tabular">{formatApiDateTime(r.submittedAt)}</span> },
    { key: "cust", header: "Customer", cell: (r) => <span>{r.customerName ?? "—"}{r.customerId && <Link href={`/customers/${encodeURIComponent(r.customerId)}`} className="block text-xs tabular text-brand-700 hover:underline">{r.customerId}</Link>}</span> },
    { key: "acct", header: "Account", cell: (r) => <span className="tabular">{r.accountNumber ?? "—"}</span> },
    { key: "tier", header: "Requested tier", cell: (r) => (r.targetKycTier !== undefined ? `Tier ${r.targetKycTier}` : "—") },
    { key: "status", header: "Status", cell: (r) => <Badge tone={statusTone(r.status)}>{humanise(r.status)}</Badge> },
    { key: "action", header: "Action", cell: (r) => <button type="button" onClick={() => setOpenId(r.id)} className="inline-flex h-8 items-center rounded-lg bg-[#f1f2f5] px-3.5 text-[13px] font-medium hover:bg-line">Review</button> },
  ];

  return (
    <>
      <PageHeader title="Account Upgrades" description="Review customers' requests to move to a higher KYC tier" />
      {done && <div className="mb-4"><Notice tone="success" title="Done">{done}</Notice></div>}
      <div className="mb-4">
        <Select aria-label="Status" value={status} onChange={(e) => url.set({ status: e.target.value })} className="w-52">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{humanise(s)}</option>)}
        </Select>
      </div>
      {list.isError && !list.data ? <ErrorState error={list.error} onRetry={() => void list.refetch()} title="Upgrade requests could not be loaded" /> : (
        <DataTable grid columns={columns} rows={rows} rowKey={(r) => r.id} loading={list.isLoading} empty="No upgrade request matches."
          footer={<Pager page={meta?.page ?? url.page} totalPages={meta?.totalPages} total={meta?.total} size={meta?.size ?? SIZE} shown={rows.length} noun="requests" onPage={(p) => url.set({ page: String(p) })} />} />
      )}

      <Modal open={!!openId} onClose={() => setOpenId(null)} size="lg" title="Upgrade request" description={openId ?? undefined}
        footer={pending && d ? (<><Button variant="secondary" onClick={() => setOpenId(null)}>Close</Button><Button variant="danger" onClick={() => { setReason(""); setDecision("reject"); }}>Reject</Button><Button onClick={() => setDecision("approve")}>Approve</Button></>) : <Button variant="secondary" onClick={() => setOpenId(null)}>Close</Button>}>
        {detail.isLoading ? <div className="flex flex-col gap-3"><Skeleton className="h-20" /><Skeleton className="h-28" /></div> : detail.isError || !d ? <ErrorState error={detail.error} onRetry={() => void detail.refetch()} /> : (
          <div className="flex flex-col gap-4 pb-2">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Row label="Status" value={<Badge tone={statusTone(d.status)}>{humanise(d.status)}</Badge>} />
              <Row label="Requested tier" value={d.targetKycTier !== undefined ? `Tier ${d.targetKycTier}` : undefined} />
              <Row label="Account" value={d.accountNumber} />
              <Row label="Customer" value={[d.customer?.firstName, d.customer?.lastName].filter(Boolean).join(" ") || d.customerName} />
              <Row label="Current tier" value={d.customer?.kycTier !== undefined ? `Tier ${d.customer.kycTier}` : undefined} />
              <Row label="Resubmissions" value={d.resubmissionCount} />
              <Row label="Submitted" value={formatApiDateTime(d.submittedAt)} />
              <Row label="Reviewed" value={d.reviewedAt ? `${formatApiDateTime(d.reviewedAt)} by ${d.reviewedBy ?? "—"}` : undefined} />
            </div>
            {d.submissionReason && <div><p className="text-xs text-ink-500">Customer&apos;s reason</p><p className="mt-1 rounded-lg bg-surface px-4 py-3 text-[13px]">{d.submissionReason}</p></div>}
            {d.rejectionReason && <Notice tone="danger" title="Rejected">{d.rejectionReason}</Notice>}
            <div>
              <p className="mb-2 text-sm font-semibold">Documents</p>
              {(d.documents ?? []).length === 0 ? <p className="text-sm text-ink-500">{(d.documentTypes ?? []).length ? `Submitted: ${d.documentTypes?.map(humanise).join(", ")}` : "No document was submitted."}</p> : (
                <ul className="divide-y divide-line rounded-xl border border-line">
                  {(d.documents ?? []).map((x) => <li key={x.type} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[13px]"><span className="font-medium">{x.label || humanise(x.type)}</span><span className="truncate text-ink-500">{x.fileName}{x.fileSize ? ` · ${formatBytes(x.fileSize)}` : ""}</span></li>)}
                </ul>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ActionDialog open={decision === "approve"} onClose={() => setDecision(null)} title="Approve this upgrade?" description="The customer moves to the requested KYC tier." confirmLabel="Yes, Approve"
        onConfirm={async () => { await decide.mutateAsync({ id: openId!, approve: true, version: d?.version ?? 0 }); setDone("Upgrade approved."); setOpenId(null); }} />
      <ActionDialog open={decision === "reject"} onClose={() => setDecision(null)} danger title="Reject this upgrade?" confirmLabel="Yes, Reject" disabled={reason.trim().length < 3}
        onConfirm={async () => { await decide.mutateAsync({ id: openId!, approve: false, version: d?.version ?? 0, rejectionReason: reason.trim() }); setDone("Upgrade rejected."); setOpenId(null); }}>
        <Field label="Reason" htmlFor="rej" required hint="Shown to the customer."><Textarea id="rej" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} /></Field>
      </ActionDialog>
    </>
  );
}
