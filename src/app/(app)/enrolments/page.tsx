"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActionDialog } from "@/components/ui/action-dialog";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Field, Select, Textarea } from "@/components/ui/form";
import { Notice, PageHeader } from "@/components/ui/layout";
import { Modal } from "@/components/ui/modal";
import { ErrorState, Skeleton } from "@/components/ui/query-state";
import { RefreshButton } from "@/components/ui/refresh-button";
import { DateRangeButton, Pager, SearchField, Toolbar } from "@/components/ui/toolbar";
import { proxyUrl } from "@/lib/bo/client";
import { enrolmentDocumentPath, useEnrolment, useEnrolmentDecision, useEnrolments, type EnrolmentItem } from "@/lib/bo/enrolment";
import { formatApiDateTime, humanise, statusTone } from "@/lib/bo/format";
import { useUrlState } from "@/lib/bo/use-url-state";

const SIZE = 20;
const STATUSES = ["PENDING", "APPROVED", "REJECTED"];

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  return <div><p className="text-xs text-ink-500">{label}</p><p className="mt-1 break-words text-[13px] font-medium">{value || "—"}</p></div>;
}

// Enrolment requests: customers who registered themselves wait here until staff approve or reject them.
// Nobody gets access to the customer platform before approval. The Bank emails the customer after each decision.
export default function EnrolmentsPage() {
  const url = useUrlState();
  const status = url.get("status") || "PENDING";
  const from = url.get("from");
  const to = url.get("to");
  const [openId, setOpenId] = useState<string | null>(null);
  const [decision, setDecision] = useState<"approve" | "reject" | null>(null);
  const [text, setText] = useState("");
  const [done, setDone] = useState<string | null>(null);

  const list = useEnrolments({ status: status === "ALL" ? undefined : status, search: url.get("q") || undefined, from: from || undefined, to: to || undefined, page: url.page, size: SIZE });
  const detail = useEnrolment(openId);
  const decide = useEnrolmentDecision();
  const meta = list.data?.page;
  const rows = list.data?.data ?? [];
  const d = detail.data;
  const pending = (d?.status ?? "").toUpperCase() === "PENDING";

  const columns: Column<EnrolmentItem>[] = [
    { key: "at", header: "Submitted", cell: (r) => <span className="whitespace-nowrap tabular">{formatApiDateTime(r.submittedAt)}</span> },
    { key: "ref", header: "Reference", cell: (r) => <span className="tabular">{r.referenceId ?? r.id}</span> },
    { key: "name", header: "Organisation", cell: (r) => <span>{r.organisationName ?? "—"}<span className="block text-xs text-ink-500">{r.email ?? r.phone}</span></span> },
    { key: "acct", header: "Account", cell: (r) => <span className="tabular">{r.accountNumber ?? "—"}</span> },
    { key: "status", header: "Status", cell: (r) => <Badge tone={statusTone(r.status)}>{humanise(r.status)}</Badge> },
    { key: "action", header: "Action", cell: (r) => <button type="button" onClick={() => setOpenId(r.id)} className="inline-flex h-8 items-center rounded-lg bg-[#f1f2f5] px-3.5 text-[13px] font-medium hover:bg-line">Review</button> },
  ];

  const close = () => { setDecision(null); setText(""); };

  return (
    <>
      <PageHeader title="Enrolment Requests" description="Approve or reject customers who registered themselves. They get access only after approval."
        actions={<><RefreshButton /><Link href="/corporate/new" className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent-500 px-4 text-sm font-medium text-white hover:bg-accent-600"><Plus size={16} aria-hidden /> Enrol a customer</Link></>} />
      {done && <div className="mb-4"><Notice tone="success">{done}</Notice></div>}
      <Toolbar>
        <SearchField value={url.search.value} onChange={url.search.onChange} placeholder="Search by name, account or reference" />
        <Select aria-label="Status" value={status} onChange={(e) => url.set({ status: e.target.value })} className="w-44">
          {STATUSES.map((s) => <option key={s} value={s}>{humanise(s)}</option>)}
          <option value="ALL">All statuses</option>
        </Select>
        <DateRangeButton from={from} to={to} onChange={(a, b) => url.set({ from: a, to: b })} />
      </Toolbar>

      {list.isError && !list.data ? <ErrorState error={list.error} onRetry={() => void list.refetch()} title="Enrolment requests could not be loaded" /> : (
        <DataTable grid columns={columns} rows={rows} rowKey={(r) => r.id} loading={list.isLoading} empty="No enrolment request matches."
          footer={<Pager page={meta?.page ?? url.page} totalPages={meta?.totalPages} total={meta?.total} size={meta?.size ?? SIZE} shown={rows.length} noun="requests" onPage={(p) => url.set({ page: String(p) })} />} />
      )}

      <Modal open={!!openId} onClose={() => setOpenId(null)} title="Enrolment request" description={d?.referenceId ?? openId ?? undefined}
        footer={pending ? (<><Button variant="secondary" onClick={() => setOpenId(null)}>Close</Button><Button variant="danger" onClick={() => setDecision("reject")}>Reject</Button><Button onClick={() => setDecision("approve")}>Approve</Button></>) : <Button variant="secondary" onClick={() => setOpenId(null)}>Close</Button>}>
        {detail.isLoading ? <Skeleton className="h-40" /> : detail.isError || !d ? <ErrorState error={detail.error} onRetry={() => void detail.refetch()} /> : (
          <div className="flex flex-col gap-4 pb-2">
            {d.rejectionReason && <Notice tone="danger" title="Rejected">{d.rejectionReason}</Notice>}
            <div className="grid grid-cols-2 gap-4">
              <Row label="Status" value={<Badge tone={statusTone(d.status)}>{humanise(d.status)}</Badge>} />
              <Row label="Source" value={humanise(d.source)} />
              <Row label="Organisation" value={d.organisationName} />
              <Row label="RC number" value={d.rcNumber} />
              <Row label="Account number" value={<span className="tabular">{d.accountNumber}</span>} />
              <Row label="CIF" value={d.cif} />
              <Row label="Phone" value={d.phone} />
              <Row label="Email" value={d.email} />
              <Row label="Contact" value={d.contactName} />
              <Row label="Address" value={d.address} />
              <Row label="Submitted" value={formatApiDateTime(d.submittedAt)} />
              <Row label="Reviewed" value={d.reviewedAt ? `${formatApiDateTime(d.reviewedAt)} by ${d.reviewedBy ?? "—"}` : undefined} />
            </div>

            <div>
              <p className="mb-2 text-[13px] font-medium">Documents</p>
              {(d.documents ?? []).length === 0 ? <p className="text-[13px] text-ink-500">No document was supplied.</p> : (
                <ul className="divide-y divide-line rounded-lg border border-line">
                  {(d.documents ?? []).map((f) => (
                    <li key={f.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-[13px]">
                      <span className="flex min-w-0 items-center gap-2"><FileText size={14} aria-hidden className="shrink-0 text-ink-500" /><span className="truncate">{f.fileName ?? humanise(f.type)}</span></span>
                      <a href={proxyUrl(enrolmentDocumentPath(d.id, f.id))} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-700 hover:underline">View</a>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <p className="mb-2 text-[13px] font-medium">Users and authorizers</p>
              {(d.users ?? []).length === 0 ? <p className="text-[13px] text-ink-500">None listed.</p> : (
                <ul className="divide-y divide-line rounded-lg border border-line">
                  {(d.users ?? []).map((u, i) => (
                    <li key={`${u.email}${i}`} className="flex items-center justify-between gap-3 px-3 py-2.5 text-[13px]">
                      <span>{u.fullName}<span className="block text-xs text-ink-500">{u.email}{u.phone ? ` · ${u.phone}` : ""}</span></span>
                      <Badge tone="neutral">{humanise(u.role)}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ActionDialog open={decision !== null} onClose={close} danger={decision === "reject"}
        title={decision === "approve" ? "Approve this enrolment?" : "Reject this enrolment?"}
        description={decision === "approve" ? "The customer is emailed and can log in to the customer platform." : "The customer is emailed the reason. They get no access."}
        confirmLabel={decision === "approve" ? "Yes, Approve" : "Yes, Reject"} disabled={decision === "reject" && text.trim().length < 3}
        onConfirm={async () => {
          await decide.mutateAsync({ id: openId!, approve: decision === "approve", version: d?.version ?? 0, ...(decision === "reject" ? { reason: text.trim() } : { comments: text.trim() || undefined }) });
          setDone(decision === "approve" ? "Enrolment approved. The customer has been emailed." : "Enrolment rejected. The customer has been emailed the reason.");
          setText(""); setOpenId(null);
        }}>
        <Field label={decision === "reject" ? "Reason" : "Comments (optional)"} htmlFor="en-c" required={decision === "reject"} hint={decision === "reject" ? "This is sent to the customer." : undefined}>
          <Textarea id="en-c" value={text} onChange={(e) => setText(e.target.value)} maxLength={300} />
        </Field>
      </ActionDialog>
    </>
  );
}
