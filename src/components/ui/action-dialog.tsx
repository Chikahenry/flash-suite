"use client";

import { useState, type ReactNode } from "react";
import { ApiError } from "@/lib/bo/client";
import { Button } from "./button";
import { Field, Textarea } from "./form";
import { Notice } from "./layout";
import { Modal } from "./modal";

/**
 * A small confirm dialog for actions that run straight away on the back end.
 * Shows a spinner state while the call runs, keeps the dialog open with the Bank's message if it fails,
 * and closes only on success.
 */
export function ActionDialog({
  open,
  title,
  description,
  confirmLabel,
  danger,
  disabled,
  onClose,
  onConfirm,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  danger?: boolean;
  disabled?: boolean;
  onClose: () => void;
  onConfirm: () => Promise<unknown>;
  children?: ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (busy) return;
    setError(null);
    onClose();
  };

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      setBusy(false);
      onClose();
    } catch (e) {
      setBusy(false);
      setError(e instanceof ApiError ? e.message : "Something went wrong. Try again.");
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      size="sm"
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={busy}>Cancel</Button>
          <Button variant={danger ? "danger" : "primary"} onClick={run} disabled={busy || disabled}>{busy ? "Working…" : confirmLabel}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 pb-2">
        {children}
        {error && <Notice tone="danger">{error}</Notice>}
      </div>
    </Modal>
  );
}

/** ActionDialog that also asks for a reason, which the back end records with the action. */
export function ReasonDialog({
  open,
  title,
  description,
  confirmLabel,
  danger,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  danger?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<unknown>;
}) {
  const [reason, setReason] = useState("");
  return (
    <ActionDialog
      open={open}
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      danger={danger}
      disabled={reason.trim().length < 3}
      onClose={() => { setReason(""); onClose(); }}
      onConfirm={async () => { await onConfirm(reason.trim()); setReason(""); }}
    >
      <Field label="Reason" htmlFor="reason-text" required hint="Kept with the action for audit.">
        <Textarea id="reason-text" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} autoFocus />
      </Field>
    </ActionDialog>
  );
}
