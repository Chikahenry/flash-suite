"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, ReadOnlyField, Textarea } from "@/components/ui/form";
import { DefinitionGrid, Notice } from "@/components/ui/layout";
import { Modal } from "@/components/ui/modal";
import { ErrorState, Skeleton } from "@/components/ui/query-state";
import { ApiError } from "@/lib/bo/client";
import { formatApiDateTime, formatMoney, humanise, statusTone } from "@/lib/bo/format";
import { useApproval, useApprovalAction, type ApprovalVerb } from "@/lib/bo/ops";

const LABEL: Record<ApprovalVerb, string> = { approve: "Approve", reject: "Reject", "return-to-maker": "Return to maker", resubmit: "Resubmit", cancel: "Cancel request" };
const NEEDS_REASON: ApprovalVerb[] = ["reject", "return-to-maker", "cancel"];

/** Which decisions make sense for a status. The Bank still refuses anything the signed-in staff member may not do. */
export function verbsFor(status?: string): ApprovalVerb[] {
  const s = (status ?? "").toUpperCase();
  if (/RETURN/.test(s)) return ["resubmit", "cancel"];
  if (/PENDING|AWAIT|SUBMIT/.test(s)) return ["approve", "reject", "return-to-maker", "cancel"];
  return [];
}

/** One approval request: details, the maker-checker history, and the decisions the person can take. */
export function ApprovalPanel({ id, onChanged }: { id: number; onChanged?: (message: string) => void }) {
  const q = useApproval(id);
  const act = useApprovalAction();
  const [verb, setVerb] = useState<ApprovalVerb | null>(null);
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (q.isLoading) return <Skeleton className="h-40" />;
  if (q.isError || !q.data) return <ErrorState error={q.error} onRetry={() => void q.refetch()} title="This request could not be loaded" />;

  const { request: r, history = [] } = q.data;
  const verbs = verbsFor(r.status);
  const needsReason = !!verb && NEEDS_REASON.includes(verb);

  const close = () => { setVerb(null); setReason(""); setComment(""); setError(null); };
  const submit = async () => {
    if (!verb) return;
    setError(null);
    try {
      await act.mutateAsync({ id, verb, reason: reason.trim() || undefined, comment: comment.trim() || undefined });
      onChanged?.(`${LABEL[verb]}: done.`);
      close();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong. Try again.");
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <DefinitionGrid cols={2}>
        <ReadOnlyField label="Reference" value={<span className="tabular">{r.reference ?? r.requestId ?? r.id}</span>} />
        <ReadOnlyField label="Type" value={humanise(r.type)} />
        <ReadOnlyField label="Status" value={<Badge tone={statusTone(r.status)}>{humanise(r.status)}</Badge>} />
        <ReadOnlyField label="Current step" value={r.currentStep ?? "—"} />
        <ReadOnlyField label="Amount" value={r.amount === undefined ? "—" : <span className="tabular">{formatMoney(r.amount)}</span>} />
        <ReadOnlyField label="Maker" value={r.makerUsername ?? "—"} />
        <ReadOnlyField label="Submitted" value={formatApiDateTime(r.createdAt)} />
        <ReadOnlyField label="Completed" value={formatApiDateTime(r.completedAt)} />
      </DefinitionGrid>

      <div>
        <p className="mb-2 text-[13px] font-medium text-ink-900">History</p>
        {history.length === 0 ? <p className="text-[13px] text-ink-500">No action has been taken yet.</p> : (
          <ol className="flex flex-col gap-3 border-l border-line pl-4">
            {history.map((h) => (
              <li key={h.id} className="relative">
                <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full bg-accent-500" aria-hidden />
                <p className="text-sm font-medium">{humanise(h.action)}{h.step ? <span className="font-normal text-ink-500"> · step {h.step}</span> : null}</p>
                <p className="text-xs tabular text-ink-500">{h.actorUsername ?? "—"} · {formatApiDateTime(h.createdAt)}</p>
                {h.comment && <p className="mt-0.5 text-[13px] text-ink-700">{h.comment}</p>}
              </li>
            ))}
          </ol>
        )}
      </div>

      {verbs.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-line pt-4">
          {verbs.map((v) => <Button key={v} variant={v === "approve" || v === "resubmit" ? "primary" : v === "reject" || v === "cancel" ? "danger" : "secondary"} onClick={() => setVerb(v)}>{LABEL[v]}</Button>)}
        </div>
      )}

      <Modal open={!!verb} onClose={close} size="sm" title={verb ? `${LABEL[verb]}?` : ""} description={`${humanise(r.type)} · ${r.reference ?? r.id}`}
        footer={<><Button variant="secondary" onClick={close} disabled={act.isPending}>Back</Button><Button variant={verb === "reject" || verb === "cancel" ? "danger" : "primary"} disabled={act.isPending || (needsReason && reason.trim().length < 3)} onClick={() => void submit()}>{act.isPending ? "Working…" : `Yes, ${verb ? LABEL[verb].toLowerCase() : ""}`}</Button></>}>
        <div className="flex flex-col gap-4 pb-2">
          {needsReason && <Field label="Reason" htmlFor="ap-reason" required hint="Kept with the request for audit."><Textarea id="ap-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} /></Field>}
          <Field label="Comment (optional)" htmlFor="ap-comment"><Textarea id="ap-comment" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} /></Field>
          {error && <Notice tone="danger">{error}</Notice>}
        </div>
      </Modal>
    </div>
  );
}
