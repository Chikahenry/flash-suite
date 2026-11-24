"use client";

import { useState } from "react";
import { CircleUserRound, CircleX, IdCard, Mail, MoreHorizontal, Phone, RotateCcw, SquarePen, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActionDialog } from "@/components/ui/action-dialog";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Checkbox, Field, Input, Select } from "@/components/ui/form";
import { Notice, PageHeader } from "@/components/ui/layout";
import { RefreshButton } from "@/components/ui/refresh-button";
import { Modal } from "@/components/ui/modal";
import { ErrorState } from "@/components/ui/query-state";
import { DownloadCsvButton, FiltersButton, Pager, SearchField, Toolbar } from "@/components/ui/toolbar";
import { ApiError } from "@/lib/bo/client";
import {
  fullName, lookupStaff, useCreateStaff, useRoles, useStaffAction, useStaffFilterOptions, useStaffList, useUpdateStaff,
  type StaffMember,
} from "@/lib/bo/access";
import { downloadFile } from "@/lib/bo/download";
import { humanise, statusTone } from "@/lib/bo/format";
import { useUrlState } from "@/lib/bo/use-url-state";
import { cn } from "@/lib/cn";
import { useDismiss } from "@/lib/use-dismiss";

const SIZE = 20;
const inactive = (s?: string) => /INACTIVE|DEACTIVAT|DISABLED/i.test(s ?? "");
const locked = (s?: string) => /LOCK/i.test(s ?? "");

interface Form { staffId: string; username: string; email: string; firstName: string; lastName: string; phoneNumber: string; branchSolId: string; teamName: string }
const EMPTY: Form = { staffId: "", username: "", email: "", firstName: "", lastName: "", phoneNumber: "", branchSolId: "", teamName: "" };
const text = (v: unknown) => (typeof v === "string" ? v : "");

