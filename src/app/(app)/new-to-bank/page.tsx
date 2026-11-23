"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActionDialog } from "@/components/ui/action-dialog";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Field, Select, Textarea } from "@/components/ui/form";
import { Notice, PageHeader, Tabs } from "@/components/ui/layout";
import { RefreshButton } from "@/components/ui/refresh-button";
import { Modal } from "@/components/ui/modal";
import { ErrorState, Skeleton } from "@/components/ui/query-state";
import { Pager } from "@/components/ui/toolbar";
import { formatApiDateTime, humanise, statusTone } from "@/lib/bo/format";
import { useRetries, useRetryMandate, useReview, useReviewDecision, useReviews, type RetryItem, type ReviewItem } from "@/lib/bo/modules";
import { useUrlState } from "@/lib/bo/use-url-state";

const SIZE = 20;
type Tab = "reviews" | "retries";

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  return <div><p className="text-xs text-ink-500">{label}</p><p className="mt-1 break-words text-[13px] font-medium">{value || "—"}</p></div>;
}

// New-to-bank: Tier 3 onboarding reviews and mandate forwarding retries.
// GET /new-to-bank/reviews, /reviews/{id}, POST .../approve | reject; GET /mandate-retries, POST .../retry.
// Every decision sends the record's version, so a request someone else already handled is refused.
export default function NewToBankPage() {
  const url = useUrlState();
  const tab = (url.get("tab") || "reviews") as Tab;
  const status = url.get("status");
  const [openId, setOpenId] = useState<string | null>(null);
  const [decision, setDecision] = useState<"approve" | "reject" | null>(null);
  const [retry, setRetry] = useState<RetryItem | null>(null);
  const [comments, setComments] = useState("");
  const [done, setDone] = useState<string | null>(null);

  const q = { status: status || undefined, page: url.page, size: SIZE };
  const reviews = useReviews(q);
  const retries = useRetries(q);
  const detail = useReview(openId);
  const decide = useReviewDecision();
  const retryMandate = useRetryMandate();
  const active = tab === "reviews" ? reviews : retries;
  const meta = active.data?.page;
  const d = detail.data;
  const pending = ["PENDING", "PENDING_REVIEW", "SUBMITTED"].includes((d?.status ?? "").toUpperCase());

  const reviewColumns: Column<ReviewItem>[] = [
    { key: "at", header: "Submitted", cell: (r) => <span className="whitespace-nowrap tabular">{formatApiDateTime(r.submittedAt)}</span> },
    { key: "ref", header: "Reference", cell: (r) => <span className="tabular">{r.referenceId ?? "—"}</span> },
    { key: "name", header: "Customer", cell: (r) => <span>{r.customerName ?? "—"}<span className="block text-xs text-ink-500">{r.phone ?? r.email}</span></span> },
    { key: "type", header: "Account", cell: (r) => `${humanise(r.accountType)}${r.accountTier ? ` · ${r.accountTier}` : ""}` },
    { key: "status", header: "Status", cell: (r) => <Badge tone={statusTone(r.status)}>{humanise(r.status)}</Badge> },
    { key: "action", header: "Action", cell: (r) => <button type="button" onClick={() => setOpenId(r.id)} className="inline-flex h-8 items-center rounded-lg bg-[#f1f2f5] px-3.5 text-[13px] font-medium hover:bg-line">Review</button> },
  ];
  const retryColumns: Column<RetryItem>[] = [
    { key: "at", header: "Last attempt", cell: (r) => <span className="whitespace-nowrap tabular">{formatApiDateTime(r.lastAttemptedAt ?? r.createdAt)}</span> },
    { key: "ref", header: "Reference", cell: (r) => <span className="tabular">{r.referenceId ?? "—"}</span> },
    { key: "name", header: "Customer", cell: (r) => <span>{r.customerName ?? "—"}<span className="block text-xs tabular text-ink-500">{r.accountNumber}</span></span> },
    { key: "tries", header: "Attempts", align: "right", cell: (r) => r.attemptCount ?? 0 },
    { key: "fail", header: "Last failure", cell: (r) => <span className="line-clamp-2 max-w-[260px]">{r.lastFailureMessage ?? "—"}</span> },
    { key: "status", header: "Status", cell: (r) => <Badge tone={statusTone(r.status)}>{humanise(r.status)}</Badge> },
    { key: "action", header: "Action", cell: (r) => <button type="button" onClick={() => { setComments(""); setRetry(r); }} className="inline-flex h-8 items-center rounded-lg bg-[#f1f2f5] px-3.5 text-[13px] font-medium hover:bg-line">Retry</button> },
  ];

  return (
    <>
      <PageHeader title="New-to-Bank" description="Review Tier 3 onboarding requests and retry mandate forwarding that failed" actions={<RefreshButton />} />
      {done && <div className="mb-4"><Notice tone="success" title="Done">{done}</Notice></div>}
      <Tabs<Tab> value={tab} onChange={(t) => url.set({ tab: t === "reviews" ? "" : t, status: "" })} tabs={[{ id: "reviews", label: "Reviews" }, { id: "retries", label: "Mandate retries" }]} />
      <div className="mb-4">
        <Select aria-label="Status" value={status} onChange={(e) => url.set({ status: e.target.value })} className="w-52">
          <option value="">All statuses</option>
          {(tab === "reviews" ? ["PENDING", "APPROVED", "REJECTED"] : ["PENDING", "FAILED", "COMPLETED"]).map((s) => <option key={s} value={s}>{humanise(s)}</option>)}
        </Select>
      </div>
      {active.isError && !active.data ? <ErrorState error={active.error} onRetry={() => void active.refetch()} title="This list could not be loaded" /> : tab === "reviews" ? (
        <DataTable grid columns={reviewColumns} rows={reviews.data?.data ?? []} rowKey={(r) => r.id} loading={reviews.isLoading} empty="No onboarding request matches."
          footer={<Pager page={meta?.page ?? url.page} totalPages={meta?.totalPages} total={meta?.total} size={meta?.size ?? SIZE} shown={reviews.data?.data.length ?? 0} noun="requests" onPage={(p) => url.set({ page: String(p) })} />} />
      ) : (
        <DataTable grid columns={retryColumns} rows={retries.data?.data ?? []} rowKey={(r) => r.id} loading={retries.isLoading} empty="No mandate retry matches."
          footer={<Pager page={meta?.page ?? url.page} totalPages={meta?.totalPages} total={meta?.total} size={meta?.size ?? SIZE} shown={retries.data?.data.length ?? 0} noun="items" onPage={(p) => url.set({ page: String(p) })} />} />
      )}

      <Modal open={!!openId} onClose={() => setOpenId(null)} title="Onboarding request" description={openId ?? undefined}
        footer={pending && d ? (<><Button variant="secondary" onClick={() => setOpenId(null)}>Close</Button><Button variant="danger" onClick={() => { setComments(""); setDecision("reject"); }}>Reject</Button><Button onClick={() => { setComments(""); setDecision("approve"); }}>Approve</Button></>) : <Button variant="secondary" onClick={() => setOpenId(null)}>Close</Button>}>
        {detail.isLoading ? <Skeleton className="h-40" /> : detail.isError || !d ? <ErrorState error={detail.error} onRetry={() => void detail.refetch()} /> : (
          <div className="flex flex-col gap-4 pb-2">
            {d.rejectionReason && <Notice tone="danger" title="Rejected">{d.rejectionReason}</Notice>}
            {d.decisionMessage && <Notice tone="info">{d.decisionMessage}</Notice>}
            <div className="grid grid-cols-2 gap-4">
              <Row label="Status" value={<Badge tone={statusTone(d.status)}>{humanise(d.status)}</Badge>} />
              <Row label="Reference" value={d.referenceId} />
              <Row label="Customer" value={d.customerName} />
              <Row label="Phone" value={d.phone} />
              <Row label="Email" value={d.email} />
              <Row label="Account" value={`${humanise(d.accountType)}${d.accountTier ? ` · ${d.accountTier}` : ""}`} />
              <Row label="BVN" value={d.bvn} />
              <Row label="NIN" value={d.nin} />
              <Row label="Submitted" value={formatApiDateTime(d.submittedAt)} />
              <Row label="Reviewed" value={d.reviewedAt ? `${formatApiDateTime(d.reviewedAt)} by ${d.reviewedBy ?? "—"}` : undefined} />
              <Row label="CIF created" value={d.downstreamCifId} />
              <Row label="Account number" value={d.downstreamAccountNumber} />
            </div>
          </div>
        )}
      </Modal>

      <ActionDialog open={decision !== null} onClose={() => setDecision(null)} danger={decision === "reject"} title={decision === "approve" ? "Approve and open the account?" : "Reject this request?"}
        description={decision === "approve" ? "A customer record and a Tier 3 account are opened." : undefined} confirmLabel={decision === "approve" ? "Yes, Approve" : "Yes, Reject"} disabled={decision === "reject" && comments.trim().length < 3}
        onConfirm={async () => { await decide.mutateAsync({ id: openId!, approve: decision === "approve", version: d?.version ?? 0, comments: comments.trim() || undefined }); setDone(decision === "approve" ? "Request approved." : "Request rejected."); setOpenId(null); }}>
        <Field label={decision === "reject" ? "Reason" : "Comments (optional)"} htmlFor="nb-c" required={decision === "reject"}><Textarea id="nb-c" value={comments} onChange={(e) => setComments(e.target.value)} maxLength={300} /></Field>
      </ActionDialog>
      <ActionDialog open={!!retry} onClose={() => setRetry(null)} title="Retry mandate forwarding?" description={retry?.lastFailureMessage} confirmLabel="Retry now"
        onConfirm={async () => { await retryMandate.mutateAsync({ id: retry!.id, version: retry?.version ?? 0, comments: comments.trim() || undefined }); setDone("Mandate forwarding retried."); }}>
        <Field label="Comments (optional)" htmlFor="nb-r"><Textarea id="nb-r" value={comments} onChange={(e) => setComments(e.target.value)} maxLength={300} /></Field>
      </ActionDialog>
    </>
  );
}
