"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, FileText, Pause, Play, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, ReadOnlyField, Select, Textarea } from "@/components/ui/form";
import { Card, DefinitionGrid, EmptyState, Notice, PageHeader } from "@/components/ui/layout";
import { RequestStatusBadge } from "@/components/requests/request-bits";
import { StepUpModal } from "@/components/requests/step-up-modal";
import { getRequest, getSession, isOverdue, serviceTargets } from "@/lib/api";
import { formatAge, formatDateTime, outcomeLabel, outcomeTone } from "@/lib/format";
import { usePermissions } from "@/lib/permissions";
import type { RequestStatus } from "@/lib/types";

type Decision = "approve" | "reject" | "return";
type ItemDecision = { decision: Decision | ""; reason: string };
interface ClockPause { reason: string; start: string; end?: string; hours: number }

const PAUSE_REASONS = ["Awaiting customer information", "Awaiting customer document", "Awaiting mandate confirmation"];
const decisionTone = { approve: "success", reject: "danger", return: "info" } as const;
const decisionLabel = { approve: "Approved", reject: "Rejected", return: "Returned" } as const;

// Full view of one request: GET /requests/{ref}; POST /requests/{ref}/approve|reject|return,
// POST /requests/{ref}/items/{itemId}/decision for requests with several items.
export default function RequestDetailPage() {
  const { ref } = useParams<{ ref: string }>();
  const session = getSession();
  const { can } = usePermissions();
  const request = getRequest(ref);

  const [status, setStatus] = useState<RequestStatus | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [stepUp, setStepUp] = useState(false);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [itemDecisions, setItemDecisions] = useState<Record<string, ItemDecision>>({});
  const [decided, setDecided] = useState(false);
  const [pauses, setPauses] = useState<ClockPause[]>([]);
  const [pauseReason, setPauseReason] = useState(PAUSE_REASONS[0]);
  const [pauseNote, setPauseNote] = useState("");

  if (!request) {
    return <EmptyState title="Request not found" body={`No request has the reference ${ref}.`} action={<Link href="/requests" className="text-sm font-medium text-brand-700">Back to the approval queue</Link>} />;
  }

  const current = status ?? request.status;
  const isMaker = request.maker === session.name;
  const mayApprove = can(request.module === "Staff access" ? "Staff access" : "Corporate / SME setup", "Approve");
  const canDecide = current === "PENDING_APPROVAL" && !isMaker && mayApprove;
  const uncertain = current === "UNKNOWN" || current === "PARTIALLY_COMPLETED" || current === "FAILED";
  const multi = request.items.length > 1;

  // Service clock (BRD 14.8). A pause is allowed only where the target for this request type permits it.
  const target = serviceTargets.find((t) => t.requestType === request.action);
  const pauseAllowed = !!target?.pauseAllowed;
  const paused = pauses.some((p) => !p.end);
  const pausedHours = pauses.reduce((n, p) => n + p.hours, 0);
  const counted = Math.max(0, request.ageHours - pausedHours);
  const clockOpen = ["PENDING_APPROVAL", "RETURNED", "PROCESSING", "PARTIALLY_COMPLETED", "FAILED", "UNKNOWN"].includes(current);
  const overdue = request.targetHours !== undefined && clockOpen && counted > request.targetHours;

  const startPause = () => setPauses((p) => [...p, { reason: pauseNote.trim() ? `${pauseReason}: ${pauseNote.trim()}` : pauseReason, start: "2026-11-11T12:25:00", hours: 0 }]);
  // Mock: each resume counts one hour of paused time.
  const endPause = () => { setPauses((p) => p.map((x) => (x.end ? x : { ...x, end: "2026-11-11T13:25:00", hours: 1 }))); setPauseNote(""); };

  const decide = (d: Decision) => {
    if (d !== "approve" && !reason.trim()) return setError("Give a reason when you reject or return a request.");
    setError(null);
    if (d === "approve") return setStepUp(true);
    setStatus(d === "reject" ? "REJECTED" : "RETURNED");
  };

  const setItem = (id: string, patch: Partial<ItemDecision>) => setItemDecisions((m) => ({ ...m, [id]: { ...(m[id] ?? { decision: "", reason: "" }), ...patch } }));
  const submitItems = () => {
    const undecided = request.items.filter((i) => !itemDecisions[i.id]?.decision);
    if (undecided.length) return setError(`Record a decision for every item. Still open: ${undecided.map((i) => i.label).join(", ")}.`);
    const noReason = request.items.filter((i) => itemDecisions[i.id].decision !== "approve" && !itemDecisions[i.id].reason.trim());
    if (noReason.length) return setError(`Give a reason for each rejected or returned item: ${noReason.map((i) => i.label).join(", ")}.`);
    setError(null);
    setStepUp(true);
  };
  const onVerified = () => {
    setStepUp(false);
    if (!multi) return setStatus("PROCESSING");
    setDecided(true);
    const values = request.items.map((i) => itemDecisions[i.id].decision);
    setStatus(values.some((v) => v === "approve") ? "PROCESSING" : values.every((v) => v === "reject") ? "REJECTED" : "RETURNED");
  };
  const approvedCount = request.items.filter((i) => itemDecisions[i.id]?.decision === "approve").length;

  return (
    <>
      <PageHeader
        back={<Link href="/requests" className="inline-flex items-center gap-2 text-sm text-ink-900 hover:underline"><ArrowLeft size={18} aria-hidden /> Back to approval queue</Link>}
        title={request.action}
        description={`${request.ref} · Version ${request.version} · ${request.target}`}
        actions={<RequestStatusBadge status={current} />}
      />

      {status === "PROCESSING" && (
        <div className="mb-5">
          <Notice tone="success" title={multi && decided ? `${approvedCount} of ${request.items.length} items approved` : "Approved"}>
            {multi && decided ? "Only the approved items were sent to the responsible system. Rejected and returned items were not created." : "Sent to the responsible system."} The request is complete only when that system confirms it.
          </Notice>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-6">
          <Card title="Request">
            <DefinitionGrid>
              <ReadOnlyField label="Maker" value={request.maker} />
              <ReadOnlyField label="Checker" value={request.checker ?? "Not yet assigned"} />
              <ReadOnlyField label="Branch" value={request.branch} />
              <ReadOnlyField label="Submitted" value={formatDateTime(request.submittedAt)} />
              <ReadOnlyField label="Module" value={request.module} />
              <ReadOnlyField label="Submission channel" value={request.instruction.channel} />
            </DefinitionGrid>
            <div className="mt-5 border-t border-line pt-4">
              <p className="text-xs text-ink-500">Reason</p>
              <p className="mt-1 text-sm text-ink-900">{request.reason}</p>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <ReadOnlyField label="Authorised by" value={request.instruction.authorisedBy} />
              <ReadOnlyField label="Instruction date" value={formatDateTime(request.instruction.date)} />
            </div>
          </Card>

          {request.changes.length > 0 && (
            <Card title="Current and proposed values" padded={false}>
              <table className="w-full text-left text-sm">
                <thead><tr className="bg-surface text-ink-900"><th scope="col" className="px-5 py-3 text-[13px] font-semibold">Field</th><th scope="col" className="px-5 py-3 text-[13px] font-semibold">Current</th><th scope="col" className="px-5 py-3 text-[13px] font-semibold">Proposed</th></tr></thead>
                <tbody>
                  {request.changes.map((c) => (
                    <tr key={c.field} className="border-t border-line">
                      <td className="px-5 py-3 text-ink-700">{c.field}</td>
                      <td className="px-5 py-3 tabular text-ink-500 line-through">{c.current}</td>
                      <td className="px-5 py-3 font-medium tabular text-ink-900">{c.proposed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          <Card
            title={`Items (${request.items.length})`}
            padded={false}
            actions={uncertain && (
              <Button variant="secondary" size="sm" onClick={() => setCheckedAt("just now")}>
                <RefreshCw size={14} aria-hidden /> Check source outcome
              </Button>
            )}
          >
            {uncertain && (
              <div className="px-5 pt-4">
                <Notice tone="warning">
                  {checkedAt ? `Source checked ${checkedAt}. No change in outcome.` : "Check the source outcome before any retry. Completed items are never sent again."}
                </Notice>
              </div>
            )}
            {canDecide && multi && !decided && (
              <div className="px-5 pt-4"><Notice tone="info">Decide each item separately. Only approved items are created; a returned item needs correction and fresh approval.</Notice></div>
            )}
            {uncertain && checkedAt && request.items.some((i) => i.outcome === "FAILED") && (
              <div className="px-5 pt-3">
                <Button variant="secondary" size="sm" onClick={() => setStatus("PROCESSING")}>Retry incomplete items only</Button>
              </div>
            )}
            <ul className="divide-y divide-line">
              {request.items.map((item) => {
                const d = itemDecisions[item.id];
                return (
                  <li key={item.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink-900">{item.label}</p>
                        <p className="text-[13px] text-ink-500">{item.detail}</p>
                        {item.failureReason && <p className="mt-1 text-[13px] text-red-700">{item.failureReason}</p>}
                        {item.sourceRef && <p className="mt-1 text-xs tabular text-ink-500">Source reference {item.sourceRef}</p>}
                      </div>
                      {decided && d?.decision
                        ? <Badge tone={decisionTone[d.decision]}>{decisionLabel[d.decision]}</Badge>
                        : <Badge tone={outcomeTone[item.outcome]}>{outcomeLabel[item.outcome]}</Badge>}
                    </div>
                    {canDecide && multi && !decided && (
                      <div className="mt-3 grid gap-3 sm:grid-cols-[180px_1fr]">
                        <Select aria-label={`Decision for ${item.label}`} value={d?.decision ?? ""} onChange={(e) => setItem(item.id, { decision: e.target.value as Decision | "" })}>
                          <option value="">Choose a decision</option>
                          <option value="approve">Approve</option>
                          <option value="return">Return to maker</option>
                          <option value="reject">Reject</option>
                        </Select>
                        {d?.decision && d.decision !== "approve" && <Input aria-label={`Reason for ${item.label}`} placeholder="Reason (required)" value={d.reason} onChange={(e) => setItem(item.id, { reason: e.target.value })} />}
                      </div>
                    )}
                    {decided && d?.reason && <p className="mt-2 text-[13px] text-ink-700">Reason: {d.reason}</p>}
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card title="Evidence">
            {request.evidence.length === 0 ? (
              <Notice tone="warning">No evidence is attached to this version.</Notice>
            ) : (
              <ul className="flex flex-col gap-2">
                {request.evidence.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 rounded-lg border border-line px-3 py-2.5">
                    <FileText size={16} className="text-red-500" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-900">{e.name}</p>
                      <p className="text-xs text-ink-500">{e.type} · {e.source}</p>
                    </div>
                    <Button variant="ghost" size="sm">View</Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card title="Decision">
            {canDecide && multi && !decided ? (
              <div className="flex flex-col gap-4">
                <p className="text-[13px] text-ink-500">Record a decision against each item in the list, then submit them together. You are deciding on version {request.version} exactly as shown.</p>
                {error && <Notice tone="danger">{error}</Notice>}
                <Button block onClick={submitItems}>Submit {request.items.length} decisions</Button>
              </div>
            ) : canDecide ? (
              <div className="flex flex-col gap-4">
                <p className="text-[13px] text-ink-500">You are deciding on version {request.version} exactly as shown. An amended request needs fresh approval.</p>
                {error && <Notice tone="danger">{error}</Notice>}
                <Field label="Reason" htmlFor="decision-reason" hint="Required to reject or return.">
                  <Textarea id="decision-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
                </Field>
                <Button block onClick={() => decide("approve")}>Approve</Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="secondary" onClick={() => decide("return")}>Return to maker</Button>
                  <Button variant="danger-soft" onClick={() => decide("reject")}>Reject</Button>
                </div>
              </div>
            ) : current === "RETURNED" && isMaker ? (
              <div className="flex flex-col gap-3">
                <Notice tone="info" title="Returned to you for correction">Correct the request and resubmit it. The resubmission is a new version and needs fresh approval. The service clock is not reset.</Notice>
                <Button block onClick={() => setStatus("PENDING_APPROVAL")}>Amend and resubmit</Button>
                <Button variant="danger-soft" block onClick={() => setStatus("CANCELLED")}>Cancel request</Button>
              </div>
            ) : current === "PENDING_APPROVAL" && isMaker ? (
              <Notice tone="info" title="You submitted this request">A different authorised checker must decide on it. You cannot approve your own request.</Notice>
            ) : current === "PENDING_APPROVAL" ? (
              <Notice tone="info">Your role can view this request but not approve it.</Notice>
            ) : (
              <p className="text-[13px] text-ink-500">No decision is open. See the history below.</p>
            )}
          </Card>

          <Card title="Service clock">
            <dl className="flex flex-col gap-2.5 text-[13px]">
              <div className="flex justify-between"><dt className="text-ink-500">Stage</dt><dd className="font-medium">{current === "PENDING_APPROVAL" ? "Approval" : clockOpen ? "Processing" : "Closed"}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-500">Total elapsed</dt><dd className="font-medium tabular">{formatAge(request.ageHours)}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-500">Paused</dt><dd className="font-medium tabular">{formatAge(pausedHours)}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-500">Counted service time</dt><dd className="font-medium tabular">{formatAge(counted)}</dd></div>
              <div className="flex items-center justify-between">
                <dt className="text-ink-500">Target</dt>
                <dd className="font-medium">{request.targetHours === undefined ? "Target not configured" : <span className="inline-flex items-center gap-2 tabular">{formatAge(request.targetHours)}{(overdue || (pausedHours === 0 && isOverdue(request))) && clockOpen && <Badge tone="danger">Overdue</Badge>}</span>}</dd>
              </div>
            </dl>

            {paused && <div className="mt-4"><Notice tone="warning" title="Clock paused">The service clock is stopped while the request waits on the customer.</Notice></div>}

            {pauses.length > 0 && (
              <ul className="mt-4 flex flex-col gap-2 border-t border-line pt-3 text-xs text-ink-700">
                {pauses.map((p, i) => (
                  <li key={i}>
                    <span className="font-medium text-ink-900">{p.reason}</span>
                    <br />
                    {formatDateTime(p.start)} to {p.end ? formatDateTime(p.end) : "now"}
                  </li>
                ))}
              </ul>
            )}

            {clockOpen && (
              <div className="mt-4 border-t border-line pt-4">
                {!pauseAllowed ? (
                  <p className="text-xs text-ink-500">Pausing is not permitted for this request type.</p>
                ) : paused ? (
                  <Button variant="secondary" size="sm" onClick={endPause}><Play size={13} aria-hidden /> Resume clock</Button>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    <Select aria-label="Pause reason" value={pauseReason} onChange={(e) => setPauseReason(e.target.value)}>{PAUSE_REASONS.map((r) => <option key={r}>{r}</option>)}</Select>
                    <Input aria-label="Pause note" placeholder="What is the customer providing? (optional)" value={pauseNote} onChange={(e) => setPauseNote(e.target.value)} />
                    <Button variant="secondary" size="sm" className="self-start" onClick={startPause}><Pause size={13} aria-hidden /> Pause clock</Button>
                  </div>
                )}
              </div>
            )}
          </Card>

          <Card title="History">
            <ol className="flex flex-col gap-4">
              {request.timeline.map((t, i) => (
                <li key={i} className="relative pl-5">
                  <span aria-hidden className="absolute left-0 top-1.5 size-2 rounded-full bg-brand-600" />
                  <p className="text-sm font-medium text-ink-900">{t.action}</p>
                  <p className="text-xs text-ink-500">{t.actor} · {formatDateTime(t.at)}</p>
                  {t.note && <p className="mt-1 text-[13px] text-ink-700">{t.note}</p>}
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>

      <StepUpModal open={stepUp} onClose={() => setStepUp(false)} onVerified={onVerified} actionLabel={multi ? `submit your decisions on ${request.ref}` : `approve ${request.ref}`} />
    </>
  );
}
