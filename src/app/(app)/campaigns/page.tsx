"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Select } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/layout";
import { campaignTone } from "@/components/campaigns/bits";
import { campaigns, type Campaign } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

const columns: Column<Campaign>[] = [
  { key: "title", header: "Campaign", cell: (c) => (<div><Link href={`/campaigns/${c.id}`} className="font-medium text-brand-700 hover:underline">{c.title}</Link><p className="text-xs tabular text-ink-500">{c.id} · Brand ref {c.sourceRef} · v{c.version}</p></div>) },
  { key: "channels", header: "Channels", cell: (c) => <div className="flex flex-wrap gap-1">{c.channels.map((ch) => <Badge key={ch} tone="neutral" dot={false}>{ch}</Badge>)}</div> },
  { key: "start", header: "Starts", cell: (c) => <span className="tabular">{formatDateTime(c.start)}</span> },
  { key: "end", header: "Ends", cell: (c) => <span className="tabular">{formatDateTime(c.end)}</span> },
  { key: "maker", header: "Maker", cell: (c) => c.maker },
  { key: "status", header: "Status", cell: (c) => <Badge tone={campaignTone[c.status]}>{c.status}</Badge> },
];

// Campaign publication (BRD 11.2.2). Brand writes the content; Support enters and approves publication.
export default function CampaignsPage() {
  const [status, setStatus] = useState("");
  const rows = campaigns.filter((c) => !status || c.status === status);
  return (
    <>
      <PageHeader
        title="Campaigns"
        description="Publish Brand-supplied campaigns to the channels. Times are West Africa Time. Only an approved version is ever displayed."
        actions={<Link href="/campaigns/new" className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent-500 px-4 text-sm font-medium text-white hover:bg-accent-600"><Plus size={16} aria-hidden /> New campaign</Link>}
      />
      <div className="mb-4">
        <Select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className="w-52">
          <option value="">All statuses</option>
          {Object.keys(campaignTone).map((s) => <option key={s}>{s}</option>)}
        </Select>
      </div>
      <DataTable columns={columns} rows={rows} rowKey={(c) => c.id} empty="No campaign matches." />
    </>
  );
}
