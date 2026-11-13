"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { isOverdue } from "@/lib/api";
import { formatAge, formatDateTime, requestStatusLabel, requestStatusTone } from "@/lib/format";
import type { BackOfficeRequest, RequestStatus } from "@/lib/types";

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  return <Badge tone={requestStatusTone[status]}>{requestStatusLabel[status]}</Badge>;
}

/** Age against the configured target. With no target, shows the age only (BRD TAT003). */
export function AgeCell({ request }: { request: BackOfficeRequest }) {
  if (request.targetHours === undefined) {
    return (
      <span className="tabular">
        {formatAge(request.ageHours)} <span className="text-xs text-ink-500">· Target not configured</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 tabular">
      {formatAge(request.ageHours)}
      {isOverdue(request) ? <Badge tone="danger">Overdue</Badge> : <span className="text-xs text-ink-500">of {formatAge(request.targetHours)}</span>}
    </span>
  );
}

const columns: Column<BackOfficeRequest>[] = [
  {
    key: "ref",
    header: "Reference",
    cell: (r) => (
      <Link href={`/requests/${r.ref}`} className="font-medium text-brand-700 hover:underline">{r.ref}</Link>
    ),
  },
  { key: "action", header: "Action", cell: (r) => (<div><p className="font-medium">{r.action}</p><p className="text-xs text-ink-500">{r.target}</p></div>) },
  { key: "module", header: "Module", cell: (r) => r.module },
  { key: "maker", header: "Maker", cell: (r) => r.maker },
  { key: "submitted", header: "Submitted", cell: (r) => <span className="tabular">{formatDateTime(r.submittedAt)}</span> },
  { key: "age", header: "Age", cell: (r) => <AgeCell request={r} /> },
  { key: "status", header: "Status", cell: (r) => <RequestStatusBadge status={r.status} /> },
];

export function RequestTable({ rows, empty }: { rows: BackOfficeRequest[]; empty?: string }) {
  return <DataTable columns={columns} rows={rows} rowKey={(r) => r.ref} empty={empty} />;
}
