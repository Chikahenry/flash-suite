"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Copy, ExternalLink, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReadOnlyField } from "@/components/ui/form";
import { Card, DefinitionGrid, EmptyState, Notice, PageHeader, SourceStamp } from "@/components/ui/layout";
import { CaseTable, TxnStatusBadge, txnTone } from "@/components/ops/tables";
import { cases, transactions } from "@/lib/api";
import { formatDateTime, formatNaira, maskAccount } from "@/lib/format";
import { SourceBanner } from "@/components/ui/source-banner";

const legTone = (v: string) => (v === "Confirmed" ? "success" : v === "Unknown" ? "warning" : "neutral") as "success" | "warning" | "neutral";

// One transaction (BRD TMM-004..011): references, debit and credit outcomes, response code, reversal status.
// GET /transactions/{ref}; POST /transactions/{ref}/refresh re-queries status and never re-debits.
export default function TransactionPage() {
  const { ref } = useParams<{ ref: string }>();
  const txn = transactions.find((t) => t.ref === ref);
  const [refresh, setRefresh] = useState<"idle" | "ok" | "failed">("idle");
  const [copied, setCopied] = useState(false);

  if (!txn) {
    return <EmptyState title="Transaction not found" body="Check the reference and search again, or enquire against the source." action={<Link href="/transactions" className="text-sm font-medium text-brand-700">Back to transactions</Link>} />;
  }

  const related = cases.filter((c) => txn.caseRefs.includes(c.ref));
  const uncertain = txn.status === "Pending" || txn.status === "Unknown" || txn.status === "Partially successful";
  // Mock: the NIP switch is down, so refreshing an NIP transfer fails; everything else succeeds.
  const doRefresh = () => setRefresh(txn.providerRef?.startsWith("NIP") && uncertain ? "failed" : "ok");
  const copy = () => { navigator.clipboard?.writeText(txn.ref); setCopied(true); };

  return (
    <>
      <PageHeader
        back={<Link href="/transactions" className="inline-flex items-center gap-1 text-[13px] text-ink-500 hover:text-ink-900"><ArrowLeft size={14} aria-hidden /> Transactions</Link>}
        title={`${txn.type} · ${formatNaira(txn.amount)}`}
        description={`${txn.ref} · ${formatDateTime(txn.date)}`}
        actions={
          <>
            <TxnStatusBadge status={txn.status} />
            <Button variant="secondary" onClick={doRefresh}><RefreshCw size={14} aria-hidden /> Refresh status</Button>
            <Button variant="secondary" onClick={copy}><Copy size={14} aria-hidden /> {copied ? "Copied" : "Copy reference"}</Button>
            <Button variant="secondary"><ExternalLink size={14} aria-hidden /> Log in CRM</Button>
          </>
        }
      />

      <SourceBanner source="NIP switch (NIBSS)" affects="This transaction's status" />
      <div className="mb-5 flex flex-col gap-3">
        {refresh === "ok" && <Notice tone="success">Status checked just now. No new debit was made. The source status is unchanged.</Notice>}
        {refresh === "failed" && <Notice tone="warning" title="Not refreshed">The source did not answer. Showing the last confirmed status from {formatDateTime(txn.lastUpdated)}.</Notice>}
        {txn.status === "Failed" && <Notice tone="danger" title="Failure reason">{txn.failureReason ?? "Failure reason unavailable."}</Notice>}
        {txn.debit === "Confirmed" && txn.credit !== "Confirmed" && txn.status !== "Completed" && (
          <Notice tone="warning">The debit is confirmed but credit is not. Refer this through CRM. The Back Office cannot reverse, refund or retry a transaction.</Notice>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-6">
          <Card title="Transaction" actions={<SourceStamp source="Processing system" at={txn.lastUpdated} stale={refresh === "failed"} />}>
            <DefinitionGrid>
              <ReadOnlyField label="Customer" value={txn.cif.startsWith("ORG") ? <Link className="text-brand-700 hover:underline" href={`/corporate/${txn.cif}`}>{txn.customer}</Link> : <Link className="text-brand-700 hover:underline" href={`/customers/${txn.cif}`}>{txn.customer}</Link>} />
              <ReadOnlyField label="Account" value={<span className="tabular">{maskAccount(txn.account)}</span>} />
              <ReadOnlyField label="Amount" value={<span className="tabular">{formatNaira(txn.amount)} {txn.currency}</span>} />
              <ReadOnlyField label="Channel" value={txn.channel} />
              <ReadOnlyField label="Type" value={txn.type} />
              <ReadOnlyField label="Beneficiary" value={txn.beneficiary} />
              <ReadOnlyField label="Destination bank" value={txn.bank} />
              <ReadOnlyField label="Response code" value={<span className="tabular">{txn.responseCode}</span>} />
              <ReadOnlyField label="Enquiry time" value={refresh === "ok" ? "Just now" : formatDateTime(txn.lastUpdated)} />
            </DefinitionGrid>
          </Card>

          <Card title="References and outcomes">
            <DefinitionGrid>
              <ReadOnlyField label="Channel reference" value={<span className="tabular">{txn.ref}</span>} />
              <ReadOnlyField label="Core banking reference" value={<span className="tabular">{txn.coreRef}</span>} />
              <ReadOnlyField label="Provider reference" value={<span className="tabular">{txn.providerRef ?? "Not supplied"}</span>} />
              <ReadOnlyField label="Session ID" value={<span className="tabular break-all">{txn.sessionId}</span>} />
              <ReadOnlyField label="Debit" value={<Badge tone={legTone(txn.debit)}>{txn.debit}</Badge>} />
              <ReadOnlyField label="Credit / fulfilment" value={<Badge tone={legTone(txn.credit)}>{txn.credit}</Badge>} />
              <ReadOnlyField label="Reversal (source-reported)" value={<Badge tone={txn.reversal === "None" ? "neutral" : "info"}>{txn.reversal}</Badge>} />
            </DefinitionGrid>
            {txn.conflict && (
              <div className="mt-5 border-t border-line pt-4">
                <Notice tone="warning" title="Sources disagree">
                  <ul className="mt-1 list-disc pl-4">
                    {txn.conflict.map((c) => <li key={c.source}>{c.source}: {c.status} at {formatDateTime(c.at)}</li>)}
                  </ul>
                </Notice>
              </div>
            )}
          </Card>

          {txn.batch && (
            <Card title={`Batch items (${txn.batch.length})`} padded={false}>
              <div className="px-5 pt-4"><Notice tone="info">Batch status and item status are separate. Completed items are never resubmitted, and payments cannot be retried here.</Notice></div>
              <ul className="mt-3 divide-y divide-line">
                {txn.batch.map((b) => (
                  <li key={b.ref} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3.5">
                    <div>
                      <p className="text-sm font-medium">{b.beneficiary}</p>
                      <p className="text-xs tabular text-ink-500">{b.ref}</p>
                      {b.status === "Failed" && <p className="mt-1 text-[13px] text-red-700">{b.failureReason ?? "Failure reason unavailable."}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium tabular">{formatNaira(b.amount)}</span>
                      <Badge tone={txnTone[b.status]}>{b.status}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <Card title={`Related CRM cases (${related.length})`} padded={false}>
          <div className="p-3">
            {related.length === 0 ? (
              <p className="px-2 py-4 text-[13px] text-ink-500">No related case. Use Log in CRM to raise one; the transaction reference is passed across, or copy it.</p>
            ) : (
              <CaseTable rows={related} />
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
