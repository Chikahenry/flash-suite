"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { OtpInput } from "@/components/ui/otp-input";

/**
 * Fresh second factor before a sensitive action (approval, export).
 * POST /auth/step-up/challenge → POST /auth/step-up/verify, returning a token bound to this one action.
 * Mock rule: any 6 digits pass except 000000.
 */
export function StepUpModal({ open, onClose, onVerified, actionLabel }: { open: boolean; onClose: () => void; onVerified: () => void; actionLabel: string }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const close = () => { setCode(""); setError(null); onClose(); };
  const verify = () => {
    if (code.length < 6) return setError("Enter all 6 digits.");
    if (code === "000000") { setCode(""); return setError("That code is not valid. Try again."); }
    setCode("");
    setError(null);
    onVerified();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      size="sm"
      title="Confirm with your token"
      description={`Enter a fresh code to ${actionLabel}. The code is used once, for this action only.`}
      footer={<><Button variant="secondary" onClick={close}>Cancel</Button><Button onClick={verify}>Confirm</Button></>}
    >
      <div className="flex flex-col items-center gap-3 py-2">
        <span className="grid size-11 place-items-center rounded-full bg-accent-50 text-accent-700"><ShieldCheck size={20} aria-hidden /></span>
        <OtpInput value={code} onChange={(v) => { setCode(v); setError(null); }} invalid={!!error} autoFocus />
        {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      </div>
    </Modal>
  );
}
