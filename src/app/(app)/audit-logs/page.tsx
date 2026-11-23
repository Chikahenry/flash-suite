"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Field, Input, ReadOnlyField } from "@/components/ui/form";
import { DefinitionGrid, PageHeader } from "@/components/ui/layout";
import { Modal } from "@/components/ui/modal";
import { ErrorState } from "@/components/ui/query-state";
import { DateRangeButton, FiltersButton, Pager, SearchField, Toolbar } from "@/components/ui/toolbar";
import { useAuditEvent, useAuditEvents, type AuditEvent } from "@/lib/bo/audit";
import { formatApiDateTime, humanise, statusTone } from "@/lib/bo/format";

const SIZE = 20;
const when = (e: AuditEvent) => e.eventTime ?? e.createdAt;

/** A filter box that applies when you leave it or press Enter, so typing does not fire a request per letter. */
function FilterInput({ id, label, value, onApply, placeholder }: { id: string; label: string; value: string; onApply: (v: string) => void; placeholder?: string }) {
  const [text, setText] = useState(value);
  const [seen, setSeen] = useState(value);
  if (seen !== value) { setSeen(value); setText(value); }
  return (
    <Field label={label} htmlFor={id}>
      <Input id={id} value={text} placeholder={placeholder} onChange={(e) => setText(e.target.value)} onBlur={() => text.trim() !== value && onApply(text.trim())} onKeyDown={(e) => e.key === "Enter" && onApply(text.trim())} />
    </Field>
  );
}

// Figma "Audit Logs": Time Stamp, User, Action. Read-only: records cannot be changed or deleted here.
// GET /audit/events (and /audit/events/{eventId}). Filters and page live in the address bar.
export default function AuditLogsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const page = Math.max(1, Number(params.get("page")) || 1);
  const search = params.get("q") ?? "";
  const eventType = params.get("eventType") ?? "";
  const entityType = params.get("entityType") ?? "";
  const actorId = params.get("actorId") ?? "";
  const channel = params.get("channel") ?? "";
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";

  const setParams = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!("page" in patch)) next.delete("page");
    const t = next.toString();
    router.replace(t ? `${pathname}?${t}` : pathname, { scroll: false });
  };

  const [text, setText] = useState(search);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const onSearch = (v: string) => {
    setText(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setParams({ q: v.trim() }), 400);
  };

  const [openId, setOpenId] = useState<string | null>(null);
  const list = useAuditEvents({ search, eventType, entityType, actorId, channel, from, to, page, size: SIZE });
  const rows = list.data?.data ?? [];
  const meta = list.data?.page;
  const opened = rows.find((r) => r.eventId === openId);
  const detail = useAuditEvent(openId);
  const event = detail.data ?? opened;

  const columns: Column<AuditEvent>[] = [
    { key: "at", header: "Time Stamp", className: "w-[200px]", cell: (e) => <span className="whitespace-nowrap tabular">{formatApiDateTime(when(e))}</span> },
    { key: "actor", header: "User", className: "w-[260px]", cell: (e) => <span className="break-all">{e.actorId ?? "—"}{e.actorType && <span className="ml-2 text-xs text-ink-500">{humanise(e.actorType)}</span>}</span> },
    {
      key: "action", header: "Action",
      cell: (e) => (
        <button type="button" onClick={() => setOpenId(e.eventId)} className="text-left hover:underline">
          <span className="font-medium text-accent-700">{humanise(e.eventType)}</span>
          {e.description ? <span className="text-ink-700"> · {e.description}</span> : e.entityType ? <span className="text-ink-700"> · {humanise(e.entityType)} {e.entityId}</span> : null}
        </button>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Audit Logs" />
      <Toolbar>
        <SearchField value={text} onChange={onSearch} placeholder="Search audit events" />
        <FiltersButton active={[eventType, entityType, actorId, channel].filter(Boolean).length}>
          <FilterInput id="a-type" label="Event type" value={eventType} onApply={(v) => setParams({ eventType: v })} placeholder="e.g. LOGIN_SUCCESS" />
          <FilterInput id="a-entity" label="Entity type" value={entityType} onApply={(v) => setParams({ entityType: v })} />
          <FilterInput id="a-actor" label="User ID" value={actorId} onApply={(v) => setParams({ actorId: v })} />
          <FilterInput id="a-channel" label="Channel" value={channel} onApply={(v) => setParams({ channel: v })} placeholder="e.g. BACKOFFICE" />
        </FiltersButton>
        <DateRangeButton from={from} to={to} onChange={(f, t) => setParams({ from: f, to: t })} />
      </Toolbar>

      {list.isError && !list.data ? (
        <ErrorState error={list.error} onRetry={() => void list.refetch()} title="Audit events could not be loaded" />
      ) : (
        <DataTable
          headerFill
          columns={columns}
          rows={rows}
          rowKey={(e) => e.eventId}
          loading={list.isLoading}
          empty="No audit record matches these filters."
          footer={<Pager page={meta?.page ?? page} totalPages={meta?.totalPages} total={meta?.total} size={meta?.size ?? SIZE} shown={rows.length} noun="entries" onPage={(p) => setParams({ page: String(p) })} />}
        />
      )}

      <Modal open={!!openId} onClose={() => setOpenId(null)} title={event ? humanise(event.eventType) : "Audit event"} description={event ? `${event.eventId} · ${formatApiDateTime(when(event))}` : undefined} footer={<Button variant="secondary" onClick={() => setOpenId(null)}>Close</Button>}>
        {event && (
          <div className="flex flex-col gap-4 pb-2">
            {event.description && <p className="text-sm text-ink-900">{event.description}</p>}
            <DefinitionGrid cols={2}>
              <ReadOnlyField label="User" value={event.actorId ?? "—"} />
              <ReadOnlyField label="User type" value={humanise(event.actorType)} />
              <ReadOnlyField label="Channel" value={humanise(event.channel)} />
              <ReadOnlyField label="IP address" value={event.ipAddress ?? "—"} />
              <ReadOnlyField label="Affected record" value={event.entityType ? `${humanise(event.entityType)} ${event.entityId ?? ""}` : "—"} />
              <ReadOnlyField label="Integrity" value={event.integrityStatus ? <Badge tone={statusTone(event.integrityStatus === "TAMPERED" ? "FAILED" : event.integrityStatus)}>{humanise(event.integrityStatus)}</Badge> : "—"} />
              <ReadOnlyField label="Correlation ID" value={<span className="break-all tabular">{event.correlationId ?? "—"}</span>} />
            </DefinitionGrid>
            {(event.before || event.after) && (
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-line p-3 text-sm">
                <div className="min-w-0"><p className="text-xs text-ink-500">Previous value</p><p className="mt-1 break-words">{event.before ?? "None"}</p></div>
                <div className="min-w-0"><p className="text-xs text-ink-500">Resulting value</p><p className="mt-1 break-words font-medium">{event.after ?? "None"}</p></div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
