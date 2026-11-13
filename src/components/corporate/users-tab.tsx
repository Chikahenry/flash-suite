"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Field, Input, Select } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/layout";
import type { RaiseRequestConfig } from "@/components/requests/raise-request-modal";
import { accessStatusTone, formatDateTime, formatNaira } from "@/lib/format";
import type { CorporateUser, Organization } from "@/lib/types";

type Raise = (config: RaiseRequestConfig) => void;

/** Actions offered depend on the user's current access status (BRD UAM-013). */
function actionsFor(user: CorporateUser): string[] {
  const common = ["Change roles and limits", "Update email or phone", "Remove from organisation"];
  switch (user.status) {
    case "Active":
      return ["Lock user", "Reset password", "Reset security questions", "Send username", ...common, "Deactivate user"];
    case "Locked":
      return ["Unlock user", "Reset password", ...common, "Deactivate user"];
    case "Pending activation":
      return ["Resend activation", ...common];
    default:
      return ["Remove from organisation"];
  }
}

const EVIDENCE: Record<string, string[]> = {
  "Remove from organisation": ["Customer instruction", "Board Resolution"],
  "Deactivate user": ["Customer instruction"],
  "Change roles and limits": ["Customer instruction", "Mandate confirmation"],
  "Update email or phone": ["Customer instruction", "Identification"],
};

function ContactFields({ user }: { user: CorporateUser }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="New email" htmlFor="new-email" hint={`Current: ${user.email}`}><Input id="new-email" type="email" defaultValue={user.email} /></Field>
      <Field label="New phone" htmlFor="new-phone" hint={`Current: ${user.phone}`}><Input id="new-phone" defaultValue={user.phone} /></Field>
    </div>
  );
}

