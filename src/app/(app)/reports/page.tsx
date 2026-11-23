"use client";

import { useState } from "react";
import { Download, FileBarChart, Pause, Play, Play as Run, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Field, Input, Select } from "@/components/ui/form";
import { Card, Notice, PageHeader, Tabs } from "@/components/ui/layout";
import { RefreshButton } from "@/components/ui/refresh-button";
import { Modal } from "@/components/ui/modal";
import { ErrorState, Skeleton } from "@/components/ui/query-state";
import { Pager } from "@/components/ui/toolbar";
import { ApiError } from "@/lib/bo/client";
import { downloadFile } from "@/lib/bo/download";
import { formatApiDateTime, humanise, statusTone } from "@/lib/bo/format";
import {
  useCreateSchedule, useDeleteSchedule, useGenerateReport, useReportCatalog, useReportHistory, useReportOptions, useRunSchedule, useSchedules, useUpdateSchedule,
  type ReportCatalogEntry, type ReportRequest, type ReportSchedule,
} from "@/lib/bo/ops";

type Tab = "catalogue" | "history" | "schedules";
const SIZE = 20;
const FREQUENCIES = ["DAILY", "WEEKLY", "MONTHLY"];
const kb = (n?: number) => (n === undefined ? "" : n > 1_048_576 ? `${(n / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

// Reports (BRD 14.2 DRA009..011): GET /reports/catalog, POST /reports/generate, GET /reports/history (+ /download),
// and recurring schedules at /reports/schedules. Downloads go through the proxy, so access is rechecked each time.
export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>("catalogue");
  const [page, setPage] = useState(1);
  const catalog = useReportCatalog();
  const options = useReportOptions();
  const history = useReportHistory(page, SIZE);
  const schedules = useSchedules();
  const generate = useGenerateReport();
  const createSchedule = useCreateSchedule();
  const updateSchedule = useUpdateSchedule();
  const deleteSchedule = useDeleteSchedule();
  const runSchedule = useRunSchedule();

  const [picked, setPicked] = useState<ReportCatalogEntry | null>(null);
  const [scheduling, setScheduling] = useState(false);
  const [removing, setRemoving] = useState<ReportSchedule | null>(null);
  const [form, setForm] = useState({ format: "", from: "", to: "", status: "", channel: "", type: "", name: "", frequency: "DAILY" });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const request = (): ReportRequest | null => {
    if (!picked) return null;
    if (form.from && form.to && form.to < form.from) { setError("The end date is before the start date."); return null; }
    return { reportType: picked.reportType, format: form.format || picked.formats?.[0], status: form.status || undefined, channel: form.channel || undefined, type: form.type || undefined, from: form.from || undefined, to: form.to || undefined };
  };
  const fail = (e: unknown) => setError(e instanceof ApiError ? e.message : "Something went wrong. Try again.");
  const close = () => { setPicked(null); setScheduling(false); setError(null); };

  const submit = async () => {
    setError(null);
    const body = request();
    if (!body) return;
    try {
      if (scheduling) {
        if (form.name.trim().length < 2) return setError("Give the schedule a name.");
        await createSchedule.mutateAsync({ name: form.name.trim(), frequency: form.frequency, report: body });
        setNotice({ tone: "success", text: "Schedule created." });
        setTab("schedules");
      } else {
        const r = await generate.mutateAsync(body);
        setNotice({ tone: "success", text: `${(r as { fileName?: string } | undefined)?.fileName ?? "Report"} is ready in My reports.` });
        setTab("history");
      }
      close();
    } catch (e) { fail(e); }
  };

  const download = async (id: string, name?: string) => {
    const err = await downloadFile(`/reports/history/${encodeURIComponent(id)}/download`, {}, name ?? "report");
    setNotice(err ? { tone: "danger", text: err } : { tone: "success", text: `${name ?? "Report"} downloaded. The download is recorded in the audit log.` });
  };

  const busy = generate.isPending || createSchedule.isPending;
  const hist = history.data?.data ?? [];

  return (
    <>
      <PageHeader title="Reports" description="Generate and export reports for current-release activity." actions={<RefreshButton />} />
      {notice && <div className="mb-4"><Notice tone={notice.tone}>{notice.text}</Notice></div>}
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[
        { id: "catalogue", label: "Catalogue", count: catalog.data?.length },
        { id: "history", label: "My reports", count: history.data?.page?.total },
        { id: "schedules", label: "Schedules", count: schedules.data?.length },
      ]} />

      {tab === "catalogue" && (catalog.isError ? <ErrorState error={catalog.error} onRetry={() => void catalog.refetch()} title="The report catalogue could not be loaded" /> : catalog.isLoading ? <Skeleton className="h-40" /> : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(catalog.data ?? []).map((r) => (
            <Card key={r.reportType}>
              <div className="flex h-full flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="grid size-9 place-items-center rounded-lg bg-brand-50 text-brand-700"><FileBarChart size={16} aria-hidden /></span>
                  <span className="flex gap-1">{(r.formats ?? []).map((f) => <Badge key={f} tone="neutral" dot={false}>{f}</Badge>)}</span>
                </div>
                <p className="text-sm font-semibold">{r.name ?? humanise(r.reportType)}</p>
                <p className="flex-1 text-[13px] text-ink-500">{r.description}</p>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => { setPicked(r); setScheduling(false); setError(null); setForm((f) => ({ ...f, format: r.formats?.[0] ?? "" })); }}>Generate</Button>
                  <Button variant="subtle" size="sm" onClick={() => { setPicked(r); setScheduling(true); setError(null); setForm((f) => ({ ...f, format: r.formats?.[0] ?? "", name: r.name ?? "" })); }}>Schedule</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ))}

      {tab === "history" && (history.isError && !history.data ? <ErrorState error={history.error} onRetry={() => void history.refetch()} title="Your reports could not be loaded" /> : history.isLoading ? <Skeleton className="h-40" /> : (
        <Card padded={false}>
          {hist.length === 0 ? <p className="p-5 text-sm text-ink-500">No report has been generated yet.</p> : (
            <ul className="divide-y divide-line">
              {hist.map((j) => (
                <li key={j.reportId} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="text-sm font-medium">{j.fileName ?? humanise(j.reportType)}</p>
                    <p className="text-xs tabular text-ink-500">{humanise(j.reportType)} · {j.format} {kb(j.fileSize) && `· ${kb(j.fileSize)}`} · {formatApiDateTime(j.generatedAt)}</p>
                  </div>
                  <Button variant="success-soft" size="sm" onClick={() => void download(j.reportId, j.fileName)}><Download size={14} aria-hidden /> Download</Button>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-line px-5 py-3"><Pager page={history.data?.page?.page ?? page} totalPages={history.data?.page?.totalPages} total={history.data?.page?.total} size={SIZE} shown={hist.length} noun="reports" onPage={setPage} /></div>
        </Card>
      ))}

      {tab === "schedules" && (schedules.isError ? <ErrorState error={schedules.error} onRetry={() => void schedules.refetch()} title="Schedules could not be loaded" /> : schedules.isLoading ? <Skeleton className="h-40" /> : (
        <Card padded={false}>
          {(schedules.data ?? []).length === 0 ? <p className="flex items-center gap-2 p-5 text-sm text-ink-500"><Plus size={14} aria-hidden /> No schedule yet. Use Schedule on a report in the catalogue.</p> : (
            <ul className="divide-y divide-line">
              {(schedules.data ?? []).map((s) => {
                const paused = /PAUS|INACTIVE|DISABLED/i.test(s.status ?? "");
                const act = (p: Promise<unknown>, ok: string) => p.then(() => setNotice({ tone: "success", text: ok })).catch((e) => setNotice({ tone: "danger", text: e instanceof ApiError ? e.message : "Something went wrong. Try again." }));
                return (
                  <li key={s.scheduleId} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <div>
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="text-[13px] text-ink-500">{humanise(s.reportType)} · {humanise(s.frequency)}</p>
                      <p className="text-xs tabular text-ink-500">Next run {formatApiDateTime(s.nextRunAt)} · Last run {formatApiDateTime(s.lastRunAt)}</p>
                    </div>
                    <span className="flex flex-wrap items-center gap-2">
                      <Badge tone={statusTone(s.status)}>{humanise(s.status)}</Badge>
                      <Button variant="secondary" size="sm" disabled={runSchedule.isPending} onClick={() => void act(runSchedule.mutateAsync(s.scheduleId), "Report is being generated. It will appear in My reports.")}><Run size={14} aria-hidden /> Run now</Button>
                      <Button variant="secondary" size="sm" onClick={() => void act(updateSchedule.mutateAsync({ scheduleId: s.scheduleId, status: paused ? "ACTIVE" : "PAUSED" }), paused ? "Schedule resumed." : "Schedule paused.")}>{paused ? <><Play size={14} aria-hidden /> Resume</> : <><Pause size={14} aria-hidden /> Pause</>}</Button>
                      <Button variant="danger" size="sm" onClick={() => setRemoving(s)}><Trash2 size={14} aria-hidden /> Delete</Button>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      ))}

      <Modal open={!!picked} onClose={close} title={scheduling ? `Schedule: ${picked?.name ?? ""}` : picked?.name ?? ""} description={picked?.description}
        footer={<><Button variant="secondary" onClick={close}>Cancel</Button><Button disabled={busy} onClick={() => void submit()}>{busy ? "Working…" : scheduling ? "Create schedule" : "Generate report"}</Button></>}>
        <div className="flex flex-col gap-4">
          {error && <Notice tone="danger">{error}</Notice>}
          {scheduling && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" htmlFor="r-name" required><Input id="r-name" value={form.name} onChange={set("name")} maxLength={100} /></Field>
              <Field label="Repeats" htmlFor="r-freq"><Select id="r-freq" value={form.frequency} onChange={set("frequency")}>{FREQUENCIES.map((f) => <option key={f} value={f}>{humanise(f)}</option>)}</Select></Field>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="From" htmlFor="r-from"><Input id="r-from" type="date" value={form.from} onChange={set("from")} /></Field>
            <Field label="To" htmlFor="r-to"><Input id="r-to" type="date" value={form.to} onChange={set("to")} /></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Format" htmlFor="r-fmt"><Select id="r-fmt" value={form.format} onChange={set("format")}>{(picked?.formats ?? options.data?.formats ?? []).map((f) => <option key={f}>{f}</option>)}</Select></Field>
            <Field label="Status" htmlFor="r-st"><Select id="r-st" value={form.status} onChange={set("status")}><option value="">Any status</option>{(options.data?.statuses ?? []).map((s) => <option key={s} value={s}>{humanise(s)}</option>)}</Select></Field>
            <Field label="Channel" htmlFor="r-ch"><Select id="r-ch" value={form.channel} onChange={set("channel")}><option value="">Any channel</option>{(options.data?.channels ?? []).map((s) => <option key={s} value={s}>{humanise(s)}</option>)}</Select></Field>
            <Field label="Transaction type" htmlFor="r-ty"><Select id="r-ty" value={form.type} onChange={set("type")}><option value="">Any type</option>{(options.data?.transactionTypes ?? []).map((s) => <option key={s} value={s}>{humanise(s)}</option>)}</Select></Field>
          </div>
        </div>
      </Modal>

      <ActionDialog open={!!removing} onClose={() => setRemoving(null)} danger title="Delete this schedule?" description={removing ? `${removing.name} will stop running. Reports it already made stay in My reports.` : undefined} confirmLabel="Yes, delete"
        onConfirm={async () => { if (!removing) return; await deleteSchedule.mutateAsync(removing.scheduleId); setNotice({ tone: "success", text: "Schedule deleted." }); }} />
    </>
  );
}