/** Figma "Add New User" and "Edit User Info". Create looks the person up by staff ID first; edit sends only what changed. */
function StaffModal({ member, onClose, onDone }: { member: StaffMember | "new"; onClose: () => void; onDone: (m: string) => void }) {
  const editing = member !== "new" ? member : null;
  const roles = useRoles().data ?? [];
  const create = useCreateStaff();
  const update = useUpdateStaff();
  const initial: Form = editing
    ? { staffId: editing.staffId, username: editing.username ?? "", email: editing.email ?? "", firstName: editing.firstName ?? "", lastName: editing.lastName ?? "", phoneNumber: editing.phoneNumber ?? "", branchSolId: editing.branchSolId ?? "", teamName: editing.teamName ?? "" }
    : EMPTY;
  const initialRoles = editing?.roles?.map((r) => r.id) ?? [];
  const [f, setF] = useState<Form>(initial);
  const [roleIds, setRoleIds] = useState<string[]>(initialRoles);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof Form) => (e: { target: { value: string } }) => setF((v) => ({ ...v, [k]: e.target.value }));

  const look = async () => {
    setNote(null);
    setError(null);
    if (!f.staffId.trim()) return setError("Enter the staff ID first.");
    setBusy(true);
    try {
      const d = await lookupStaff(f.staffId.trim());
      const name = text(d.fullName ?? d.name).split(/\s+/);
      setF((v) => ({
        ...v,
        firstName: text(d.firstName) || name[0] || v.firstName,
        lastName: text(d.lastName) || name.slice(1).join(" ") || v.lastName,
        email: text(d.email) || v.email,
        username: text(d.username) || text(d.email) || v.username,
        phoneNumber: text(d.phoneNumber ?? d.phone) || v.phoneNumber,
        branchSolId: text(d.branchSolId ?? d.solId) || v.branchSolId,
        teamName: text(d.teamName ?? d.team ?? d.department) || v.teamName,
      }));
      setNote("Details filled in from the identity directory. Check them before saving.");
    } catch (e) {
      setError(e instanceof ApiError && e.status === 404 ? "No staff member has this ID in the identity directory." : e instanceof ApiError ? e.message : "The lookup failed. Try again.");
    }
    setBusy(false);
  };

  const save = async () => {
    setError(null);
    setFields({});
    const rolesChanged = roleIds.length !== initialRoles.length || roleIds.some((r) => !initialRoles.includes(r));
    try {
      if (editing) {
        const profile: Record<string, string> = {};
        for (const k of ["email", "firstName", "lastName", "phoneNumber", "branchSolId", "teamName"] as const) if (f[k].trim() !== initial[k]) profile[k] = f[k].trim();
        if (!Object.keys(profile).length && !rolesChanged) return setError("Change something before saving.");
        if (roleIds.length === 0) return setError("Select at least one role.");
        await update.mutateAsync({ staffId: editing.staffId, profile, roleIds: rolesChanged ? roleIds : undefined });
        onDone("User updated.");
      } else {
        if (!f.staffId.trim() || !f.username.trim() || !f.email.trim() || !f.firstName.trim() || !f.lastName.trim()) return setError("Fill in staff ID, username, email and both names.");
        if (roleIds.length === 0) return setError("Select at least one role.");
        await create.mutateAsync({ staffId: f.staffId.trim(), username: f.username.trim(), email: f.email.trim(), firstName: f.firstName.trim(), lastName: f.lastName.trim(), phoneNumber: f.phoneNumber.trim() || undefined, branchSolId: f.branchSolId.trim() || undefined, teamName: f.teamName.trim() || undefined, roleIds });
        onDone("User created. Password setup instructions were sent to them.");
      }
      onClose();
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
        setFields(Object.fromEntries(e.fieldErrors.map((x) => [x.field, x.message])));
      } else setError("Something went wrong. Try again.");
    }
  };

  const text2 = (k: keyof Form, label: string, opts: { readOnly?: boolean; required?: boolean } = {}) => (
    <Field label={label} htmlFor={`su-${k}`} required={opts.required} error={fields[k]}>
      <Input id={`su-${k}`} value={f[k]} onChange={set(k)} readOnly={opts.readOnly} aria-invalid={!!fields[k]} />
    </Field>
  );
  const pending = create.isPending || update.isPending;

  return (
    <Modal open onClose={onClose} title={editing ? "Edit User Info" : "Add New User"} footer={<Button block disabled={pending || busy} onClick={() => void save()}>{pending ? "Saving…" : editing ? "Save Changes" : "Add New User"}</Button>}>
      <div className="flex flex-col gap-4 pb-2">
        {error && <Notice tone="danger">{error}</Notice>}
        {note && <Notice tone="info">{note}</Notice>}
        {editing ? text2("staffId", "Staff ID", { readOnly: true }) : (
          <Field label="Staff ID" htmlFor="su-staffId" required error={fields.staffId} hint="Look the person up to fill in their details from the identity directory.">
            <div className="flex gap-2">
              <div className="flex-1"><Input id="su-staffId" value={f.staffId} onChange={(e) => setF((v) => ({ ...v, staffId: e.target.value.trim().toUpperCase() }))} /></div>
              <Button variant="secondary" disabled={busy} onClick={() => void look()}>{busy ? "Looking…" : "Look up"}</Button>
            </div>
          </Field>
        )}
        {text2("firstName", "First Name", { required: true })}
        {text2("lastName", "Last Name", { required: true })}
        {editing ? text2("username", "Username", { readOnly: true }) : text2("username", "Username", { required: true })}
        {text2("email", "Email", { required: true })}
        {text2("phoneNumber", "Phone")}
        {text2("branchSolId", "Branch / SOL ID")}
        {text2("teamName", "Team")}
        <fieldset>
          <legend className="mb-2 text-[13px] font-medium">Select Roles <span className="text-red-600">*</span></legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {roles.map((r) => <Checkbox key={r.id} label={r.name} checked={roleIds.includes(r.id)} onChange={() => setRoleIds((x) => (x.includes(r.id) ? x.filter((y) => y !== r.id) : [...x, r.id]))} />)}
          </div>
        </fieldset>
      </div>
    </Modal>
  );
}

