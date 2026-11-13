"use client";

import { useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { Card, Notice, PageHeader, Tabs } from "@/components/ui/layout";
import { alerts, CHANNELS, services, type ServiceState, type ServiceStatus } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatDateTime, type Tone } from "@/lib/format";

const stateTone: Record<ServiceState, Tone> = { Available: "success", Degraded: "warning", Unavailable: "danger", Unknown: "neutral" };
const impactTone: Record<ServiceStatus["impact"], Tone> = { "Confirmed outage": "danger", "Dependency warning": "warning", Unconfirmed: "neutral", None: "success" };
const severityTone = { Critical: "danger", Major: "warning", Minor: "neutral" } as const;

type Tab = "services" | "alerts" | "history";

// Read-only service and integration status (BRD 13). GET /system-status/services, /alerts, /history.
// Staff cannot restart a service, override a status or close an incident from here.
export default function SystemStatusPage() {
  const [tab, setTab] = useState<Tab>("services");
  const [channel, setChannel] = useState("");
  const [kind, setKind] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState("12:20");

  const rows = services.filter((s) => (!channel || s.channels.includes(channel)) && (!kind || s.kind === kind));
  const stale = services.filter((s) => s.refresh !== "Current").length;
  const active = alerts.filter((a) => a.state === "Active");

  return (
    <>
      <PageHeader
        title="System status"
        description="Status as reported by the monitoring source. Refreshes every 60 seconds; a reading older than 2 minutes is marked stale."
        actions={
          <>
            <span className="text-xs text-ink-500">Last refresh {refreshedAt}</span>
            <Button variant="secondary" onClick={() => setRefreshedAt("just now")}><RefreshCw size={14} aria-hidden /> Refresh</Button>
          </>
        }
      />

      {stale > 0 && (
        <div className="mb-5">
          <Notice tone="warning" title={`${stale} service${stale === 1 ? "" : "s"} could not be refreshed`}>
            Their last readings are kept and marked. A failed reading does not mean the service itself is down.
          </Notice>
        </div>
      )}

      <Tabs<Tab> value={tab} onChange={setTab} tabs={[{ id: "services", label: "Services and integrations", count: services.length }, { id: "alerts", label: "Active alerts", count: active.length }, { id: "history", label: "Alert history", count: alerts.length }]} />

      {tab === "services" && (
        <>
          <div className="mb-4 flex flex-wrap gap-3">
            <Select aria-label="Channel" value={channel} onChange={(e) => setChannel(e.target.value)} className="w-56"><option value="">All channels</option>{CHANNELS.map((c) => <option key={c}>{c}</option>)}</Select>
            <Select aria-label="Kind" value={kind} onChange={(e) => setKind(e.target.value)} className="w-48"><option value="">Services and integrations</option><option>Service</option><option>Integration</option></Select>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {rows.map((s) => {
              const open = openId === s.id;
              return (
                <Card key={s.id} className={cn(s.refresh !== "Current" && "border-amber-200")}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{s.name}</p>
                      <p className="text-xs text-ink-500">{s.kind} · {s.team}</p>
                    </div>
                    <Badge tone={stateTone[s.state]}>{s.state}</Badge>
                  </div>
                  <p className="mt-3 text-[13px] text-ink-700">{s.description}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-500">
                    <span className="tabular">Last successful update {formatDateTime(s.lastSuccess)}</span>
                    {s.refresh === "Stale" && <Badge tone="warning">Stale</Badge>}
                    {s.refresh === "Retrieval failed" && <Badge tone="warning">Not refreshed</Badge>}
                    {s.impact !== "None" && <Badge tone={impactTone[s.impact]}>{s.impact === "Unconfirmed" ? "Impact unconfirmed" : s.impact}</Badge>}
                  </div>
                  {(s.channels.length > 0 || s.incident) && (
                    <button type="button" aria-expanded={open} onClick={() => setOpenId(open ? null : s.id)} className="mt-3 text-[13px] font-medium text-brand-700 hover:underline">
                      {open ? "Hide details" : "Affected channels and guidance"}
                    </button>
                  )}
                  {open && (
                    <div className="mt-3 flex flex-col gap-3 border-t border-line pt-3 text-[13px]">
                      {s.channels.length > 0 && <div className="flex flex-wrap gap-1">{s.channels.map((c) => <Badge key={c} tone="neutral" dot={false}>{c}</Badge>)}</div>}
                      {s.guidance && <p className="text-ink-700">{s.guidance}</p>}
                      {s.incident && (
                        <p className="flex items-center gap-2">
                          Incident <span className="font-medium tabular">{s.incident}</span>
                          <Button variant="ghost" size="sm"><ExternalLink size={12} aria-hidden /> Open in incident system</Button>
                        </p>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}

      {tab !== "services" && (
        <Card padded={false}>
          <ul className="divide-y divide-line">
            {(tab === "alerts" ? active : alerts).map((a) => (
              <li key={a.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
                <div>
                  <p className="text-sm font-medium">{a.service}</p>
                  <p className="text-[13px] text-ink-700">{a.summary}</p>
                  <p className="mt-1 text-xs tabular text-ink-500">Started {formatDateTime(a.start)} · Latest update {formatDateTime(a.update)}{a.incident ? ` · ${a.incident}` : ""}</p>
                </div>
                <span className="flex gap-2"><Badge tone={severityTone[a.severity]}>{a.severity}</Badge><Badge tone={a.state === "Active" ? "danger" : "success"}>{a.state}</Badge></span>
              </li>
            ))}
            {tab === "alerts" && active.length === 0 && <li className="px-5 py-10 text-center text-[13px] text-ink-500">No active alerts reported.</li>}
          </ul>
          {tab === "history" && <p className="border-t border-line px-5 py-3 text-xs text-ink-500">History is shown as supplied by the monitoring source. A gap in records does not mean the service was available.</p>}
        </Card>
      )}
    </>
  );
}
