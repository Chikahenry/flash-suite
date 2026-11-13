"use client";

import { useState } from "react";
import { Download, FileBarChart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { Card, Notice, PageHeader, Tabs } from "@/components/ui/layout";
import { Modal } from "@/components/ui/modal";
import { StepUpModal } from "@/components/requests/step-up-modal";
import { BRANCHES, reportCatalogue, reportJobs, type ReportDef, type ReportJob } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

type Tab = "catalogue" | "jobs";
const jobTone = { Queued: "neutral", Generating: "info", Ready: "success", Failed: "danger" } as const;

// Report catalogue and background jobs (BRD 14.2 DRA009..011, 14.6, NFR017).
// POST /reports returns a job reference; GET /reports/{jobId} is polled; download rechecks permissions.
export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>("catalogue");
  const [jobs, setJobs] = useState<ReportJob[]>(reportJobs);
  const [picked, setPicked] = useState<ReportDef | null>(null);
  const [from, setFrom] = useState("2026-11-01");
  const [to, setTo] = useState("2026-11-11");
  const [branch, setBranch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [download, setDownload] = useState<ReportJob | null>(null);
  const [downloaded, setDownloaded] = useState<string | null>(null);

  const generate = () => {
    if (!picked) return;
    if (!from || !to || to < from) return setError("Enter a valid reporting period.");
    setError(null);
    setJobs((j) => [{ id: `RPT-20261111-0${15 + j.length}`, report: picked.name, period: `${formatDateTime(from)} to ${formatDateTime(to)}`, filters: branch || "All permitted branches", requestedAt: "2026-11-11T12:21:00", status: "Queued" }, ...j]);
    setPicked(null);
    setTab("jobs");
  };

  return (
    <>
      <PageHeader title="Reports" description="Generate and export reports for current-release activity. Each report states its source, period, filters and data freshness." />
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[{ id: "catalogue", label: "Catalogue", count: reportCatalogue.length }, { id: "jobs", label: "My reports", count: jobs.length }]} />

      {tab === "catalogue" && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {reportCatalogue.map((r) => (
            <Card key={r.id}>
              <div className="flex h-full flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="grid size-9 place-items-center rounded-lg bg-brand-50 text-brand-700"><FileBarChart size={16} aria-hidden /></span>
                  <Badge tone="neutral" dot={false}>{r.area}</Badge>
                </div>
                <p className="text-sm font-semibold">{r.name}</p>
                <p className="flex-1 text-[13px] text-ink-500">{r.description}</p>
                <p className="text-xs text-ink-500">Source: {r.source}</p>
                <Button variant="secondary" size="sm" className="self-start" onClick={() => { setPicked(r); setError(null); }}>Generate</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === "jobs" && (
        <>
          {downloaded && <div className="mb-4"><Notice tone="success">{downloaded} downloaded. Your access was rechecked and the download is recorded in the audit log.</Notice></div>}
          <Card padded={false}>
            <ul className="divide-y divide-line">
              {jobs.map((j) => (
                <li key={j.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="text-sm font-medium">{j.report}</p>
                    <p className="text-[13px] text-ink-500">{j.period} · {j.filters}</p>
                    <p className="mt-1 text-xs tabular text-ink-500">{j.id} · Requested {formatDateTime(j.requestedAt)}{j.rows ? ` · ${j.rows} rows` : ""}</p>
                    {j.status === "Failed" && <p className="mt-1 text-[13px] text-red-700">Generation failed. The filters are kept; check the status before starting it again.</p>}
                  </div>
                  <span className="flex items-center gap-2">
                    <Badge tone={jobTone[j.status]}>{j.status}</Badge>
                    {j.status === "Ready" && <Button variant="success-soft" size="sm" onClick={() => setDownload(j)}><Download size={14} aria-hidden /> Download</Button>}
                    {j.status === "Failed" && <Button variant="secondary" size="sm" onClick={() => setJobs((l) => l.map((x) => (x.id === j.id ? { ...x, status: "Queued" } : x)))}>Run again</Button>}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}

      <Modal
        open={!!picked}
        onClose={() => setPicked(null)}
        title={picked?.name ?? ""}
        description={picked?.description}
        footer={<><Button variant="secondary" onClick={() => setPicked(null)}>Cancel</Button><Button onClick={generate}>Generate report</Button></>}
      >
        <div className="flex flex-col gap-4">
          {error && <Notice tone="danger">{error}</Notice>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="From" htmlFor="r-from" required><Input id="r-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
            <Field label="To" htmlFor="r-to" required><Input id="r-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
          </div>
          <Field label="Branch" htmlFor="r-branch" hint="Only branches you are permitted to see are listed.">
            <Select id="r-branch" value={branch} onChange={(e) => setBranch(e.target.value)}><option value="">All permitted branches</option>{BRANCHES.map((b) => <option key={b}>{b}</option>)}</Select>
          </Field>
          <Notice tone="info">Standard reports finish within 30 seconds. Longer ones run in the background; you can leave this page and return to My reports.</Notice>
        </div>
      </Modal>

      <StepUpModal open={!!download} onClose={() => setDownload(null)} onVerified={() => { setDownloaded(download?.id ?? null); setDownload(null); }} actionLabel="download this report" />
    </>
  );
}
