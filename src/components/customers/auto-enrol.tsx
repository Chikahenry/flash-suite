"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/layout";
import { Skeleton } from "@/components/ui/query-state";
import { useAutoEnrol, useAutoEnrolAction } from "@/lib/bo/customers";
import { humanise, statusTone } from "@/lib/bo/format";

type Act = "trigger" | "resend" | "revoke";

const COPY: Record<Act, { title: string; desc: string; label: string; danger?: boolean }> = {
  trigger: { title: "Send login details?", desc: "A temporary password is created and emailed to the customer with their username. They must change it at first login. Staff never see it.", label: "Yes, Send" },
  resend: { title: "Send new login details?", desc: "A new temporary password replaces the old one and is emailed to the customer. Their current sessions are ended and the old password stops working.", label: "Yes, Resend" },
  revoke: { title: "Revoke this customer's access?", desc: "Their sessions are ended and their digital login is disabled. The customer and their records are kept.", label: "Yes, Revoke", danger: true },
};

// Retail auto-enrolment for one customer. The Bank creates and emails the temporary credentials, and an email that fails to send is reported as a failure.
export function AutoEnrolPanel({ customerId, onDone }: { customerId: string; onDone: (message: string) => void }) {
  const state = useAutoEnrol(customerId);
  const run = useAutoEnrolAction(customerId);
  const [act, setAct] = useState<Act | null>(null);

  if (state.isLoading) return <Skeleton className="mt-6 h-16" />;
  if (state.isError || !state.data) {
    return <div className="mt-6"><Notice tone="warning" title="Digital access status unavailable">{state.error instanceof Error ? state.error.message : "It could not be loaded."}</Notice></div>;
  }

  const s = state.data;
  const status = s.status ?? "NOT_ENROLLED";
  const hasIdentity = s.retailIdentityPresent !== false;
  const canSend = hasIdentity && (status === "NOT_ENROLLED" || s.enabled === false);
  const canResend = hasIdentity && s.enabled !== false && status !== "NOT_ENROLLED";
  const canRevoke = hasIdentity && s.enabled !== false && status !== "NOT_ENROLLED";
  const link = "text-[13px] font-medium hover:underline";

  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white p-4">
      <div className="flex items-center gap-3">
        <span aria-hidden className="grid size-9 place-items-center rounded-full bg-brand-50 text-brand-800"><KeyRound size={16} /></span>
        <div>
          <p className="text-sm font-medium">Digital access</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-500">
            <Badge tone={status === "ACTIVE" ? "success" : statusTone(status)}>{humanise(status)}</Badge>
            {s.enabled === false && <Badge tone="danger">Disabled</Badge>}
            {status === "PENDING_FIRST_LOGIN" && "The customer has not yet changed the temporary password."}
            {!hasIdentity && "This customer has no digital identity yet."}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {canSend && <button type="button" onClick={() => setAct("trigger")} className={`${link} text-brand-700`}>Send login details</button>}
        {canResend && <button type="button" onClick={() => setAct("resend")} className={`${link} text-brand-700`}>Resend login details</button>}
        {canRevoke && <button type="button" onClick={() => setAct("revoke")} className={`${link} text-red-700`}>Revoke access</button>}
      </div>

      {act && (
        <ActionDialog open onClose={() => setAct(null)} danger={COPY[act].danger} title={COPY[act].title} description={COPY[act].desc} confirmLabel={COPY[act].label}
          onConfirm={async () => {
            const r = await run.mutateAsync(act);
            onDone(act === "revoke" ? "Digital access revoked." : `Login details sent${r.maskedEmail ? ` to ${r.maskedEmail}` : ""}.`);
          }} />
      )}
    </div>
  );
}
