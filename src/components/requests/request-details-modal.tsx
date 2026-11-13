"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { CircleUserRound, FileText } from "lucide-react";
import { Field, Textarea } from "@/components/ui/form";
import { Notice } from "@/components/ui/layout";
import { Modal } from "@/components/ui/modal";
import { getSession } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { usePermissions } from "@/lib/permissions";
import type { BackOfficeRequest, RequestStatus } from "@/lib/types";
import { RequestStatusBadge } from "./request-bits";
import { StepUpModal } from "./step-up-modal";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[13px] font-medium text-ink-900">{label}</p>
      <div className="mt-1 text-[13px] text-ink-700">{children}</div>
    </div>
  );
}

/**
 * Figma "Approvals – Details" ("Request Details"): stacked fields, a Documents grid with
 * "View Document", and three buttons side by side. The Figma's Approve / Cancel / Escalate become
 * Approve / Reject / Return, the three decisions the BRD defines (UAM-057).
 * POST /requests/{ref}/approve|reject|return.
 */
export function RequestDetailsModal({ request, onClose }: { request: BackOfficeRequest | null; onClose: () => void }) {
  const session = getSession();
  const { can } = usePermissions();
  const [status, setStatus] = useState<RequestStatus | null>(null);
  const [reason, setReason] = useState("");
  const [needReason, setNeedReason] = useState<"REJECTED" | "RETURNED" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stepUp, setStepUp] = useState(false);

  const close = () => { setStatus(null); setReason(""); setNeedReason(null); setError(null); onClose(); };
  if (!request) return <Modal open={false} onClose={close} title="">{null}</Modal>;

  const current = status ?? request.status;
  const isMaker = request.maker === session.name;
  const mayApprove = can(request.module === "Staff access" ? "Staff access" : "Corporate / SME setup", "Approve");
  const canDecide = current === "PENDING_APPROVAL" && !isMaker && mayApprove;
  const multi = request.items.length > 1;

  const decide = (d: "REJECTED" | "RETURNED") => {
    if (needReason !== d) { setNeedReason(d); setError(null); return; }
    if (!reason.trim()) return setError("Give a reason when you reject or return a request.");
    setStatus(d);
    setNeedReason(null);
  };

  const btn = "h-10 flex-1 rounded-lg text-sm font-medium";

  return (
    <>
      <Modal open={!stepUp} onClose={close} title="Request Details">
        <div className="flex flex-col gap-4 pb-3">
          <Row label="Name"><span className="inline-flex items-center gap-1.5"><CircleUserRound size={14} aria-hidden /> {request.target}</span></Row>
          <Row label="Reference"><span className="tabular">{request.ref} · Version {request.version}</span></Row>
          <Row label="Request Type">{request.action}</Row>
          <Row label="Submitted by">{request.maker} · {request.branch} · {formatDate(request.submittedAt)}</Row>
          <Row label="Reason">{request.reason}</Row>
          <Row label="Authorised by">{request.instruction.authorisedBy} · {request.instruction.channel}</Row>
          <Row label="Status"><RequestStatusBadge status={current} /></Row>

          {request.changes.length > 0 && (
            <Row label="Proposed changes">
              <ul className="flex flex-col gap-1.5">
                {request.changes.map((c) => <li key={c.field}>{c.field}: <span className="text-ink-500 line-through">{c.current}</span> → <span className="font-medium text-ink-900">{c.proposed}</span></li>)}
              </ul>
            </Row>
          )}

          <div className="border-t border-line pt-4">
            <p className="mb-3 text-sm font-semibold text-ink-900">Documents</p>
            {request.evidence.length === 0 ? (
              <Notice tone="warning">No evidence is attached to this version.</Notice>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {request.evidence.map((e) => (
                  <div key={e.id}>
                    <p className="mb-1.5 text-xs text-ink-500">{e.type}</p>
                    <div className="flex items-center gap-2.5 rounded-lg bg-surface px-3 py-2.5">
                      <FileText size={18} aria-hidden className="text-red-500" />
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-ink-900">{e.name}</p>
                        <button type="button" className="text-xs text-ink-500 hover:text-ink-900 hover:underline">View Document</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {status === "PROCESSING" && <Notice tone="success" title="Approved">Sent to the responsible system. The request is complete only when that system confirms it.</Notice>}
          {error && <Notice tone="danger">{error}</Notice>}

          {canDecide && multi && (
            <Notice tone="info">This request has {request.items.length} items, each needing its own decision. <Link href={`/requests/${request.ref}`} className="font-medium underline">Open the full request</Link> to decide them one by one.</Notice>
          )}

          {canDecide && !multi && needReason && (
            <Field label={`Reason for ${needReason === "REJECTED" ? "rejecting" : "returning"}`} htmlFor="rd-reason" required>
              <Textarea id="rd-reason" value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
            </Field>
          )}

          {canDecide && !multi ? (
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setStepUp(true)} className={`${btn} bg-accent-50 text-accent-700 hover:bg-accent-100`}>Approve</button>
              <button type="button" onClick={() => decide("REJECTED")} className={`${btn} bg-red-50 text-red-700 hover:bg-red-100`}>{needReason === "REJECTED" ? "Confirm reject" : "Reject"}</button>
              <button type="button" onClick={() => decide("RETURNED")} className={`${btn} bg-surface text-ink-900 hover:bg-line`}>{needReason === "RETURNED" ? "Confirm return" : "Return"}</button>
            </div>
          ) : current === "PENDING_APPROVAL" && isMaker ? (
            <Notice tone="info">You submitted this request. A different authorised checker must decide on it.</Notice>
          ) : current === "PENDING_APPROVAL" && !mayApprove ? (
            <Notice tone="info">Your role can view this request but not approve it.</Notice>
          ) : null}

          <Link href={`/requests/${request.ref}`} className="text-center text-[13px] font-medium text-brand-700 hover:underline">Open full request: items, history and service clock</Link>
        </div>
      </Modal>
      <StepUpModal open={stepUp} onClose={() => setStepUp(false)} onVerified={() => { setStepUp(false); setStatus("PROCESSING"); }} actionLabel={`approve ${request.ref}`} />
    </>
  );
}
