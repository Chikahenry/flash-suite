"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Copy, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReadOnlyField } from "@/components/ui/form";
import { Card, DefinitionGrid, Notice, PageHeader } from "@/components/ui/layout";
import { ErrorState, Skeleton } from "@/components/ui/query-state";
import { downloadFile } from "@/lib/bo/download";
import { formatApiDateTime, formatMoney, humanise, statusTone } from "@/lib/bo/format";
import { useTransaction, useTransactionTimeline } from "@/lib/bo/ops";

// One transaction (BRD TMM-004..011): references, outcome, batch items and the step-by-step timeline.
// GET /transactions/{id}, /transactions/{id}/timeline and /transactions/{id}/receipt. Read-only: nothing here retries or reverses.
export default function TransactionPage() {
  const { ref } = useParams<{ ref: string }>();
  const id = decodeURIComponent(ref);
  const detail = useTransaction(id);
  const timeline = useTransactionTimeline(id);
  const [copied, setCopied] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);

  const back = <Link href="/transactions" className="inline-flex items-center gap-1 text-[13px] text-ink-500 hover:text-ink-900"><ArrowLeft size={14} aria-hidden /> Transactions</Link>;

  if (detail.isLoading) return <><PageHeader back={back} title="Transaction" /><Skeleton className="h-64" /></>;
  if (detail.isError || !detail.data) return <><PageHeader back={back} title="Transaction" /><ErrorState error={detail.error} onRetry={() => void detail.refetch()} title="This transaction could not be loaded" /></>;

  const { transaction: t, items = [] } = detail.data;
  const copy = () => { void navigator.clipboard?.writeText(t.reference ?? t.id); setCopied(true); };
  const receipt = async () => setReceiptError(await downloadFile(`/transactions/${encodeURIComponent(id)}/receipt`, {}, `receipt-${t.reference ?? t.id}.pdf`));
  const failed = /FAIL/i.test(t.status ?? "");

  return (
    <>
      <PageHeader back={back} title={`${humanise(t.type)} · ${formatMoney(t.amount, t.currency ?? "NGN")}`} description={`${t.reference ?? t.id} · ${formatApiDateTime(t.createdAt)}`}
        actions={<>
          <Badge tone={statusTone(t.status)}>{humanise(t.status)}</Badge>
          <Button variant="secondary" onClick={() => void receipt()}><Download size={14} aria-hidden /> Receipt</Button>
          <Button variant="secondary" onClick={copy}><Copy size={14} aria-hidden /> {copied ? "Copied" : "Copy reference"}</Button>
        </>} />

      {receiptError && <div className="mb-4"><Notice tone="danger">{receiptError}</Notice></div>}
      {failed && items.some((i) => i.failureReason) && <div className="mb-4"><Notice tone="danger" title="Failure reason">{items.find((i) => i.failureReason)?.failureReason}</Notice></div>}

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-6">
          <Card title="Transaction">
            <DefinitionGrid>
              <ReadOnlyField label="Source account" value={<span className="tabular">{t.sourceAccount ?? "—"}</span>} />
              <ReadOnlyField label="Account name" value={t.sourceAccountName ?? "—"} />
              <ReadOnlyField label="Amount" value={<span className="tabular">{formatMoney(t.amount, t.currency ?? "NGN")}</span>} />
              <ReadOnlyField label="Channel" value={humanise(t.channel)} />
              <ReadOnlyField label="Type" value={humanise(t.type)} />
              <ReadOnlyField label="Items" value={t.itemCount ?? items.length} />
              <ReadOnlyField label="Initiated by" value={t.makerUsername ?? "—"} />
              <ReadOnlyField label="Approved by" value={t.approverUsername ?? "—"} />
              <ReadOnlyField label="Submitted" value={formatApiDateTime(t.submittedAt)} />
              <ReadOnlyField label="Approved" value={formatApiDateTime(t.approvedAt)} />
              <ReadOnlyField label="Last updated" value={formatApiDateTime(t.updatedAt)} />
            </DefinitionGrid>
          </Card>

          <Card title="References">
            <DefinitionGrid>
              <ReadOnlyField label="Channel reference" value={<span className="tabular">{t.reference ?? "—"}</span>} />
              <ReadOnlyField label="Bank reference" value={<span className="tabular">{t.bankReference ?? "Not supplied"}</span>} />
            </DefinitionGrid>
          </Card>

          {items.length > 0 && (
            <Card title={`Items (${items.length})`} padded={false}>
              <div className="px-5 pt-4"><Notice tone="info">Batch status and item status are separate. Payments cannot be retried here.</Notice></div>
              <ul className="mt-3 divide-y divide-line">
                {items.map((b, i) => (
                  <li key={`${b.reference ?? i}`} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3.5">
                    <div>
                      <p className="text-sm font-medium">{b.beneficiaryName ?? "—"}</p>
                      <p className="text-xs text-ink-500"><span className="tabular">{b.accountNumber}</span>{b.bankName ? ` · ${b.bankName}` : ""}</p>
                      <p className="text-xs tabular text-ink-500">{b.reference}{b.providerReference ? ` · ${b.providerReference}` : ""}</p>
                      {b.failureReason && <p className="mt-1 text-[13px] text-red-700">{b.failureReason}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium tabular">{formatMoney(b.amount, b.currency ?? t.currency ?? "NGN")}</span>
                      <Badge tone={statusTone(b.status)}>{humanise(b.status)}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <Card title="Timeline" padded={false}>
          <div className="p-5">
            {timeline.isLoading ? <Skeleton className="h-24" /> : timeline.isError ? <ErrorState error={timeline.error} onRetry={() => void timeline.refetch()} /> : (timeline.data ?? []).length === 0 ? (
              <p className="text-[13px] text-ink-500">No steps recorded yet.</p>
            ) : (
              <ol className="flex flex-col gap-4 border-l border-line pl-4">
                {(timeline.data ?? []).map((e, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full bg-accent-500" aria-hidden />
                    <p className="text-sm font-medium">{humanise(e.event ?? e.status)}</p>
                    <p className="text-xs text-ink-500">{e.previousStatus ? `${humanise(e.previousStatus)} → ` : ""}{humanise(e.status)}</p>
                    <p className="text-xs tabular text-ink-500">{formatApiDateTime(e.occurredAt)}{e.actor ? ` · ${e.actor}` : ""}</p>
                    {e.reason && <p className="mt-1 text-[13px] text-ink-700">{e.reason}</p>}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
