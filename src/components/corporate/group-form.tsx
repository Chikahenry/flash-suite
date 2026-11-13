"use client";

import { useState } from "react";
import { Field, Input, Select } from "@/components/ui/form";
import { Notice } from "@/components/ui/layout";
import type { CorporateRole, Organization, UserGroup } from "@/lib/types";

const KINDS: UserGroup["kind"][] = ["Inputter", "Verifier", "Authorizer"];

/** A user can sit in a group only if they hold the matching role (BRD UAM-026, UAM-038). */
export const eligibleFor = (roles: CorporateRole[], kind: UserGroup["kind"]) =>
  roles.includes(kind) || roles.includes("Super Administrator");

/**
 * Create or amend an Inputter, Verifier or Authorizer group (BRD UAM-033).
 * Membership never overrides individual permissions, so only users holding the matching role can be ticked,
 * and a Verifier role alone never makes someone an Authorizer.
 */
export function GroupForm({ org, group }: { org: Organization; group?: UserGroup }) {
  const [kind, setKind] = useState<UserGroup["kind"]>(group?.kind ?? "Inputter");
  const [members, setMembers] = useState<string[]>(group?.members ?? []);
  const toggle = (id: string) => setMembers((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));
  const usedBy = group ? org.policies.filter((p) => [p.inputterGroup, p.verifierGroup, p.authorizerGroup].includes(group.name)).length : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Group name" htmlFor="g-name" required><Input id="g-name" defaultValue={group?.name} /></Field>
        <Field label="Group type" htmlFor="g-kind" required hint={group ? "The type cannot change once the group exists." : undefined}>
          <Select id="g-kind" value={kind} disabled={!!group} onChange={(e) => { setKind(e.target.value as UserGroup["kind"]); setMembers([]); }}>
            {KINDS.map((k) => <option key={k}>{k}</option>)}
          </Select>
        </Field>
      </div>

      {usedBy > 0 && <Notice tone="warning">This group is used by {usedBy} policy band{usedBy === 1 ? "" : "s"}. A band with no eligible member cannot progress to the next stage.</Notice>}
      {members.length === 0 && <Notice tone="info">A group with no member blocks every band that uses it. Add at least one eligible user.</Notice>}

      <fieldset>
        <legend className="mb-2 text-[13px] font-medium">Members <span className="text-red-600">*</span></legend>
        {org.users.length === 0 ? (
          <p className="text-[13px] text-ink-500">This organisation has no users yet.</p>
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line">
            {org.users.map((u) => {
              const ok = eligibleFor(u.roles, kind) && u.status !== "Deactivated";
              return (
                <li key={u.id}>
                  <label className={`flex items-center gap-3 px-3 py-2.5 text-sm ${ok ? "" : "opacity-55"}`}>
                    <input type="checkbox" className="size-[18px] accent-accent-500" disabled={!ok} checked={members.includes(u.id)} onChange={() => toggle(u.id)} />
                    <span className="flex-1">{u.firstName} {u.lastName} <span className="text-xs text-ink-500">· {u.roles.join(", ")}</span></span>
                    {!ok && <span className="text-xs text-ink-500">No {kind} role</span>}
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </fieldset>
    </div>
  );
}

/** What a group deletion touches, for the checker (BRD UAM-028). */
export function GroupDeleteSummary({ org, group }: { org: Organization; group: UserGroup }) {
  const bands = org.policies.filter((p) => [p.inputterGroup, p.verifierGroup, p.authorizerGroup].includes(group.name));
  return (
    <ul className="rounded-lg border border-line text-[13px]">
      <li className="flex justify-between border-b border-line px-3 py-2"><span className="text-ink-700">Members removed from the group</span><span className="font-semibold tabular">{group.members.length}</span></li>
      <li className="flex justify-between border-b border-line px-3 py-2"><span className="text-ink-700">Policy bands that use it</span><span className="font-semibold tabular">{bands.length}</span></li>
      <li className="flex justify-between px-3 py-2"><span className="text-ink-700">Pending transactions held</span><span className="font-semibold tabular">{org.pendingTransactions}</span></li>
    </ul>
  );
}
