"use client";

import { RefreshCw } from "lucide-react";
import { Notice } from "@/components/ui/layout";
import { Modal } from "@/components/ui/modal";
import { ErrorState, Skeleton } from "@/components/ui/query-state";
import { CaseBody } from "./case-body";
import type { CaseDetail } from "@/lib/bo/types";

/**
 * Figma "Case Management – Case Details", on the real case record (read-only; cases are handled in CRM).
 * Pass the query result of one case; the modal shows loading, error and the sections.
 */
export function ApiCaseModal({
  open,
  onClose,

  query,
}: {
  open: boolean;
  onClose: () => void;

  query: { data?: CaseDetail; isLoading: boolean; isFetching: boolean; error: unknown; refetch: () => unknown };
}) {
  const c = query.data;
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Case Details"
      footer={
        <>
          <button type="button" onClick={onClose} className="h-10 rounded-lg px-4 text-sm font-medium text-ink-900 hover:bg-surface">Close</button>
          <button type="button" onClick={() => void query.refetch()} disabled={query.isFetching} className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent-500 px-4 text-sm font-medium text-white hover:bg-accent-600 disabled:opacity-60">
            <RefreshCw size={15} aria-hidden className={query.isFetching ? "animate-spin" : ""} /> Refresh Status
          </button>
        </>
      }
    >
      {query.isLoading ? (
        <div className="flex flex-col gap-3"><Skeleton className="h-16" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
      ) : query.error && !c ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} title="This case could not be loaded" />
      ) : c ? (
        <>
          {query.error ? <div className="mb-4"><Notice tone="warning" title="Not refreshed">CRM did not answer the last refresh. Showing the last confirmed details.</Notice></div> : null}
          <CaseBody c={c} />
        </>
      ) : null}
    </Modal>
  );
}