function RoleLimitFields({ user }: { user: CorporateUser }) {
  return (
    <div className="flex flex-col gap-4">
      <fieldset>
        <legend className="mb-2 text-[13px] font-medium">Roles</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {ROLES.map((r) => (
            <label key={r} className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4 accent-accent-500" defaultChecked={user.roles.includes(r as CorporateUser["roles"][number])} /> {r}
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="Daily limit (NGN)" htmlFor="rl-limit" hint={`Current: ${user.dailyLimit ? formatNaira(user.dailyLimit) : "None"}`}>
        <Input id="rl-limit" inputMode="decimal" defaultValue={user.dailyLimit || ""} />
      </Field>
    </div>
  );
}

export function UsersTab({ org, raise }: { org: Organization; raise: Raise }) {
  const [menuFor, setMenuFor] = useState<string | null>(null);
  // The menu is positioned against the viewport so the table scroll container cannot clip it.
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });

  const start = (user: CorporateUser, action: string) => {
    setMenuFor(null);
    raise({
      action,
      target: `${user.firstName} ${user.lastName} (${user.username}) · ${org.name}`,
      evidence: EVIDENCE[action] ?? ["Customer instruction"],
      danger: action === "Remove from organisation" || action === "Deactivate user",
      warning:
        action === "Remove from organisation"
          ? `This revokes access to ${org.name} only. Access to other organisations, and all history, is kept.`
          : action === "Update email or phone"
            ? "This changes the selected user only. It does not change the organisation's contacts or any CRM record."
            : action === "Change roles and limits"
              ? "Authorizers are checked against the signing mandate. A Verifier role alone gives no authorisation rights."
              : undefined,
      body: action === "Update email or phone" ? <ContactFields user={user} /> : action === "Change roles and limits" ? <RoleLimitFields user={user} /> : undefined,
    });
  };

  const columns: Column<CorporateUser>[] = [
    { key: "name", header: "User", cell: (u) => (<div><p className="font-medium">{u.firstName} {u.lastName}</p><p className="text-xs text-ink-500">{u.username}</p></div>) },
    { key: "contact", header: "Contact", cell: (u) => (<div><p>{u.email}</p><p className="text-xs tabular text-ink-500">{u.phone}</p></div>) },
    { key: "roles", header: "Roles", cell: (u) => <div className="flex flex-wrap gap-1">{u.roles.map((r) => <Badge key={r} tone="info" dot={false}>{r}</Badge>)}</div> },
    { key: "limit", header: "Daily limit", align: "right", cell: (u) => (u.dailyLimit ? formatNaira(u.dailyLimit) : "None") },
    { key: "status", header: "Access status", cell: (u) => <Badge tone={accessStatusTone[u.status]}>{u.status}</Badge> },
    { key: "login", header: "Last sign-in", cell: (u) => <span className="tabular text-ink-500">{u.lastLogin ? formatDateTime(u.lastLogin) : "Never"}</span> },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (u) => (
        <div className="relative inline-block text-left">
          <Button variant="secondary" size="sm" aria-haspopup="menu" aria-expanded={menuFor === u.id} onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              const below = window.innerHeight - r.bottom > 320;
              setMenuPos({ top: below ? r.bottom + 4 : Math.max(8, r.top - 316), right: window.innerWidth - r.right });
              setMenuFor(menuFor === u.id ? null : u.id);
            }}>
            Actions
          </Button>
          {menuFor === u.id && (
            <ul role="menu" style={menuPos} className="fixed z-20 w-56 rounded-lg border border-line bg-white py-1 text-left shadow-pop">
              {actionsFor(u).map((a) => (
                <li key={a} role="none">
                  <button role="menuitem" type="button" onClick={() => start(u, a)} className="block w-full px-3 py-2 text-left text-[13px] text-ink-900 hover:bg-surface">
                    {a}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ),
    },
  ];

  const addUsers = () =>
    raise({
      action: "Create corporate users",
      target: org.name,
      evidence: ["CONB Form", "Board Resolution"],
      body: <NewUsersForm org={org} />,
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-ink-500">Roles and access status are separate: a role says what a user may do, the status says whether they can sign in.</p>
        <Button onClick={addUsers}><UserPlus size={16} aria-hidden /> Add users</Button>
      </div>
      {org.users.length === 0 ? (
        <EmptyState title="No users yet" body="Add the users nominated on the customer's instruction. Each user gets a separate decision and outcome." action={<Button onClick={addUsers}>Add users</Button>} />
      ) : (
        <DataTable columns={columns} rows={org.users} rowKey={(u) => u.id} />
      )}
    </div>
  );
}

interface Draft { firstName: string; lastName: string; username: string; email: string; role: string }
const blank: Draft = { firstName: "", lastName: "", username: "", email: "", role: "Inputter" };
const ROLES = ["Inputter", "Verifier", "Authorizer", "Workflow Administrator", "Super Administrator", "View-Only"];

/** Several nominated users in one request, without repeating organisation details (BRD 6.3.4). */
function NewUsersForm({ org }: { org: Organization }) {
  const [drafts, setDrafts] = useState<Draft[]>([{ ...blank }]);
  const taken = new Set(org.users.map((u) => u.username));
  const update = (i: number, patch: Partial<Draft>) => setDrafts((d) => d.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  return (
    <div className="flex flex-col gap-3">
      {drafts.map((d, i) => {
        const clash = d.username && taken.has(d.username);
        return (
          <fieldset key={i} className="rounded-lg border border-line p-3">
            <legend className="px-1 text-xs font-medium text-ink-500">User {i + 1}</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="First name" htmlFor={`fn-${i}`}><Input id={`fn-${i}`} value={d.firstName} onChange={(e) => update(i, { firstName: e.target.value })} /></Field>
              <Field label="Last name" htmlFor={`ln-${i}`}><Input id={`ln-${i}`} value={d.lastName} onChange={(e) => update(i, { lastName: e.target.value })} /></Field>
              <Field label="Preferred username" htmlFor={`un-${i}`} error={clash ? "This username is already in use." : undefined} hint={d.username && !clash ? "Available" : undefined}>
                <Input id={`un-${i}`} value={d.username} onChange={(e) => update(i, { username: e.target.value.trim() })} />
              </Field>
              <Field label="Email" htmlFor={`em-${i}`}><Input id={`em-${i}`} type="email" value={d.email} onChange={(e) => update(i, { email: e.target.value })} /></Field>
              <Field label="Role" htmlFor={`ro-${i}`} className="sm:col-span-2">
                <Select id={`ro-${i}`} value={d.role} onChange={(e) => update(i, { role: e.target.value })}>
                  {ROLES.map((r) => <option key={r}>{r}</option>)}
                </Select>
              </Field>
            </div>
          </fieldset>
        );
      })}
      <Button variant="secondary" size="sm" className="self-start" onClick={() => setDrafts((d) => [...d, { ...blank }])}>Add another user</Button>
    </div>
  );
}
