"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Eye, EyeOff, Lock, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Field, Input, ReadOnlyField, Select } from "@/components/ui/form";
import { Card, DefinitionGrid, Notice, PageHeader } from "@/components/ui/layout";
import { DateRangeButton, Pager, SearchField } from "@/components/ui/toolbar";
import { BusinessHoursForm, EvidenceChecklistForm, ListEditor, NotificationRuleForm, SessionSettingsForm } from "@/components/settings/config-forms";
import { useRaise } from "@/components/requests/use-raise";
import {
  changeReasons, documentTypes, evidenceChecklists, notificationRules, serviceTargets,
  type EvidenceChecklist, type NotificationRule, type ServiceTarget,
} from "@/lib/api";
import { cn } from "@/lib/cn";
import { ErrorState } from "@/components/ui/query-state";
import { useAuditEvents } from "@/lib/bo/audit";
import { formatApiDateTime, humanise } from "@/lib/bo/format";
import { useStaffIdentity } from "@/lib/staff-session";

type Section = "password" | "profile" | "activity" | "targets" | "notifications" | "evidence" | "lists" | "security";

const SECTIONS: { id: Section; label: string; group: string }[] = [
  { id: "password", label: "Change Password", group: "My account" },
  { id: "activity", label: "Activity Logs", group: "My account" },
  { id: "profile", label: "My profile", group: "My account" },
  { id: "targets", label: "Service targets and escalation", group: "Configuration" },
  { id: "notifications", label: "Notification rules", group: "Configuration" },
  { id: "evidence", label: "Evidence checklists", group: "Configuration" },
  { id: "lists", label: "Document types and reasons", group: "Configuration" },
  { id: "security", label: "Session and security", group: "Configuration" },
];

function TargetForm({ target }: { target?: ServiceTarget }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Request type" htmlFor="st-type" required><Input id="st-type" defaultValue={target?.requestType} /></Field>
      <Field label="Stage" htmlFor="st-stage" required><Select id="st-stage" defaultValue={target?.stage}><option>Approval</option><option>Processing</option></Select></Field>
      <Field label="Target (business hours)" htmlFor="st-hours" required><Input id="st-hours" inputMode="numeric" defaultValue={target?.targetHours ?? ""} /></Field>
      <Field label="Clock starts at" htmlFor="st-clock"><Select id="st-clock" defaultValue={target?.clockStart}><option>Request submission</option><option>Entry into stage</option></Select></Field>
      <Field label="Escalate at" htmlFor="st-esc"><Select id="st-esc"><option>Breach of target</option><option>Time in stage</option><option>Time since submission</option></Select></Field>
      <Field label="Escalation recipient" htmlFor="st-rec" required><Input id="st-rec" defaultValue={target?.recipient === "—" ? "" : target?.recipient} /></Field>
      <Field label="Pause while awaiting customer" htmlFor="st-pause" className="sm:col-span-2" hint="When a pause is used, its reason and start and end times are kept."><Select id="st-pause" defaultValue={target?.pauseAllowed ? "Allowed" : "Not allowed"}><option>Allowed</option><option>Not allowed</option></Select></Field>
    </div>
  );
}

