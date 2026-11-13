"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Input, Select } from "@/components/ui/form";
import { PageHeader, SourceStamp } from "@/components/ui/layout";
import { listOrganizations } from "@/lib/api";
import { formatDateTime, orgStatusTone } from "@/lib/format";
import type { Organization } from "@/lib/types";
import { SourceBanner } from "@/components/ui/source-banner";

const columns: Column<Organization>[] = [
  {
    key: "name",
    header: "Organisation",
    cell: (o) => (
      <div>
        <Link href={`/corporate/${o.id}`} className="font-medium text-brand-700 hover:underline">{o.name}</Link>
        <p className="text-xs tabular text-ink-500">{o.id}</p>
      </div>
    ),
  },
  { key: "cif", header: "CIF", cell: (o) => <span className="tabular">{o.cif}</span> },
  { key: "segment", header: "Segment", cell: (o) => <Badge tone={o.segment === "Corporate" ? "info" : "neutral"} dot={false}>{o.segment}</Badge> },
  { key: "users", header: "Users", align: "right", cell: (o) => o.users.length },
  { key: "accounts", header: "Linked accounts", align: "right", cell: (o) => o.accounts.filter((a) => a.linked).length },
  { key: "branch", header: "Branch", cell: (o) => o.branch },
  { key: "status", header: "Status", cell: (o) => <Badge tone={orgStatusTone[o.status]}>{o.status}</Badge> },
  { key: "updated", header: "Last updated", cell: (o) => <span className="tabular text-ink-500">{formatDateTime(o.lastUpdated)}</span> },
];

// Organisation search and list. GET /organizations, GET /search.
export default function CorporatePage() {
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [segment, setSegment] = useState("");
  const [status, setStatus] = useState("");

  const rows = listOrganizations().filter((o) => {
    const text = `${o.name} ${o.cif} ${o.id} ${o.accounts.map((a) => a.number).join(" ")} ${o.users.map((u) => u.username).join(" ")}`.toLowerCase();
    return text.includes(q.toLowerCase()) && (!segment || o.segment === segment) && (!status || o.status === status);
  });

  return (
    <>
      <PageHeader
        title="Corporate & SME"
        description="Find an organisation by name, CIF, account number or username, then act on it without searching again."
        actions={
          <Link href="/corporate/new" className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent-500 px-4 text-sm font-medium text-white hover:bg-accent-600">
            <Plus size={16} aria-hidden /> Set up organisation
          </Link>
        }
      />
      <SourceBanner source="Corporate/SME platform" affects="Organisations and users" />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="w-full max-w-sm">
          <Input aria-label="Search organisations" placeholder="Name, CIF, account number or username" value={q} onChange={(e) => setQ(e.target.value)} icon={<Search size={16} />} />
        </div>
        <Select aria-label="Segment" value={segment} onChange={(e) => setSegment(e.target.value)} className="w-40">
          <option value="">All segments</option>
          <option>Corporate</option>
          <option>SME</option>
        </Select>
        <Select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className="w-44">
          <option value="">All statuses</option>
          <option>Active</option>
          <option>Pending setup</option>
          <option>Deactivated</option>
        </Select>
        <span className="ml-auto"><SourceStamp source="Corporate platform" at="2026-11-11T12:20:00" /></span>
      </div>

      <DataTable columns={columns} rows={rows} rowKey={(o) => o.id} empty="No organisation matches. Check the search, or set up a new organisation." />
    </>
  );
}
