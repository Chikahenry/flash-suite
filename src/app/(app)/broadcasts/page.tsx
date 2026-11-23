"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ActionDialog } from "@/components/ui/action-dialog";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Notice, PageHeader } from "@/components/ui/layout";
import { ErrorState } from "@/components/ui/query-state";
import { Pager } from "@/components/ui/toolbar";
import { formatApiDateTime, humanise } from "@/lib/bo/format";
import { useBroadcasts, usePublishBroadcast, type Broadcast } from "@/lib/bo/modules";
import { useUrlState } from "@/lib/bo/use-url-state";

const SIZE = 20;
const severityTone = { INFO: "info", WARNING: "warning", CRITICAL: "danger" } as const;

const columns: Column<Broadcast>[] = [
  { key: "title", header: "Title", cell: (b) => <span><span className="font-medium">{b.title}</span><span className="line-clamp-2 block max-w-[420px] text-xs text-ink-500">{b.message}</span></span> },
  { key: "type", header: "Type", cell: (b) => humanise(b.type) },
  { key: "sev", header: "Severity", cell: (b) => <Badge tone={severityTone[(b.severity ?? "INFO") as keyof typeof severityTone] ?? "neutral"}>{humanise(b.severity)}</Badge> },
  { key: "pub", header: "Published", cell: (b) => <span className="whitespace-nowrap tabular">{formatApiDateTime(b.publishedAt ?? b.createdAt)}</span> },
  { key: "exp", header: "Expires", cell: (b) => <span className="whitespace-nowrap tabular">{formatApiDateTime(b.expiresAt)}</span> },
];

// Bank announcements and security alerts shown to corporate users. GET /notifications,
// POST /notifications/announcements and /notifications/security-alerts. Publishing reaches customers at once.
export default function BroadcastsPage() {
  const url = useUrlState();
  const type = url.get("type");
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [form, setForm] = useState({ kind: "announcements" as "announcements" | "security-alerts", title: "", message: "", severity: "INFO", expiresAt: "" });
  const publish = usePublishBroadcast();
  const list = useBroadcasts({ type: type || undefined, page: url.page, size: SIZE });
  const rows = list.data?.data ?? [];
  const meta = list.data?.page;
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const ok = form.title.trim().length >= 3 && form.message.trim().length >= 3;

  return (
    <>
      <PageHeader title="Broadcasts" description="Announcements and security alerts shown to corporate users"
        actions={<button type="button" onClick={() => setOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent-500 px-4 text-sm font-medium text-white hover:bg-accent-600"><Plus size={16} aria-hidden /> New broadcast</button>} />
      {done && <div className="mb-4"><Notice tone="success" title="Published">{done}</Notice></div>}
      <div className="mb-4">
        <Select aria-label="Type" value={type} onChange={(e) => url.set({ type: e.target.value })} className="w-52">
          <option value="">All types</option><option value="BANK_ANNOUNCEMENT">Announcements</option><option value="SECURITY_ALERT">Security alerts</option>
        </Select>
      </div>
      {list.isError && !list.data ? <ErrorState error={list.error} onRetry={() => void list.refetch()} title="Broadcasts could not be loaded" /> : (
        <DataTable grid columns={columns} rows={rows} rowKey={(b) => b.id} loading={list.isLoading} empty="Nothing has been published yet."
          footer={<Pager page={meta?.page ?? url.page} totalPages={meta?.totalPages} total={meta?.total} size={meta?.size ?? SIZE} shown={rows.length} noun="broadcasts" onPage={(p) => url.set({ page: String(p) })} />} />
      )}

      <ActionDialog open={open} onClose={() => setOpen(false)} title="New broadcast" confirmLabel="Publish now" danger={form.kind === "security-alerts"} disabled={!ok}
        onConfirm={async () => {
          await publish.mutateAsync({ kind: form.kind, title: form.title.trim(), message: form.message.trim(), severity: form.severity, expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined });
          setDone(`“${form.title.trim()}” is now live.`);
          setForm({ kind: "announcements", title: "", message: "", severity: "INFO", expiresAt: "" });
        }}>
        <Notice tone="warning">This reaches corporate users as soon as you publish. Check the wording first.</Notice>
        <Field label="Type" htmlFor="bc-k"><Select id="bc-k" value={form.kind} onChange={set("kind")}><option value="announcements">Bank announcement</option><option value="security-alerts">Security alert</option></Select></Field>
        <Field label="Severity" htmlFor="bc-s"><Select id="bc-s" value={form.severity} onChange={set("severity")}><option value="INFO">Info</option><option value="WARNING">Warning</option><option value="CRITICAL">Critical</option></Select></Field>
        <Field label="Title" htmlFor="bc-t" required><Input id="bc-t" value={form.title} onChange={set("title")} maxLength={120} /></Field>
        <Field label="Message" htmlFor="bc-m" required><Textarea id="bc-m" value={form.message} onChange={set("message")} maxLength={1000} /></Field>
        <Field label="Expires (optional)" htmlFor="bc-e"><Input id="bc-e" type="datetime-local" value={form.expiresAt} onChange={set("expiresAt")} /></Field>
      </ActionDialog>
    </>
  );
}