/** Figma "Settings – Change Password": a centred card with three password fields and a green button. POST /api/auth/password. */
function ChangePassword() {
  const [show, setShow] = useState<Record<string, boolean>>({});
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const fields = [["old", "Old Password"], ["new", "New Password"], ["again", "Re-type Password"]] as const;

  const submit = async () => {
    setDone(false);
    if (fields.some(([id]) => !values[id])) return setError("Fill in all three fields.");
    if (values.new.length < 8) return setError("The new password must be at least 8 characters.");
    if (values.new !== values.again) return setError("The new password and the re-typed password do not match.");
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword: values.old, newPassword: values.new }) });
      const body = (await res.json().catch(() => null)) as { status?: string; message?: string } | null;
      if (res.ok) {
        setValues({});
        setDone(true);
      } else {
        setError(body?.message ?? "The password could not be changed. Try again.");
      }
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    }
    setBusy(false);
  };

  return (
    <div className="mx-auto mt-10 w-full max-w-[400px] rounded-xl border border-line p-6">
      <h2 className="mb-5 text-lg font-semibold">Change Password</h2>
      <div className="flex flex-col gap-4">
        {done && <Notice tone="success">Your password has been changed.</Notice>}
        {error && <Notice tone="danger">{error}</Notice>}
        {fields.map(([id, label]) => (
          <div key={id}>
            <label htmlFor={"pw-" + id} className="mb-2 block text-[13px] font-medium">{label}</label>
            <div className="relative">
              <Lock size={16} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 fill-ink-400 text-ink-400" />
              <input id={"pw-" + id} type={show[id] ? "text" : "password"} placeholder="******************" value={values[id] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [id]: e.target.value }))} className="h-11 w-full rounded-lg bg-surface pl-10 pr-10 text-sm placeholder:text-ink-400 focus:bg-white focus:outline-2 focus:outline-brand-600" />
              <button type="button" aria-label={show[id] ? "Hide password" : "Show password"} onClick={() => setShow((v) => ({ ...v, [id]: !v[id] }))} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-ink-700">{show[id] ? <Eye size={18} /> : <EyeOff size={18} />}</button>
            </div>
          </div>
        ))}
                <button type="button" onClick={() => void submit()} disabled={busy} className="h-11 rounded-lg bg-accent-500 text-sm font-medium text-white hover:bg-accent-600 disabled:opacity-60">{busy ? "Saving…" : "Change Password"}</button>
      </div>
    </div>
  );
}

/** Figma "Settings – Activity Logs": the signed-in staff member's own events. GET /audit/events filtered to their user ID. */
function MyActivity({ userId }: { userId: string }) {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const onSearch = (v: string) => { setQ(v); clearTimeout(timer.current); timer.current = setTimeout(() => { setSearch(v.trim()); setPage(1); }, 400); };
  const list = useAuditEvents({ actorId: userId || undefined, search: search || undefined, from, to, page, size: 15 });
  const rows = list.data?.data ?? [];
  const meta = list.data?.page;

  if (!userId) return <Notice tone="info">Loading your account…</Notice>;
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Activity Logs</h2></div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchField value={q} onChange={onSearch} placeholder="Search by action" />
        <div className="ml-auto"><DateRangeButton from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); setPage(1); }} /></div>
      </div>
      {list.isError && !list.data ? <ErrorState error={list.error} onRetry={() => void list.refetch()} title="Your activity could not be loaded" /> : (
        <DataTable
          headerFill
          columns={[
            { key: "at", header: "Time Stamp", className: "w-[200px]", cell: (a) => <span className="whitespace-nowrap tabular">{formatApiDateTime(a.eventTime ?? a.createdAt)}</span> },
            { key: "action", header: "Action", cell: (a) => <span><span className="font-medium text-accent-700">{humanise(a.eventType)}</span>{a.description && <span className="text-ink-700"> · {a.description}</span>}</span> },
            { key: "ip", header: "IP address", cell: (a) => <span className="tabular">{a.ipAddress ?? "—"}</span> },
          ]}
          rows={rows}
          rowKey={(a) => a.eventId}
          loading={list.isLoading}
          empty="No activity matches."
          footer={<Pager page={meta?.page ?? page} totalPages={meta?.totalPages} total={meta?.total} size={meta?.size ?? 15} shown={rows.length} noun="entries" onPage={setPage} />}
        />
      )}
    </>
  );
}

