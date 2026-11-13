"use client";

import { useState } from "react";
import { AtSign, CircleUserRound, CircleX, IdCard, Mail, MoreHorizontal, Phone, Search, SquarePen, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Checkbox, Field, Input, ReadOnlyField, Select } from "@/components/ui/form";
import { Notice, PageHeader } from "@/components/ui/layout";
import { DownloadCsvButton, FiltersButton, SearchField, Toolbar } from "@/components/ui/toolbar";
import { cn } from "@/lib/cn";
import { StepUpModal } from "@/components/requests/step-up-modal";
import { useRaise } from "@/components/requests/use-raise";
import { BRANCHES, directory, roleBundles, staff, type StaffMember } from "@/lib/api";

const statusTone = { Active: "success", Suspended: "warning", Deactivated: "neutral" } as const;

/** Staff-ID lookup fills identity details from the identity service; they are read-only (BRD UAM-002). */
function ProfileStaffForm() {
  const [id, setId] = useState("");
  const [state, setState] = useState<"idle" | "found" | "missing" | "exists">("idle");
  const [roles, setRoles] = useState<string[]>([]);
  const person = directory[id];
  const lookup = () => setState(staff.some((s) => s.staffId === id) ? "exists" : person ? "found" : "missing");

  return (
    <div className="flex flex-col gap-4">
      <Field label="Staff ID" htmlFor="ps-id" required hint="Try FB13344. Details are filled in from the identity service.">
        <div className="flex gap-2">
          <div className="flex-1"><Input id="ps-id" value={id} onChange={(e) => { setId(e.target.value.trim().toUpperCase()); setState("idle"); }} /></div>
          <Button variant="secondary" onClick={lookup}>Look up</Button>
        </div>
      </Field>
      {state === "missing" && <Notice tone="danger">No staff member has this ID in the identity service.</Notice>}
      {state === "exists" && <Notice tone="warning">This staff member already has a Back Office profile. Change their roles from the staff list.</Notice>}
      {state === "found" && person && (
        <>
          <Field label="Full Name" htmlFor="ps-name" hint="From the identity service. Read-only."><Input id="ps-name" value={person.name} readOnly /></Field>
          <Field label="Email" htmlFor="ps-email"><Input id="ps-email" value={person.email} readOnly icon={<AtSign size={16} />} /></Field>
          <Field label="Branch / SOL and team" htmlFor="ps-branch"><Input id="ps-branch" value={`${person.branch} · ${person.team}`} readOnly /></Field>
          <fieldset>
            <legend className="mb-2 text-[13px] font-medium">Select Roles <span className="text-red-600">*</span></legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {roleBundles.map((r) => <Checkbox key={r.id} label={r.name} checked={roles.includes(r.name)} onChange={() => setRoles((x) => (x.includes(r.name) ? x.filter((y) => y !== r.name) : [...x, r.name]))} />)}
            </div>
          </fieldset>
          <Field label="Access scope" htmlFor="ps-scope" hint="Bank-wide access must be assigned explicitly.">
            <Select id="ps-scope"><option>Assigned branch only</option><option>Bank-wide</option></Select>
          </Field>
          {roles.some((r) => r.includes("Maker")) && roles.some((r) => r.includes("Checker")) && (
            <Notice tone="info">This person will hold maker and checker rights. The system still stops them approving their own requests.</Notice>
          )}
        </>
      )}
    </div>
  );
}

function ReassignForm({ member }: { member: StaffMember }) {
  const [q, setQ] = useState("");
  const options = BRANCHES.filter((b) => b !== member.branch && b.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="flex flex-col gap-4">
      <ReadOnlyField label="Current branch" value={member.branch} />
      <Field label="Search by SOL ID or branch name" htmlFor="rb-q"><Input id="rb-q" value={q} onChange={(e) => setQ(e.target.value)} icon={<Search size={16} />} /></Field>
      <Field label="Proposed branch" htmlFor="rb-new" required>
        <Select id="rb-new">{options.map((b) => <option key={b}>{b}</option>)}</Select>
      </Field>
    </div>
  );
}

