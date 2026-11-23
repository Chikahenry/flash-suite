"use client";

import { useMemo, useState } from "react";
import { Lock, Play, Plus, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Card, Notice, PageHeader } from "@/components/ui/layout";
import { Modal } from "@/components/ui/modal";
import { ErrorState, Skeleton } from "@/components/ui/query-state";
import { SearchField, Toolbar } from "@/components/ui/toolbar";
import { ApiError } from "@/lib/bo/client";
import { fullName, useDeleteRole, usePermissionCatalogue, useRolePermissions, useRoles, useRoleUsers, useSaveRole, type Permission, type Role } from "@/lib/bo/access";
import { humanise } from "@/lib/bo/format";

const box = "size-[18px] rounded border-line accent-accent-500";

/** Figma "Select Permissions": one checkbox per module, opening that module's permissions. Read-only unless `onChange` is passed. */
function PermissionPicker({ catalogue, value, onChange }: { catalogue: Permission[]; value: string[]; onChange?: (ids: string[]) => void }) {
  const modules = useMemo(() => {
    const m = new Map<string, Permission[]>();
    for (const p of catalogue) m.set(p.module ?? "Other", [...(m.get(p.module ?? "Other") ?? []), p]);
    return [...m.entries()];
  }, [catalogue]);
  const toggle = (id: string) => onChange?.(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  const toggleModule = (perms: Permission[]) => {
    const ids = perms.map((p) => p.id);
    const all = ids.every((i) => value.includes(i));
    onChange?.(all ? value.filter((v) => !ids.includes(v)) : [...new Set([...value, ...ids])]);
  };
  if (modules.length === 0) return <p className="text-sm text-ink-500">No permission is defined yet.</p>;
  return (
    <ul className="flex flex-col gap-4">
      {modules.map(([module, perms]) => {
        const on = perms.some((p) => value.includes(p.id));
        return (
          <li key={module}>
            <label className="inline-flex items-center gap-2.5 text-sm font-medium text-ink-900">
              <input type="checkbox" className={box} checked={perms.every((p) => value.includes(p.id))} ref={(el) => { if (el) el.indeterminate = on && !perms.every((p) => value.includes(p.id)); }} disabled={!onChange} onChange={() => toggleModule(perms)} /> {humanise(module)}
            </label>
            <div className="ml-7 mt-2.5 grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
              {perms.map((p) => (
                <label key={p.id} className="inline-flex items-center gap-2.5 text-[13px] text-ink-700" title={p.code}>
                  <input type="checkbox" className={box} checked={value.includes(p.id)} disabled={!onChange} onChange={() => toggle(p.id)} /> {p.description || humanise(`${p.resource ?? ""} ${p.action ?? ""}`) || p.code}
                </label>
              ))}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Create or edit a custom role. System roles open read-only: the Bank defines them. */
function RoleEditor({ role, onClose, onDone }: { role?: Role; onClose: () => void; onDone: (m: string) => void }) {
  const catalogue = usePermissionCatalogue();
  const current = useRolePermissions(role?.id ?? null);
  const save = useSaveRole();
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [picked, setPicked] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const ids = picked ?? (current.data?.map((p) => p.id) ?? []);
  const ready = !role || current.isSuccess;

  const submit = async () => {
    setError(null);
    setFields({});
    if (name.trim().length < 2) return setError("Give the role a name.");
    try {
      await save.mutateAsync({ roleId: role?.id, name: name.trim(), description: description.trim(), permissionIds: ids });
      onDone(role ? "Role updated." : "Role created.");
      onClose();
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
        setFields(Object.fromEntries(e.fieldErrors.map((x) => [x.field, x.message])));
      } else setError("Something went wrong. Try again.");
    }
  };

  return (
    <Modal open onClose={onClose} title={role ? "Edit role" : "Create a new role"} footer={<Button block disabled={save.isPending || !ready} onClick={() => void submit()}>{save.isPending ? "Saving…" : role ? "Save Changes" : "Create New Role"}</Button>}>
      <div className="flex flex-col gap-4 pb-2">
        {error && <Notice tone="danger">{error}</Notice>}
        <Field label="Role Name" htmlFor="rb-name" required error={fields.name}><Input id="rb-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} /></Field>
        <Field label="Description (Optional)" htmlFor="rb-desc" error={fields.description}><Textarea id="rb-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} /></Field>
        <p className="text-[13px] font-medium text-ink-900">Select Permissions</p>
        {role && current.isLoading ? <Skeleton className="h-32" /> : catalogue.isError ? <ErrorState error={catalogue.error} onRetry={() => void catalogue.refetch()} title="Permissions could not be loaded" /> : (
          <PermissionPicker catalogue={catalogue.data ?? []} value={ids} onChange={setPicked} />
        )}
        {role && role.permissionCount !== undefined && <p className="text-xs text-ink-500">Anyone holding this role gets the new permissions as soon as you save.</p>}
      </div>
    </Modal>
  );
}

function RoleDetails({ role, onClose, onEdit, onDelete }: { role: Role; onClose: () => void; onEdit: () => void; onDelete: () => void }) {
  const catalogue = usePermissionCatalogue();
  const perms = useRolePermissions(role.id);
  const users = useRoleUsers(role.id);
  return (
    <Modal open onClose={onClose} title={`${role.name} Role`}
      footer={<><Button variant="secondary" onClick={onClose}>Close</Button>{!role.systemRole && <Button variant="danger" onClick={onDelete}>Delete</Button>}{!role.systemRole && <Button onClick={onEdit}>Edit</Button>}</>}>
      <div className="flex flex-col gap-4 pb-2">
        <div className="rounded-lg bg-surface px-4 py-3">
          <p className="text-[13px] font-semibold text-ink-900">Description</p>
          <p className="mt-1 text-[13px] text-ink-700">{role.description || "No description."}</p>
        </div>
        {role.systemRole && <Notice tone="info">This is a system role defined by the Bank. It cannot be edited or deleted.</Notice>}
        <p className="text-[13px] font-medium text-ink-900">Permissions</p>
        {perms.isLoading ? <Skeleton className="h-24" /> : perms.isError ? <ErrorState error={perms.error} onRetry={() => void perms.refetch()} /> :
          <PermissionPicker catalogue={perms.data ?? catalogue.data ?? []} value={(perms.data ?? []).map((p) => p.id)} />}
        <p className="text-[13px] font-medium text-ink-900">Staff with this role</p>
        {users.isLoading ? <Skeleton className="h-12" /> : users.isError ? <ErrorState error={users.error} onRetry={() => void users.refetch()} /> : (users.data ?? []).length === 0 ? <p className="text-sm text-ink-500">No one holds this role.</p> : (
          <ul className="divide-y divide-line rounded-xl border border-line">
            {(users.data ?? []).map((u) => <li key={u.id} className="flex items-center justify-between px-4 py-2.5 text-[13px]"><span>{fullName(u)} <span className="tabular text-ink-500">{u.staffId}</span></span><Badge tone={/ACTIVE/i.test(u.status ?? "") && !/IN/i.test(u.status ?? "") ? "success" : "neutral"}>{humanise(u.status)}</Badge></li>)}
          </ul>
        )}
      </div>
    </Modal>
  );
}

// Role bundles. GET /roles, /roles/{id}/permissions, /roles/{id}/users, /permissions; POST/PATCH/DELETE /roles,
// PUT /roles/{id}/permissions. Only custom roles can be changed.
export default function RolesPage() {
  const [q, setQ] = useState("");
  const [viewing, setViewing] = useState<Role | null>(null);
  const [editing, setEditing] = useState<Role | "new" | null>(null);
  const [deleting, setDeleting] = useState<Role | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const roles = useRoles();
  const del = useDeleteRole();
  const rows = (roles.data ?? []).filter((r) => `${r.name} ${r.description ?? ""}`.toLowerCase().includes(q.toLowerCase().trim()));

  return (
    <>
      <PageHeader title="Roles & Permissions" />
      {done && <div className="mb-4"><Notice tone="success" title="Done">{done}</Notice></div>}
      <Toolbar actions={<button type="button" onClick={() => setEditing("new")} className="inline-flex h-10 items-center gap-2 rounded-lg border border-accent-100 bg-accent-50 px-4 text-sm font-medium text-accent-700 hover:bg-accent-100">Create New Role <Plus size={16} aria-hidden /></button>}>
        <SearchField value={q} onChange={setQ} placeholder="Search by Name" />
      </Toolbar>

      {roles.isError && !roles.data ? <ErrorState error={roles.error} onRetry={() => void roles.refetch()} title="Roles could not be loaded" /> : roles.isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"><Skeleton className="h-36" /><Skeleton className="h-36" /><Skeleton className="h-36" /></div>
      ) : rows.length === 0 ? <p className="text-sm text-ink-500">No role matches.</p> : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => (
            <Card key={r.id}>
              <div className="flex h-full flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold">{r.name}</p>
                  {r.systemRole && <span title="System role" className="inline-flex items-center gap-1 text-xs text-ink-500"><Lock size={12} aria-hidden /> System</span>}
                </div>
                <p className="line-clamp-2 flex-1 text-[13px] text-ink-500">{r.description || "No description."}</p>
                <ul className="flex flex-col gap-1.5 text-sm text-ink-900"><li className="flex items-center gap-2"><Play size={9} aria-hidden className="fill-ink-900" /> {r.permissionCount ?? 0} permissions</li></ul>
                <div className="flex flex-wrap gap-1">{r.channel && <Badge tone="neutral" dot={false}>{humanise(r.channel)}</Badge>}</div>
                <div className="flex gap-2">
                  <Button variant="subtle" size="sm" onClick={() => setViewing(r)}><Users size={14} aria-hidden /> View Details</Button>
                  {!r.systemRole && <Button variant="subtle" size="sm" onClick={() => setEditing(r)}>Edit</Button>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {viewing && <RoleDetails role={viewing} onClose={() => setViewing(null)} onEdit={() => { setEditing(viewing); setViewing(null); }} onDelete={() => { setDeleting(viewing); setViewing(null); }} />}
      {editing && <RoleEditor role={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} onDone={setDone} />}
      <ActionDialog open={!!deleting} onClose={() => setDeleting(null)} danger title="Delete this role?" description={deleting ? `${deleting.name} is removed. A role that someone still holds cannot be deleted.` : undefined} confirmLabel="Yes, Delete"
        onConfirm={async () => { if (!deleting) return; await del.mutateAsync(deleting.id); setDone(`${deleting.name} deleted.`); }} />
    </>
  );
}