// Settings (Figma: Change Password + Activity Logs; BRD 14.10, 16.5 rules 12-15, 4.1 rule 12, NFR026).
// "Change password" from the Figma is replaced by a read-only profile, because staff passwords
// belong to the Bank identity service. All configuration changes go through maker-checker.
export default function SettingsPage() {
  const [section, setSection] = useState<Section>("password");
  const [raise, modal] = useRaise();
  const identity = useStaffIdentity();

  const config = (action: string, target: string, body?: ReactNode) => raise({ action, target, evidence: action === "Change password" ? [] : ["Owner approval"], body, internal: true, fn: "Configuration", submitLabel: action === "Change password" ? "Submit for approval" : undefined });

  const targetCols: Column<ServiceTarget>[] = [
    { key: "type", header: "Request type", cell: (t) => <span className="font-medium">{t.requestType}</span> },
    { key: "stage", header: "Stage", cell: (t) => t.stage },
    { key: "target", header: "Target", cell: (t) => (t.targetHours === null ? <Badge tone="warning">Target not configured</Badge> : <span className="tabular">{t.targetHours} business hours</span>) },
    { key: "clock", header: "Clock starts", cell: (t) => t.clockStart },
    { key: "esc", header: "Escalates", cell: (t) => (<div><p>{t.escalateAt}</p><p className="text-xs text-ink-500">{t.recipient}</p></div>) },
    { key: "pause", header: "Pause", cell: (t) => (t.pauseAllowed ? "Allowed" : "Not allowed") },
    { key: "act", header: "", align: "right", cell: (t) => <Button variant="ghost" size="sm" onClick={() => config("Change service target", `${t.requestType} · ${t.stage}`, <TargetForm target={t} />)}>Edit</Button> },
  ];

  const ruleCols: Column<NotificationRule>[] = [
    { key: "service", header: "Service", cell: (r) => r.service },
    { key: "event", header: "Event", cell: (r) => <span className="font-medium">{r.event}</span> },
    { key: "recipient", header: "Recipient", cell: (r) => r.recipient },
    { key: "channel", header: "Channel", cell: (r) => r.channel },
    { key: "timing", header: "Timing", cell: (r) => r.timing },
    { key: "active", header: "Status", cell: (r) => <Badge tone={r.active ? "success" : "neutral"}>{r.active ? "Active" : "Off"}</Badge> },
    { key: "act", header: "", align: "right", cell: (r) => <Button variant="ghost" size="sm" onClick={() => config("Change notification rule", `${r.service} · ${r.event}`, <NotificationRuleForm rule={r} />)}>Edit</Button> },
  ];

  const checklistCols: Column<EvidenceChecklist>[] = [
    { key: "action", header: "Action", cell: (c) => <span className="font-medium">{c.action}</span> },
    { key: "type", header: "Customer type", cell: (c) => c.customerType },
    { key: "route", header: "Submission route", cell: (c) => c.route },
    { key: "docs", header: "Mandatory documents", cell: (c) => <div className="flex flex-wrap gap-1">{c.documents.map((d) => <Badge key={d} tone="neutral" dot={false}>{d}</Badge>)}</div> },
    { key: "act", header: "", align: "right", cell: (c) => <Button variant="ghost" size="sm" onClick={() => config("Change evidence checklist", `${c.action} · ${c.route}`, <EvidenceChecklistForm checklist={c} />)}>Edit</Button> },
  ];

  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <nav aria-label="Settings sections" className="flex flex-col gap-0.5">
          {SECTIONS.map((s, i) => {
            const heading = i === 0 || SECTIONS[i - 1].group !== s.group;
            return (
              <div key={s.id}>
                {heading && <p className="px-3 pb-1 pt-3 text-[11px] font-medium uppercase tracking-wider text-ink-500 first:pt-0">{s.group}</p>}
                <button type="button" aria-current={section === s.id ? "page" : undefined} onClick={() => setSection(s.id)} className={cn("h-10 w-full rounded-r-lg border-l-2 px-3 text-left text-sm", section === s.id ? "border-accent-500 bg-surface font-medium text-ink-900" : "border-transparent text-ink-500 hover:text-ink-900")}>
                  {s.label}
                </button>
              </div>
            );
          })}
        </nav>

        <div className="min-w-0">
          {section === "password" && <ChangePassword />}

          {section === "profile" && (
            <Card title="My profile">
              <DefinitionGrid>
                <ReadOnlyField label="Name" value={identity.name || "—"} />
                <ReadOnlyField label="Email" value={identity.username || "—"} />
                <ReadOnlyField label="Staff ID" value={<span className="tabular">{identity.staffId || "—"}</span>} />
                <ReadOnlyField label="Role" value={identity.roles.join(", ") || "—"} />
                <ReadOnlyField label="Branch / SOL" value={identity.branch || "—"} />
                <ReadOnlyField label="Team" value={identity.team || "—"} />
                <ReadOnlyField label="User ID" value={<span className="break-all tabular">{identity.userId || "—"}</span>} />
                <ReadOnlyField label="Channel" value="Back Office" />
              </DefinitionGrid>
              <div className="mt-5"><Notice tone="info" title="About your profile">You can change your password under Change Password. Role or branch changes are requested through IAM.</Notice></div>
            </Card>
          )}

          {section === "activity" && <MyActivity userId={identity.userId} />}

          {section === "targets" && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="max-w-xl text-[13px] text-ink-500">Targets decide when a request is flagged overdue and who is alerted. Escalation only sends an alert; it never approves, reassigns or retries a request.</p>
                <Button onClick={() => config("Add service target", "New target", <TargetForm />)}><Plus size={16} aria-hidden /> Add target</Button>
              </div>
              <DataTable columns={targetCols} rows={serviceTargets} rowKey={(t) => t.id} />
              <Card title="Business hours">
                <DefinitionGrid>
                  <ReadOnlyField label="Working days" value="Monday to Friday" />
                  <ReadOnlyField label="Hours (WAT)" value="08:00 to 17:00" />
                  <ReadOnlyField label="Cut-off time" value="16:00" />
                </DefinitionGrid>
                <Button variant="secondary" size="sm" className="mt-4" onClick={() => config("Change business hours", "Service clock", <BusinessHoursForm />)}>Change</Button>
              </Card>
            </div>
          )}

          {section === "notifications" && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="max-w-xl text-[13px] text-ink-500">Rules say who is told, how and when. A notification says whether a request was submitted, approved or completed; approval is never described as completion.</p>
                <Button onClick={() => config("Add notification rule", "New rule", <NotificationRuleForm />)}><Plus size={16} aria-hidden /> Add rule</Button>
              </div>
              <DataTable columns={ruleCols} rows={notificationRules} rowKey={(r) => r.id} />
            </div>
          )}

          {section === "evidence" && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="max-w-xl text-[13px] text-ink-500">Each action has mandatory evidence by customer type and submission route. A request cannot be submitted without it.</p>
                <Button onClick={() => config("Add evidence checklist", "New checklist", <EvidenceChecklistForm />)}><Plus size={16} aria-hidden /> Add checklist</Button>
              </div>
              <DataTable columns={checklistCols} rows={evidenceChecklists} rowKey={(c) => c.id} />
            </div>
          )}

          {section === "lists" && (
            <div className="grid gap-6 md:grid-cols-2">
              {[{ title: "Document types", items: documentTypes, note: "\"Other\" needs a description and never replaces mandatory evidence." }, { title: "Change reasons", items: changeReasons, note: "\"Other\" requires staff to enter details." }].map((l) => (
                <Card key={l.title} title={l.title} actions={<Button variant="secondary" size="sm" onClick={() => config(`Change ${l.title.toLowerCase()}`, l.title, <ListEditor title={l.title} items={l.items} />)}>Edit list</Button>}>
                  <ul className="flex flex-wrap gap-1.5">{l.items.map((i) => <li key={i}><Badge tone="neutral" dot={false}>{i}</Badge></li>)}</ul>
                  <p className="mt-3 text-xs text-ink-500">{l.note}</p>
                </Card>
              ))}
            </div>
          )}

          {section === "security" && (
            <Card title="Session and security">
              <DefinitionGrid>
                <ReadOnlyField label="Inactivity limit" value="15 minutes" />
                <ReadOnlyField label="Maximum session" value="8 hours" />
                <ReadOnlyField label="Second factor" value="Required at every sign-in" />
                <ReadOnlyField label="Step-up check" value="Approvals and exports" />
                <ReadOnlyField label="Evidence file types" value="PDF, PNG, JPG" />
                <ReadOnlyField label="Evidence size limit" value="5 MB per file" />
              </DefinitionGrid>
              <div className="mt-5 flex flex-col gap-3">
                <Notice tone="info">MFA thresholds and token administration are outside this application and stay with their responsible systems.</Notice>
                <Button variant="secondary" size="sm" className="self-start" onClick={() => config("Change session settings", "Session and security", <SessionSettingsForm />)}>Request a change</Button>
              </div>
            </Card>
          )}
        </div>
      </div>
      {modal}
    </>
  );
}