function DelegationForm() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Delegate to" htmlFor="dg-to" required><Select id="dg-to">{staff.filter((s) => s.status === "Active").map((s) => <option key={s.staffId}>{s.name}</option>)}</Select></Field>
      <Field label="Expires on" htmlFor="dg-until" required hint="Delegation always has an end date."><Input id="dg-until" type="date" /></Field>
      <div className="sm:col-span-2"><Notice tone="info">The delegate cannot approve requests they made themselves, even with delegated rights.</Notice></div>
    </div>
  );
}

// Staff access management (BRD 6.2, UAM-001..012). All changes go through IAM maker-checker.
// GET /staff/lookup, /staff, /branches, /roles, /delegations, /staff/access-review/export.
export default function StaffPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [team, setTeam] = useState("");
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const [selected, setSelected] = useState<string[]>([]);
  const [stepUp, setStepUp] = useState(false);
  const [exported, setExported] = useState(false);
  const [raise, modal] = useRaise();
  const [confirming, setConfirming] = useState<StaffMember | null>(null);

  const rows = staff.filter((s) => `${s.name} ${s.staffId} ${s.email} ${s.branch}`.toLowerCase().includes(q.toLowerCase().trim()) && (!status || s.status === status) && (!team || s.team === team));
  const teams = [...new Set(staff.map((s) => s.team))];

  const actions = (s: StaffMember): string[] =>
    s.status === "Active" ? ["Change roles", "Reassign branch", "Set up delegation", "Suspend access", "Deactivate access", "Remove access"]
      : s.status === "Suspended" ? ["Restore access", "Deactivate access", "Remove access"]
        : ["Reactivate access", "Remove access"];

  const start = (s: StaffMember, action: string, confirmed = false) => {
    setMenuFor(null);
    const removal = ["Suspend access", "Deactivate access", "Remove access"].includes(action);
    if (action === "Deactivate access" && !confirmed) { setConfirming(s); return; }
    setConfirming(null);
    raise({
      action: action === "Change roles" ? "Edit User Info" : action,
      target: `${s.name} (${s.staffId})`,
      evidence: ["Line manager approval"],
      danger: removal,
      internal: true,
      fn: "Staff access",
      submitLabel: action === "Change roles" ? "Save Changes" : undefined,
      warning: removal ? "Active sessions end as soon as this is approved. Request and audit history is kept." : undefined,
      body:
        action === "Reassign branch" ? <ReassignForm member={s} />
          : action === "Set up delegation" ? <DelegationForm />
            : action === "Change roles" ? (
              <div className="flex flex-col gap-4">
                <Field label="Full Name" htmlFor="eu-name"><Input id="eu-name" value={s.name} readOnly /></Field>
                <Field label="Email" htmlFor="eu-email"><Input id="eu-email" value={s.email} readOnly icon={<AtSign size={16} />} /></Field>
                <Field label="Phone" htmlFor="eu-phone"><Input id="eu-phone" value={s.phone} readOnly /></Field>
              <fieldset>
                <legend className="mb-2 text-[13px] font-medium">Select Roles</legend>
                <div className="grid gap-2 sm:grid-cols-2">{roleBundles.map((r) => <Checkbox key={r.id} label={r.name} defaultChecked={s.roles.includes(r.name)} />)}</div>
              </fieldset>
              </div>
            ) : undefined,
    });
  };

  // Figma "Users" columns: Name, Email, Phone, Role, Status, Action (edit and deactivate icons).
  // The third icon opens the IAM actions the BRD adds: branch reassignment, delegation, suspension, removal.
  const iconBtn = "grid size-8 place-items-center rounded-md hover:bg-surface";
  const columns: Column<StaffMember>[] = [
    { key: "name", header: "Name", icon: CircleUserRound, cell: (s) => s.name },
    { key: "email", header: "Email", icon: Mail, cell: (s) => s.email },
    { key: "phone", header: "Phone", icon: Phone, cell: (s) => <span className="tabular">{s.phone}</span> },
    { key: "role", header: "Role", icon: IdCard, cell: (s) => <span title={`${s.branch} · ${s.designation}`}>{s.roles.join(", ")}</span> },
    { key: "status", header: "Status", cell: (s) => <Badge tone={statusTone[s.status]}>{s.status === "Deactivated" ? "Inactive" : s.status}</Badge> },
    {
      key: "act", header: "Action",
      cell: (s) => (
        <div className="flex items-center gap-1">
          <button type="button" aria-label={`Edit ${s.name}`} title="Edit user" className={iconBtn} onClick={() => start(s, "Change roles")}><SquarePen size={16} /></button>
          <button type="button" aria-label={`Deactivate ${s.name}`} title="Deactivate user" className={cn(iconBtn, "text-red-600")} onClick={() => start(s, "Deactivate access")}><CircleX size={16} /></button>
          <button type="button" aria-label={`More actions for ${s.name}`} aria-haspopup="menu" aria-expanded={menuFor === s.staffId} className={iconBtn} onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setMenuPos({ top: window.innerHeight - r.bottom > 260 ? r.bottom + 4 : Math.max(8, r.top - 250), right: window.innerWidth - r.right });
            setMenuFor(menuFor === s.staffId ? null : s.staffId);
          }}><MoreHorizontal size={16} /></button>
          {menuFor === s.staffId && (
            <ul role="menu" style={menuPos} className="fixed z-20 w-52 rounded-lg border border-line bg-white py-1 text-left shadow-pop">
              {actions(s).map((a) => <li key={a} role="none"><button role="menuitem" type="button" onClick={() => start(s, a)} className="block w-full px-3 py-2 text-left text-[13px] hover:bg-surface">{a}</button></li>)}
            </ul>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Users" />
      {exported && <div className="mb-4"><Notice tone="success">Access review export started: staff identity, branch, roles, maker/checker designation and access status.</Notice></div>}
      <Toolbar
        actions={
          <>
            <DownloadCsvButton label="Access review" onClick={() => setStepUp(true)} />
            <button type="button" onClick={() => raise({ action: "Add a new user", target: "New Back Office user", evidence: ["Line manager approval"], body: <ProfileStaffForm />, internal: true, submitLabel: "Add New User", fn: "Staff access" })} className="inline-flex h-10 items-center gap-2 rounded-lg border border-accent-100 bg-accent-50 px-4 text-sm font-medium text-accent-700 hover:bg-accent-100">
              Add New User <UserPlus size={16} aria-hidden />
            </button>
          </>
        }
      >
        <SearchField value={q} onChange={setQ} placeholder="Search by Name, Email" />
        <FiltersButton active={[team, status].filter(Boolean).length}>
          <Field label="Team" htmlFor="u-team"><Select id="u-team" value={team} onChange={(e) => setTeam(e.target.value)}><option value="">All teams</option>{teams.map((t) => <option key={t}>{t}</option>)}</Select></Field>
          <Field label="Status" htmlFor="u-status"><Select id="u-status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option><option>Active</option><option>Suspended</option><option value="Deactivated">Inactive</option></Select></Field>
        </FiltersButton>
      </Toolbar>
      <DataTable grid columns={columns} rows={rows} rowKey={(s) => s.staffId} selectable={{ selected, onChange: setSelected }} empty="No user matches." />
      <StepUpModal open={stepUp} onClose={() => setStepUp(false)} onVerified={() => { setStepUp(false); setExported(true); }} actionLabel="export the access review" />
      <ConfirmDialog
        open={!!confirming}
        onClose={() => setConfirming(null)}
        onConfirm={() => confirming && start(confirming, "Deactivate access", true)}
        question="Are you sure you want to deactivate this user's account?"
        note="The user will lose access to the system as soon as a checker approves. Their request and audit history is kept."
        confirmLabel="Yes, Deactivate User"
      />
      {modal}
    </>
  );
}
