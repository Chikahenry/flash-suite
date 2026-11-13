"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckCircle2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { Notice } from "@/components/ui/layout";
import { functionForPath, usePermissions } from "@/lib/permissions";
import { EvidencePicker, type EvidenceItem } from "./evidence-picker";

export interface RaiseRequestConfig {
  action: string;
  target: string;
  /** Mandatory evidence for this action, from GET /evidence/checklists. */
  evidence: string[];
  warning?: string;
  /** Extra inputs or a summary of what will change. */
  body?: ReactNode;
  danger?: boolean;
  /** When set, the maker must tick this statement before submitting (BRD CA003). */
  confirmText?: string;
  /**
   * Internal requests (staff access, roles, configuration) have no customer instruction,
   * so the instruction and channel fields are left out and the form follows the Figma modal:
   * the fields, then one full-width green button.
   */
  internal?: boolean;
  submitLabel?: string;
  /** Permission function to check instead of the current route's. */
  fn?: string;
}

const REASONS = ["Customer instruction", "Customer complaint", "Staff or signatory change", "Security concern", "Other"];
const INTERNAL_REASONS = ["New joiner", "Role change", "Branch transfer", "Staff exit", "Access review finding", "Configuration update", "Other"];
const CHANNELS = ["Branch visit", "Email (indemnity on file)", "Cross-branch", "Third-party submission"];

/**
 * One form for every maker action (POST /requests). The selected customer or user is passed in,
 * so staff only add what the action needs: reason, instruction and evidence (BRD UAM-014, 4.1).
 */
export function RaiseRequestModal({ config, onClose }: { config: RaiseRequestConfig | null; onClose: () => void }) {
  const pathname = usePathname();
  const { can, role } = usePermissions();
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [authorisedBy, setAuthorisedBy] = useState("");
  const [channel, setChannel] = useState(CHANNELS[0]);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  const close = () => {
    setReason(""); setDetails(""); setAuthorisedBy(""); setChannel(CHANNELS[0]);
    setEvidence([]); setConfirmed(false); setError(null); setSubmittedRef(null);
    onClose();
  };

  if (!config) return <Modal open={false} onClose={close} title="">{null}</Modal>;

  const reasons = config.internal ? INTERNAL_REASONS : REASONS;
  const chosenReason = reason || reasons[0];
  const allowed = can(config.fn ?? functionForPath(pathname), "Initiate");

  const submit = () => {
    if (!config.internal && !authorisedBy.trim()) return setError("Enter who authorised this instruction.");
    if (chosenReason === "Other" && !details.trim()) return setError("Describe the reason when you choose Other.");
    const missing = config.evidence.filter((e) => !evidence.some((x) => x.type === e));
    if (missing.length) return setError(`Attach the mandatory evidence: ${missing.join(", ")}.`);
    if (config.confirmText && !confirmed) return setError("Tick the confirmation before you submit.");
    setError(null);
    setSubmittedRef(`BO-2026-00${4822 + Math.floor(Math.random() * 100)}`);
  };

  if (!allowed) {
    return (
      <Modal open onClose={close} size="sm" title="You cannot start this request" footer={<Button variant="secondary" onClick={close}>Close</Button>}>
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <ShieldAlert size={36} className="text-amber-500" aria-hidden />
          <p className="text-sm text-ink-700">The role <span className="font-semibold text-ink-900">{role}</span> does not include permission to initiate <span className="font-semibold text-ink-900">{config.action}</span>. Ask IAM if you need it.</p>
        </div>
      </Modal>
    );
  }

  if (submittedRef) {
    return (
      <Modal open onClose={close} size="sm" title="Request submitted" footer={<Button variant="secondary" onClick={close}>Close</Button>}>
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <CheckCircle2 size={36} className="text-accent-500" aria-hidden />
          <p className="text-sm text-ink-700">
            <span className="font-semibold text-ink-900">{config.action}</span> for {config.target} is waiting for a checker.
            Nothing has changed yet.
          </p>
          <p className="rounded-lg bg-surface px-3 py-2 text-sm font-semibold tabular text-ink-900">{submittedRef}</p>
          <Link href="/requests?tab=mine" className="text-[13px] font-medium text-brand-700 hover:underline">Track it in My submissions</Link>
        </div>
      </Modal>
    );
  }

  const submitButton = (
    <Button variant={config.danger ? "danger" : "primary"} size={config.internal ? "lg" : "md"} block={config.internal} onClick={submit}>
      {config.submitLabel ?? "Submit for approval"}
    </Button>
  );

  return (
    <Modal
      open
      onClose={close}
      title={config.action}
      description={config.internal ? undefined : config.target}
      footer={config.internal ? undefined : <><Button variant="secondary" onClick={close}>Cancel</Button>{submitButton}</>}
    >
      <div className="flex flex-col gap-4">
        {config.warning && <Notice tone="warning">{config.warning}</Notice>}
        {config.body}
        {error && <Notice tone="danger">{error}</Notice>}

        {config.internal ? (
          <Field label="Reason" htmlFor="rr-reason" required>
            <Select id="rr-reason" value={chosenReason} onChange={(e) => setReason(e.target.value)}>
              {reasons.map((r) => <option key={r}>{r}</option>)}
            </Select>
          </Field>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Reason" htmlFor="rr-reason" required>
                <Select id="rr-reason" value={chosenReason} onChange={(e) => setReason(e.target.value)}>
                  {reasons.map((r) => <option key={r}>{r}</option>)}
                </Select>
              </Field>
              <Field label="Submission channel" htmlFor="rr-channel" required>
                <Select id="rr-channel" value={channel} onChange={(e) => setChannel(e.target.value)}>
                  {CHANNELS.map((c) => <option key={c}>{c}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Instruction authorised by" htmlFor="rr-auth" required hint="Name and capacity, for example a director or signatory.">
              <Input id="rr-auth" value={authorisedBy} onChange={(e) => setAuthorisedBy(e.target.value)} placeholder="e.g. Tunde Bakare (Director)" />
            </Field>
          </>
        )}

        {(chosenReason === "Other" || !config.internal) && (
          <Field label={chosenReason === "Other" ? "Details" : "Details (optional)"} htmlFor="rr-details" required={chosenReason === "Other"}>
            <Textarea id="rr-details" value={details} onChange={(e) => setDetails(e.target.value)} />
          </Field>
        )}

        <EvidencePicker required={config.evidence} value={evidence} onChange={(items) => { setEvidence(items); setError(null); }} />

        {config.confirmText && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <Checkbox label={<span className="font-medium text-red-800">{config.confirmText}</span>} checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
          </div>
        )}

        {config.internal && <div className="pt-1">{submitButton}</div>}
      </div>
    </Modal>
  );
}
