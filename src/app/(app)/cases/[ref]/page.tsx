"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Copy, ExternalLink, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReadOnlyField } from "@/components/ui/form";
import { Card, DefinitionGrid, EmptyState, Notice, PageHeader, SourceStamp } from "@/components/ui/layout";
import { caseTone, slaTone } from "@/components/ops/tables";
import { cases } from "@/lib/api";
import { formatDateTime, formatNaira } from "@/lib/format";

// One CRM case, read-only (BRD CDS-003..005). GET /cases/{crmRef}, /evidence, /crm-link.
export default function CasePage() {
  const { ref } = useParams<{ ref: string }>();
  const c = cases.find((x) => x.ref === ref);
  const [copied, setCopied] = useState(false);

  if (!c) {
    return <EmptyState title="No related case found" body="Open CRM to search for or log the case." action={<Link href="/cases" className="text-sm font-medium text-brand-700">Back to cases</Link>} />;
  }

  return (
    <>
      <PageHeader
        back={<Link href="/cases" className="inline-flex items-center gap-1 text-[13px] text-ink-500 hover:text-ink-900"><ArrowLeft size={14} aria-hidden /> Cases</Link>}
        title={`${c.category}: ${c.subcategory}`}
        description={`${c.ref} · Tracking no. ${c.tracking}`}
        actions={
          <>
            <Badge tone={caseTone[c.status]}>{c.status}</Badge>
            <Button variant="secondary" onClick={() => { navigator.clipboard?.writeText(c.ref); setCopied(true); }}><Copy size={14} aria-hidden /> {copied ? "Copied" : "Copy reference"}</Button>
            <Button><ExternalLink size={14} aria-hidden /> Open in CRM</Button>
          </>
        }
      />

      {c.refreshFailed && <div className="mb-5"><Notice tone="warning" title="Not refreshed">CRM did not answer the last refresh. Showing information confirmed at {formatDateTime(c.updated)}.</Notice></div>}

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-6">
          <Card title="Case" actions={<SourceStamp source="CRM" at={c.updated} stale={c.refreshFailed} />}>
            <DefinitionGrid>
              <ReadOnlyField label="Customer" value={<Link href={`/customers/${c.cif}`} className="text-brand-700 hover:underline">{c.customer}</Link>} />
              <ReadOnlyField label="Account" value={<span className="tabular">{c.account}</span>} />
              <ReadOnlyField label="Amount in dispute" value={c.amount ? <span className="tabular">{formatNaira(c.amount)}</span> : "None"} />
              <ReadOnlyField label="Assigned team" value={c.team} />
              <ReadOnlyField label="Submitted" value={formatDateTime(c.created)} />
              <ReadOnlyField label="Transaction" value={c.txnRef ? <Link href={`/transactions/${c.txnRef}`} className="tabular text-brand-700 hover:underline">{c.txnRef}</Link> : "None linked"} />
            </DefinitionGrid>
            <div className="mt-5 border-t border-line pt-4">
              <p className="text-xs text-ink-500">Description</p>
              <p className="mt-1 text-sm">{c.description}</p>
            </div>
            {c.resolution && (
              <div className="mt-4 rounded-lg bg-accent-50 p-3">
                <p className="text-xs font-medium text-accent-700">Resolution</p>
                <p className="mt-1 text-sm">{c.resolution}</p>
              </div>
            )}
          </Card>

          <Card title="Evidence">
            {c.evidence.length === 0 ? <p className="text-[13px] text-ink-500">CRM supplied no evidence for this case.</p> : (
              <ul className="flex flex-col gap-2">
                {c.evidence.map((e) => (
                  <li key={e.name} className="flex items-center gap-3 rounded-lg border border-line px-3 py-2.5">
                    <FileText size={16} className="text-ink-500" aria-hidden />
                    <span className="flex-1 truncate text-sm">{e.name}</span>
                    {e.available ? <Button variant="ghost" size="sm">View</Button> : <Badge tone="warning">Unavailable</Badge>}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-ink-500">Evidence follows your CRM permissions. Each view or download is recorded in the audit log.</p>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card title="SLA position (from CRM)">
            <div className="flex flex-col gap-3 text-[13px]">
              <div className="flex items-center justify-between"><span className="text-ink-700">First response</span><Badge tone={slaTone[c.slaFirst]}>{c.slaFirst}</Badge></div>
              <div className="flex items-center justify-between"><span className="text-ink-700">Resolution</span><Badge tone={slaTone[c.slaResolution]}>{c.slaResolution}</Badge></div>
              <p className="text-xs text-ink-500">CRM calculates these. The Back Office does not set a separate deadline.</p>
            </div>
          </Card>
          <Card title="Investigation progress">
            <ol className="flex flex-col gap-4">
              {c.progress.map((p, i) => (
                <li key={i} className="relative pl-5">
                  <span aria-hidden className="absolute left-0 top-1.5 size-2 rounded-full bg-brand-600" />
                  <p className="text-sm">{p.text}</p>
                  <p className="text-xs tabular text-ink-500">{formatDateTime(p.at)}</p>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}
