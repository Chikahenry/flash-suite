"use client";

import { useState } from "react";
import { Play, Plus, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Card, Notice, PageHeader } from "@/components/ui/layout";
import { Modal } from "@/components/ui/modal";
import { SearchField, Toolbar } from "@/components/ui/toolbar";
import { useRaise } from "@/components/requests/use-raise";
import { FUNCTIONS, PERMISSION_KINDS, roleBundles, type PermissionKind, type RoleBundle } from "@/lib/api";

type Matrix = Record<string, PermissionKind[]>;

/**
 * Figma "Select Permissions": one checkbox per module; ticking it opens a two-column grid of that
 * module's permissions. The Figma lists Create, Read, Approve and Update; the BRD needs
 * View, Initiate, Amend, Approve and Export granted separately (6.2.4 rule 1), so those five are used.
 * Read-only unless `onChange` is passed.
 */
function PermissionMatrix({ value, onChange }: { value: Matrix; onChange?: (m: Matrix) => void }) {
  const box = "size-[18px] rounded border-line accent-accent-500";
  const toggleModule = (fn: string) => {
    if (!onChange) return;
    const next = { ...value };
    if (next[fn]) delete next[fn];
    else next[fn] = ["View"];
    onChange(next);
  };
  const toggle = (fn: string, kind: PermissionKind) => {
    if (!onChange) return;
    const cur = value[fn] ?? [];
    onChange({ ...value, [fn]: cur.includes(kind) ? cur.filter((k) => k !== kind) : [...cur, kind] });
  };
  return (
    <ul className="flex flex-col gap-3">
      {FUNCTIONS.map((fn) => {
        const on = fn in value;
        return (
          <li key={fn}>
            <label className="inline-flex items-center gap-2.5 text-sm text-ink-900">
              <input type="checkbox" className={box} checked={on} disabled={!onChange} onChange={() => toggleModule(fn)} /> {fn}
            </label>
            {on && (
              <div className="ml-7 mt-2.5 grid grid-cols-2 gap-x-6 gap-y-2.5">
                {PERMISSION_KINDS.map((k) => (
                  <label key={k} className="inline-flex items-center gap-2.5 text-[13px] text-ink-700">
                    <input type="checkbox" className={box} aria-label={`${fn}: ${k}`} checked={(value[fn] ?? []).includes(k)} disabled={!onChange} onChange={() => toggle(fn, k)} /> {k}
                  </label>
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function BundleEditor({ bundle }: { bundle?: RoleBundle }) {
  const [matrix, setMatrix] = useState<Matrix>(bundle?.permissions ?? {});
  const both = FUNCTIONS.filter((f) => matrix[f]?.includes("Initiate") && matrix[f]?.includes("Approve"));
  return (
    <div className="flex flex-col gap-4">
      <Field label="Role Name" htmlFor="rb-name" required><Input id="rb-name" defaultValue={bundle?.name} /></Field>
      <Field label="Description (Optional)" htmlFor="rb-desc"><Textarea id="rb-desc" placeholder="Role Description" defaultValue={bundle?.description} /></Field>
      <p className="text-[13px] font-medium text-ink-900">Select Permissions</p>
      {both.length > 0 && <Notice tone="warning">This bundle can both initiate and approve {both.join(", ")}. Holders still cannot approve their own requests.</Notice>}
      <PermissionMatrix value={matrix} onChange={setMatrix} />
    </div>
  );
}

// Role bundles (BRD UAM-003, UAM-011): configurable without code, changed under maker-checker.
// GET /roles, /roles/{id}, /permissions.
export default function RolesPage() {
  const [viewing, setViewing] = useState<RoleBundle | null>(null);
  const [q, setQ] = useState("");
  const [raise, modal] = useRaise();

  const edit = (b?: RoleBundle) => {
    setViewing(null);
    raise({ action: b ? "Edit role" : "Create a new role", target: b?.name ?? "New role", evidence: ["Role matrix sign-off"], internal: true, fn: "Staff access", submitLabel: b ? "Edit" : "Create New Role", body: <BundleEditor bundle={b} />, warning: b ? `${b.staffCount} staff hold this role. Their access changes when the amendment is approved.` : undefined });
  };

  return (
    <>
      <PageHeader title="Roles & Permissions" />
      <Toolbar
        actions={
          <button type="button" onClick={() => edit()} className="inline-flex h-10 items-center gap-2 rounded-lg border border-accent-100 bg-accent-50 px-4 text-sm font-medium text-accent-700 hover:bg-accent-100">
            Create New Role <Plus size={16} aria-hidden />
          </button>
        }
      >
        <SearchField value={q} onChange={setQ} placeholder="Search by Name" />
      </Toolbar>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {roleBundles.filter((b) => b.name.toLowerCase().includes(q.toLowerCase().trim())).map((b) => {
          const fns = Object.keys(b.permissions);
          const approves = fns.some((f) => b.permissions[f].includes("Approve"));
          const initiates = fns.some((f) => b.permissions[f].includes("Initiate"));
          return (
            <Card key={b.id}>
              <div className="flex h-full flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold">{b.name}</p>
                  <span className="inline-flex items-center gap-1 text-xs tabular text-ink-500"><Users size={12} aria-hidden /> {b.staffCount}</span>
                </div>
                <div className="flex-1">
                  <p className="text-[13px] text-ink-500">Permissions:</p>
                  <ul className="mt-2 flex flex-col gap-1.5 text-sm text-ink-900">
                    {fns.slice(0, 3).map((f) => <li key={f} className="flex items-center gap-2"><Play size={9} aria-hidden className="fill-ink-900" /> {f}</li>)}
                    {fns.length > 3 && <li className="flex items-center gap-2"><Play size={9} aria-hidden className="fill-ink-900" /> +{fns.length - 3} more</li>}
                  </ul>
                </div>
                <div className="flex flex-wrap gap-1">
                  {initiates && <Badge tone="info" dot={false}>Maker</Badge>}
                  {approves && <Badge tone="success" dot={false}>Checker</Badge>}
                  {!initiates && !approves && <Badge tone="neutral" dot={false}>View only</Badge>}
                </div>
                <div className="flex gap-2">
                  <Button variant="subtle" size="sm" onClick={() => setViewing(b)}>View Details</Button>
                  <Button variant="subtle" size="sm" onClick={() => edit(b)}>Edit</Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing ? `${viewing.name} Role` : ""} footer={<><Button variant="secondary" onClick={() => setViewing(null)}>Close</Button><Button onClick={() => edit(viewing ?? undefined)}>Edit</Button></>}>
        {viewing && (
          <div className="flex flex-col gap-4">
            <div className="rounded-lg bg-surface px-4 py-3">
              <p className="text-[13px] font-semibold text-ink-900">Description</p>
              <p className="mt-1 text-[13px] text-ink-700">{viewing.description}</p>
            </div>
            <p className="text-[13px] font-medium text-ink-900">Permissions</p>
            <PermissionMatrix value={viewing.permissions} />
          </div>
        )}
      </Modal>
      {modal}
    </>
  );
}
