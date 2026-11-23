"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Building2, Hourglass, UserPlus, Workflow } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BarChart } from "@/components/ui/bar-chart";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Field, Input, Select } from "@/components/ui/form";
import { Card, PageHeader, SourceStamp, Tabs } from "@/components/ui/layout";
import { HeaderTools } from "@/components/layout/header-tools";
import { RequestStatusBadge } from "@/components/requests/request-bits";
import { getDataAsOf, getSession, isOpen, isOverdue, listOrganizations, listRequests, serviceTargets, staff } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatAge } from "@/lib/format";
import { usePermissions } from "@/lib/permissions";
import { useStaffIdentity } from "@/lib/staff-session";
import {
  MEASURE_DEFINITIONS, MEASURE_META, activeFilterCount, applyFilters, approvalWaitHours, filtersToQuery, inScope,
  measure, parseFilters, type Scope,
} from "@/lib/request-filters";
import type { BackOfficeRequest } from "@/lib/types";
import { useDashboardSummary } from "@/lib/bo/ops";

/** Live figures from GET /dashboard/summary. Each one opens the screen it counts. */
function LiveSummary() {
  const q = useDashboardSummary();
  const d = q.data;
  const items = [
    { label: "Transactions (all time)", value: d?.totalTransactions, href: "/transactions" },
    { label: "Transactions, last 30 days", value: d?.transactionsLast30Days, href: "/transactions" },
    { label: "Awaiting submission or approval", value: d?.transactionsPendingSubmissionOrApproval, href: "/transactions" },
    { label: "Approval requests pending", value: d?.approvalRequestsPending, href: "/requests" },
    { label: "Active report schedules", value: d?.activeReportSchedules, href: "/reports" },
  ];
  if (q.isError) return null;
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {items.map((i) => (
        <Link key={i.label} href={i.href} className="rounded-xl border border-line bg-white px-4 py-3 hover:bg-surface">
          <p className="text-xs text-ink-500">{i.label}</p>
          <p className="mt-1 text-2xl font-semibold tabular text-ink-900">{q.isLoading ? "…" : (i.value ?? 0).toLocaleString("en-NG")}</p>
        </Link>
      ))}
    </div>
  );
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const dayLabel = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()}`;
};
const uniq = (v: (string | undefined)[]) => [...new Set(v.filter((x): x is string => !!x))].sort();

const TILES = [
  { key: "pending", status: "PENDING_APPROVAL", label: "Pending approval", tone: "text-amber-700" },
  { key: "returned", status: "RETURNED", label: "Returned to maker", tone: "text-brand-700" },
  { key: "failed", status: "FAILED", label: "Failed or partial", tone: "text-red-700" },
  { key: "unresolved", status: "UNKNOWN", label: "Outcome unknown", tone: "text-amber-700" },
  { key: "completed", status: "COMPLETED", label: "Completed", tone: "text-accent-700" },
  { key: "rejected", status: "REJECTED", label: "Rejected", tone: "text-ink-700" },
] as const;

const SCOPE_LABEL: Record<Scope, string> = { mine: "My work", team: "My team", all: "Executive" };

// Dashboards by role, team, branch and coverage (BRD 14.2). The filters live in the address bar,
// so they are still selected when staff open a request and come back (DRA008). GET /dashboards/*.
export function DashboardView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const session = getSession();
  const who = useStaffIdentity();
  const { can } = usePermissions();

  const filters = useMemo(() => parseFilters((k) => params.get(k)), [params]);
  const allowed: Scope[] = can("Reports", "Export") ? ["mine", "team", "all"] : ["mine", "team"];
  const asked = (params.get("scope") as Scope | null) ?? "mine";
  const scope: Scope = allowed.includes(asked) ? asked : "mine";

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value); else next.delete(key);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };
  const reset = () => {
    const next = new URLSearchParams();
    if (scope !== "mine") next.set("scope", scope);
    router.replace(next.toString() ? `${pathname}?${next.toString()}` : pathname, { scroll: false });
  };

  const all = listRequests();
  const scoped = all.filter((r) => inScope(r, scope, session));
  const rows = applyFilters(scoped, filters);
  const m = measure(rows);
  const wait = approvalWaitHours(rows);
  const orgs = listOrganizations();
  const applied = activeFilterCount(filters);

  // Open lists use the same rows as the counts, so a number and the list it opens agree.
  const myApprovals = rows.filter((r) => r.status === "PENDING_APPROVAL" && r.maker !== session.name);
  const overdue = rows.filter(isOverdue);
  const openCount = rows.filter(isOpen).length;

  // The chart is built from the same filtered requests as the counts, so the two always agree.
  // Submitted = first submission date; completed = the day the responsible system confirmed it.
  const trend = (() => {
    const days = ["2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08", "2026-11-09", "2026-11-10", "2026-11-11"].filter((d) => (!filters.from || d >= filters.from) && (!filters.to || d <= filters.to));
    return days.map((d) => ({
      label: dayLabel(d),
      values: [
        rows.filter((r) => r.submittedAt.slice(0, 10) === d).length,
        rows.filter((r) => r.timeline.some((e) => e.action === "Completed" && e.at.slice(0, 10) === d)).length,
      ],
    }));
  })();

  const link = (status: string) => `/requests${filtersToQuery({ ...filters, status }, { scope: scope === "mine" ? "" : scope })}`;
  const tableColumns: Column<BackOfficeRequest>[] = [
    { key: "ref", header: "Reference", cell: (r) => <Link href={`/requests/${r.ref}`} className="whitespace-nowrap font-medium tabular text-brand-700 hover:underline">{r.ref}</Link> },
    { key: "action", header: "Action", cell: (r) => (<div><p>{r.action}</p><p className="text-xs text-ink-500">{r.target}</p></div>) },
    { key: "stage", header: "Stage", cell: (r) => (r.status === "PENDING_APPROVAL" ? "Approval" : "Processing") },
    { key: "owner", header: "Owner", cell: (r) => r.checker ?? <span className="text-ink-500">Unassigned</span> },
    {
      key: "age", header: "Age and target",
      cell: (r) => (
        <span className="inline-flex flex-wrap items-center gap-2 tabular">
          {formatAge(r.ageHours)}
          {r.targetHours === undefined ? <span className="text-xs text-ink-500">Target not configured</span> : isOverdue(r) ? <Badge tone="danger">Overdue</Badge> : <span className="text-xs text-ink-500">of {formatAge(r.targetHours)}</span>}
        </span>
      ),
    },
    { key: "status", header: "Status", cell: (r) => <RequestStatusBadge status={r.status} /> },
  ];

  const alertTo = (r: BackOfficeRequest) => serviceTargets.find((t) => t.requestType === r.action)?.recipient;
  const overdueColumns: Column<BackOfficeRequest>[] = [
    ...tableColumns.filter((c) => c.key !== "stage"),
    { key: "alert", header: "Alert sent to", cell: (r) => alertTo(r) ?? <span className="text-ink-500">Not configured</span> },
  ];

  const byGroup = (key: "module" | "branch") =>
    uniq(rows.map((r) => r[key])).map((name) => {
      const g = rows.filter((r) => r[key] === name);
      return { name, ...measure(g) };
    });
  const breakdownColumns = (label: string): Column<ReturnType<typeof byGroup>[number]>[] => [
    { key: "name", header: label, cell: (g) => <span className="font-medium">{g.name}</span> },
    { key: "requests", header: "Requests", align: "right", cell: (g) => g.requests },
    { key: "items", header: "Items", align: "right", cell: (g) => g.items },
    { key: "pending", header: "Pending", align: "right", cell: (g) => g.pending },
    { key: "completed", header: "Completed", align: "right", cell: (g) => g.completed },
    { key: "failed", header: "Failed or unknown", align: "right", cell: (g) => g.failed + g.unresolved },
    { key: "overdue", header: "Overdue", align: "right", cell: (g) => (g.overdue ? <span className="font-semibold text-red-700">{g.overdue}</span> : 0) },
  ];

  const corporate = [
    { label: "Organisations", value: orgs.length, icon: Building2 },
    { label: "Pending setup", value: orgs.filter((o) => o.status === "Pending setup").length, icon: Hourglass },
    { label: "Users awaiting activation", value: orgs.flatMap((o) => o.users).filter((u) => u.status === "Pending activation").length, icon: UserPlus },
    { label: "Transactions held by workflow", value: orgs.reduce((n, o) => n + o.pendingTransactions, 0), icon: Workflow },
  ];

  return (
    <>
      <PageHeader title="Dashboard" description={`Welcome back${who.name ? `, ${who.name.split(" ")[0]}` : ""}!`} actions={<HeaderTools initials={who.initials} />} />
      <LiveSummary />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs<Scope> value={scope} onChange={(s) => setParam("scope", s === "mine" ? "" : s)} tabs={allowed.map((s) => ({ id: s, label: SCOPE_LABEL[s] }))} />
        <SourceStamp source={MEASURE_META.source} at={getDataAsOf()} />
      </div>

      <Card className="mb-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-ink-900">Filters {applied > 0 && <span className="ml-1 rounded-full bg-accent-500 px-2 py-0.5 text-[11px] font-semibold text-white">{applied}</span>}</p>
          <Button variant="ghost" size="sm" onClick={reset} disabled={applied === 0}>Reset filters</Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Field label="From" htmlFor="d-from"><Input id="d-from" type="date" value={filters.from} onChange={(e) => setParam("from", e.target.value)} /></Field>
          <Field label="To" htmlFor="d-to"><Input id="d-to" type="date" value={filters.to} onChange={(e) => setParam("to", e.target.value)} /></Field>
          <Field label="Branch" htmlFor="d-branch"><Select id="d-branch" value={filters.branch} onChange={(e) => setParam("branch", e.target.value)}><option value="">All branches</option>{uniq(all.map((r) => r.branch)).map((b) => <option key={b}>{b}</option>)}</Select></Field>
          <Field label="Team" htmlFor="d-team"><Select id="d-team" value={filters.team} onChange={(e) => setParam("team", e.target.value)}><option value="">All teams</option>{uniq(staff.map((s) => s.team)).map((t) => <option key={t}>{t}</option>)}</Select></Field>
          <Field label="Module" htmlFor="d-module"><Select id="d-module" value={filters.module} onChange={(e) => setParam("module", e.target.value)}><option value="">All modules</option>{uniq(all.map((r) => r.module)).map((x) => <option key={x}>{x}</option>)}</Select></Field>
          <Field label="Action" htmlFor="d-action"><Select id="d-action" value={filters.action} onChange={(e) => setParam("action", e.target.value)}><option value="">All actions</option>{uniq(all.map((r) => r.action)).map((x) => <option key={x}>{x}</option>)}</Select></Field>
          <Field label="Status" htmlFor="d-status"><Select id="d-status" value={filters.status} onChange={(e) => setParam("status", e.target.value)}><option value="">All statuses</option>{TILES.map((t) => <option key={t.status} value={t.status}>{t.label}</option>)}</Select></Field>
          <Field label="Maker" htmlFor="d-maker"><Select id="d-maker" value={filters.maker} onChange={(e) => setParam("maker", e.target.value)}><option value="">Any maker</option>{uniq(all.map((r) => r.maker)).map((x) => <option key={x}>{x}</option>)}</Select></Field>
          <Field label="Checker" htmlFor="d-checker"><Select id="d-checker" value={filters.checker} onChange={(e) => setParam("checker", e.target.value)}><option value="">Any checker</option>{uniq(all.map((r) => r.checker)).map((x) => <option key={x}>{x}</option>)}</Select></Field>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {TILES.map((t) => {
          const group = rows.filter((r) => measure([r])[t.key] > 0);
          const items = group.reduce((n, r) => n + r.items.length, 0);
          return (
            <Link key={t.key} href={link(t.status)} className="group rounded-xl border border-line bg-white p-4 hover:border-brand-600">
              <p className="text-xs text-ink-500">{t.label}</p>
              <p className={cn("mt-2 text-3xl font-semibold tabular", t.tone)}>{m[t.key]}</p>
              <p className="mt-1 text-xs tabular text-ink-500">{items} item{items === 1 ? "" : "s"}</p>
              <p className="mt-2 inline-flex items-center gap-1 text-xs text-ink-500 group-hover:text-brand-700">Open list <ArrowRight size={12} aria-hidden /></p>
            </Link>
          );
        })}
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-line bg-white p-4">
          <p className="text-xs text-ink-500">Overdue against service target</p>
          <p className="mt-1.5 text-2xl font-semibold tabular text-red-700">{m.overdue}</p>
          <p className="mt-1 text-xs text-ink-500">of {openCount} open request{openCount === 1 ? "" : "s"}. Requests with no target are never marked overdue.</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-4">
          <p className="text-xs text-ink-500">Average approval wait</p>
          <p className="mt-1.5 text-2xl font-semibold tabular text-ink-900">{wait === null ? "Not available" : formatAge(Math.round(wait))}</p>
          <p className="mt-1 text-xs text-ink-500">Submission to the checker&apos;s decision, per version.</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-4">
          <p className="text-xs text-ink-500">Requests and processing items</p>
          <p className="mt-1.5 text-2xl font-semibold tabular text-ink-900">{m.requests} <span className="text-base font-normal text-ink-500">requests</span></p>
          <p className="mt-1 text-xs text-ink-500">{m.items} items in total. A resubmission or several accounts in one request count once.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card>
          <BarChart
            title="Requests submitted and completed per day"
            series={[{ name: "Submitted", colour: "var(--color-brand-600)" }, { name: "Completed", colour: "var(--color-accent-500)" }]}
            data={trend}
          />
          <p className="mt-2 text-xs text-ink-500">Counts follow every filter above and the same requests as the tiles. Submitted uses the first submission date; completed means confirmed by the responsible system.</p>
        </Card>
        <Card title="Corporate & SME activity">
          <ul className="flex flex-col gap-4">
            {corporate.map((c) => (
              <li key={c.label} className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-lg bg-brand-50 text-brand-700"><c.icon size={16} aria-hidden /></span>
                <span className="flex-1 text-[13px] text-ink-700">{c.label}</span>
                <span className="text-lg font-semibold tabular text-ink-900">{c.value}</span>
              </li>
            ))}
          </ul>
          <Link href="/corporate" className="mt-5 inline-flex items-center gap-1 text-[13px] font-medium text-brand-700 hover:underline">Open Corporate & SME <ArrowRight size={12} aria-hidden /></Link>
        </Card>
      </div>

      {scope === "all" && (
        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <Card title="By module" padded={false}><div className="p-3"><DataTable columns={breakdownColumns("Module")} rows={byGroup("module")} rowKey={(g) => g.name} empty="No requests match these filters." /></div></Card>
          <Card title="By branch" padded={false}><div className="p-3"><DataTable columns={breakdownColumns("Branch")} rows={byGroup("branch")} rowKey={(g) => g.name} empty="No requests match these filters." /></div></Card>
        </div>
      )}

      <Card title={`Awaiting my approval (${myApprovals.length})`} padded={false} className="mt-6" actions={<Link href={`/requests${filtersToQuery(filters, { queue: "approvals", scope: scope === "mine" ? "" : scope })}`} className="text-[13px] font-medium text-brand-700 hover:underline">View queue</Link>}>
        <div className="p-3"><DataTable columns={tableColumns} rows={myApprovals} rowKey={(r) => r.ref} empty="Nothing is waiting for your approval within these filters." /></div>
      </Card>

      <Card title={`Overdue against service target (${overdue.length})`} padded={false} className="mt-6">
        <div className="p-3"><DataTable columns={overdueColumns} rows={overdue} rowKey={(r) => r.ref} empty="No open request has passed its service target within these filters." /></div>
      </Card>

      <details className="mt-6 rounded-xl border border-line bg-white p-5">
        <summary className="cursor-pointer text-sm font-semibold text-ink-900">How these measures are counted</summary>
        <p className="mt-3 text-[13px] text-ink-500">Source: {MEASURE_META.source}. Counting unit: {MEASURE_META.unit}. Date basis: {MEASURE_META.dateBasis}. A request is never marked completed because it was approved or sent to a source system.</p>
        <dl className="mt-4 grid gap-4 md:grid-cols-2">
          {MEASURE_DEFINITIONS.map((d) => (
            <div key={d.name}>
              <dt className="text-[13px] font-medium text-ink-900">{d.name}</dt>
              <dd className="mt-0.5 text-[13px] text-ink-700">{d.calc} <span className="text-ink-500">Statuses: {d.statuses}.</span></dd>
            </div>
          ))}
        </dl>
      </details>
    </>
  );
}