type Act = { member: StaffMember; action: "deactivate" | "reactivate" | "unlock" | "reset-password" } | null;

// Figma "Users": Name, Email, Phone, Role, Status, Action. GET /staff (searched, filtered and paged on the server),
// POST /staff, PATCH /staff/{id}, PUT /staff/{id}/roles, and deactivate / reactivate / unlock / reset-password.
export default function StaffPage() {
  const url = useUrlState();
  const status = url.get("status");
  const role = url.get("role");
  const branch = url.get("branch");
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  useDismiss(menuFor !== null, () => setMenuFor(null), menuFor ?? "");
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<StaffMember | "new" | null>(null);
  const [act, setAct] = useState<Act>(null);
  const [done, setDone] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const options = useStaffFilterOptions().data;
  const list = useStaffList({ search: url.get("q") || undefined, status: status || undefined, role: role || undefined, branch: branch || undefined, page: url.page, size: SIZE });
  const rows = list.data?.data ?? [];
  const meta = list.data?.page;
  const doAction = useStaffAction();

  const iconBtn = "grid size-8 place-items-center rounded-md hover:bg-surface";
  const columns: Column<StaffMember>[] = [
    { key: "name", header: "Name", icon: CircleUserRound, cell: (s) => <span>{fullName(s)}<span className="block text-xs tabular text-ink-500">{s.staffId}</span></span> },
    { key: "email", header: "Email", icon: Mail, cell: (s) => <span className="break-all">{s.email ?? "—"}</span> },
    { key: "phone", header: "Phone", icon: Phone, cell: (s) => <span className="tabular">{s.phoneNumber ?? "—"}</span> },
    { key: "role", header: "Role", icon: IdCard, cell: (s) => <span title={`${s.branchSolId ?? ""} ${s.teamName ?? ""}`}>{s.roles?.map((r) => r.name).join(", ") || "—"}</span> },
    { key: "status", header: "Status", cell: (s) => <Badge tone={statusTone(s.status)}>{humanise(s.status)}</Badge> },
    {
      key: "act", header: "Action",
      cell: (s) => (
        <div className="flex items-center gap-1" data-dismiss={s.staffId}>
          <button type="button" aria-label={`Edit ${fullName(s)}`} title="Edit user" className={iconBtn} onClick={() => setEditing(s)}><SquarePen size={16} /></button>
          {inactive(s.status)
            ? <button type="button" aria-label={`Reactivate ${fullName(s)}`} title="Reactivate user" className={cn(iconBtn, "text-accent-700")} onClick={() => setAct({ member: s, action: "reactivate" })}><RotateCcw size={16} /></button>
            : <button type="button" aria-label={`Deactivate ${fullName(s)}`} title="Deactivate user" className={cn(iconBtn, "text-red-600")} onClick={() => setAct({ member: s, action: "deactivate" })}><CircleX size={16} /></button>}
          <button type="button" aria-label={`More actions for ${fullName(s)}`} aria-haspopup="menu" aria-expanded={menuFor === s.staffId} className={iconBtn} onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setMenuPos({ top: window.innerHeight - r.bottom > 140 ? r.bottom + 4 : Math.max(8, r.top - 110), right: window.innerWidth - r.right });
            setMenuFor(menuFor === s.staffId ? null : s.staffId);
          }}><MoreHorizontal size={16} /></button>
          {menuFor === s.staffId && (
            <ul role="menu" style={menuPos} className="fixed z-20 w-52 rounded-lg border border-line bg-white py-1 text-left shadow-pop">
              <li role="none"><button role="menuitem" type="button" onClick={() => { setMenuFor(null); setAct({ member: s, action: "reset-password" }); }} className="block w-full px-3 py-2 text-left text-[13px] hover:bg-surface">Send password reset</button></li>
              {locked(s.status) && <li role="none"><button role="menuitem" type="button" onClick={() => { setMenuFor(null); setAct({ member: s, action: "unlock" }); }} className="block w-full px-3 py-2 text-left text-[13px] hover:bg-surface">Unlock account</button></li>}
            </ul>
          )}
        </div>
      ),
    },
  ];

  const copy = act && {
    deactivate: { title: "Deactivate this user?", desc: "They lose access to the Back Office straight away. Their history is kept.", label: "Yes, Deactivate User", danger: true, ok: "User deactivated." },
    reactivate: { title: "Reactivate this user?", desc: "They can sign in again with their existing roles.", label: "Yes, Reactivate", danger: false, ok: "User reactivated." },
    unlock: { title: "Unlock this account?", desc: "The user can try to sign in again.", label: "Yes, Unlock", danger: false, ok: "Account unlocked." },
    "reset-password": { title: "Send password reset?", desc: "The user receives instructions to set a new password. Staff never see it.", label: "Yes, Send", danger: false, ok: "Password reset instructions sent." },
  }[act.action];

  return (
    <>
      <PageHeader title="Users" actions={<RefreshButton />} />
      {done && <div className="mb-4"><Notice tone="success" title="Done">{done}</Notice></div>}
      {exportError && <div className="mb-4"><Notice tone="danger" title="Export failed">{exportError}</Notice></div>}
      <Toolbar
        actions={
          <>
            <DownloadCsvButton label="Access review" onClick={async () => setExportError(await downloadFile("/staff/export", { search: url.get("q"), status, role, branch }, "staff.csv"))} />
            <button type="button" onClick={() => setEditing("new")} className="inline-flex h-10 items-center gap-2 rounded-lg border border-accent-100 bg-accent-50 px-4 text-sm font-medium text-accent-700 hover:bg-accent-100">
              Add New User <UserPlus size={16} aria-hidden />
            </button>
          </>
        }
      >
        <SearchField value={url.search.value} onChange={url.search.onChange} placeholder="Search by Name, Email" />
        <FiltersButton active={[status, role, branch].filter(Boolean).length}>
          <Field label="Status" htmlFor="u-status"><Select id="u-status" value={status} onChange={(e) => url.set({ status: e.target.value })}><option value="">All statuses</option>{options?.statuses?.map((s) => <option key={s} value={s}>{humanise(s)}</option>)}</Select></Field>
          <Field label="Role" htmlFor="u-role"><Select id="u-role" value={role} onChange={(e) => url.set({ role: e.target.value })}><option value="">All roles</option>{options?.roles?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</Select></Field>
          <Field label="Branch" htmlFor="u-branch"><Select id="u-branch" value={branch} onChange={(e) => url.set({ branch: e.target.value })}><option value="">All branches</option>{options?.branches?.map((b) => <option key={b} value={b}>{b}</option>)}</Select></Field>
        </FiltersButton>
      </Toolbar>

      {list.isError && !list.data ? <ErrorState error={list.error} onRetry={() => void list.refetch()} title="Users could not be loaded" /> : (
        <DataTable grid columns={columns} rows={rows} rowKey={(s) => s.staffId} loading={list.isLoading} selectable={{ selected, onChange: setSelected }} empty="No user matches."
          footer={<Pager page={meta?.page ?? url.page} totalPages={meta?.totalPages} total={meta?.total} size={meta?.size ?? SIZE} shown={rows.length} noun="users" onPage={(p) => url.set({ page: String(p) })} />} />
      )}

      {editing && <StaffModal member={editing} onClose={() => setEditing(null)} onDone={setDone} />}
      <ActionDialog open={!!act} onClose={() => setAct(null)} danger={copy?.danger} title={copy?.title ?? ""} description={act ? `${fullName(act.member)} (${act.member.staffId}). ${copy?.desc}` : undefined} confirmLabel={copy?.label ?? ""}
        onConfirm={async () => { if (!act || !copy) return; const r = (await doAction.mutateAsync({ staffId: act.member.staffId, action: act.action })) as { data?: { message?: string } } | undefined; setDone(r?.data?.message || copy.ok); }} />
    </>
  );
}
