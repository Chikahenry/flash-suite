"use client";

import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { Card, EmptyState, Notice } from "@/components/ui/layout";
import type { RaiseRequestConfig } from "@/components/requests/raise-request-modal";
import { formatNaira } from "@/lib/format";
import { GroupDeleteSummary, GroupForm } from "./group-form";
import type { Organization, PolicyBand } from "@/lib/types";

/** Finds gaps and overlaps between amount bands (BRD UAM-036). Mirrors POST /organizations/{id}/policies/validate. */
export function validateBands(bands: PolicyBand[]): string[] {
  const issues: string[] = [];
  const sorted = [...bands].sort((a, b) => a.min - b.min);
  sorted.forEach((b, i) => {
    const next = sorted[i + 1];
    if (!next) {
      if (b.max !== null) issues.push(`Amounts above ${formatNaira(b.max)} match no band, so those transactions cannot proceed.`);
      return;
    }
    if (b.max === null || next.min <= b.max) issues.push(`Bands starting at ${formatNaira(b.min)} and ${formatNaira(next.min)} overlap.`);
    else if (next.min - b.max > 0.011) issues.push(`Amounts between ${formatNaira(b.max)} and ${formatNaira(next.min)} match no band.`);
  });
  return issues;
}

function BandForm({ org }: { org: Organization }) {
  const groups = (kind: string) => org.groups.filter((g) => g.kind === kind);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Transaction type" htmlFor="b-type"><Select id="b-type"><option>Transfers</option><option>Bills</option><option>Bulk payments</option></Select></Field>
      <Field label="Currency" htmlFor="b-cur"><Select id="b-cur"><option>NGN</option><option>USD</option></Select></Field>
      <Field label="From amount" htmlFor="b-min"><Input id="b-min" inputMode="decimal" placeholder="0.00" /></Field>
      <Field label="To amount" htmlFor="b-max" hint="Leave empty for no upper limit."><Input id="b-max" inputMode="decimal" /></Field>
      <Field label="Inputter group" htmlFor="b-in"><Select id="b-in">{groups("Inputter").map((g) => <option key={g.id}>{g.name}</option>)}</Select></Field>
      <Field label="Verifier group" htmlFor="b-ver"><Select id="b-ver"><option>None</option>{groups("Verifier").map((g) => <option key={g.id}>{g.name}</option>)}</Select></Field>
      <Field label="Authorizer group" htmlFor="b-auth"><Select id="b-auth">{groups("Authorizer").map((g) => <option key={g.id}>{g.name}</option>)}</Select></Field>
      <Field label="Authorizers required" htmlFor="b-n"><Select id="b-n"><option>1</option><option>2</option><option>3</option></Select></Field>
      <Field label="Routing" htmlFor="b-route" className="sm:col-span-2"><Select id="b-route"><option>Sequential</option><option>Parallel</option></Select></Field>
    </div>
  );
}

export function WorkflowTab({ org, raise }: { org: Organization; raise: (c: RaiseRequestConfig) => void }) {
  const issues = validateBands(org.policies);
  const userName = (id: string) => {
    const u = org.users.find((x) => x.id === id);
    return u ? `${u.firstName} ${u.lastName}` : id;
  };
  const pendingNote = org.pendingTransactions
    ? `${org.pendingTransactions} pending transactions keep the policy version they were submitted under. They are not rerouted.`
    : undefined;

  const addBand = () =>
    raise({ action: "Create workflow policy band", target: org.name, evidence: ["Customer instruction", "Board Resolution"], warning: pendingNote, body: <BandForm org={org} /> });

  return (
    <div className="flex flex-col gap-6">
      <Card title="Groups" actions={<Button variant="secondary" size="sm" onClick={() => raise({ action: "Create user group", target: org.name, evidence: ["Customer instruction"], body: <GroupForm org={org} /> })}><Plus size={14} aria-hidden /> Add group</Button>}>
        {org.groups.length === 0 ? (
          <p className="text-[13px] text-ink-500">No groups. Create Inputter, Verifier and Authorizer groups before adding policy bands.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {org.groups.map((g) => (
              <div key={g.id} className="rounded-lg border border-line p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-ink-900">{g.name}</p>
                  <Badge tone="info" dot={false}>{g.kind}</Badge>
                </div>
                <ul className="mt-3 flex flex-col gap-1 text-[13px] text-ink-700">
                  {g.members.length === 0 ? <li className="text-red-700">No member. Bands using this group cannot progress.</li> : g.members.map((m) => <li key={m}>{userName(m)}</li>)}
                </ul>
                <div className="mt-3 flex gap-1.5">
                  <Button variant="subtle" size="sm" onClick={() => raise({ action: "Amend user group", target: `${org.name} · ${g.name}`, evidence: ["Customer instruction"], warning: pendingNote, body: <GroupForm org={org} group={g} /> })}>Amend</Button>
                  <Button variant="ghost" size="sm" className="text-red-700" onClick={() => raise({ action: "Delete user group", target: `${org.name} · ${g.name}`, evidence: ["Customer instruction"], danger: true, warning: "Deleting a group leaves any band that uses it without a required stage. Amend those bands first.", body: <GroupDeleteSummary org={org} group={g} /> })}>Delete</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Amount-band policies" padded={false} actions={<Button size="sm" onClick={addBand} disabled={org.groups.length === 0}><Plus size={14} aria-hidden /> Add band</Button>}>
        <div className="flex flex-col gap-3 p-5">
          {issues.length > 0 && (
            <Notice tone="danger" title="This configuration cannot be activated">
              <ul className="list-disc pl-4">{issues.map((i) => <li key={i}>{i}</li>)}</ul>
            </Notice>
          )}
          {pendingNote && <Notice tone="info">{pendingNote}</Notice>}
          {org.policies.length === 0 ? (
            <EmptyState title="No policy bands" body="Without a matching band, transactions for this organisation cannot proceed to execution." />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full min-w-[820px] text-left text-[13px]">
                <thead>
                  <tr className="bg-surface text-ink-700">
                    {["Type", "Amount range", "Inputters", "Verification", "Authorisation", "Routing", ""].map((h) => (
                      <th key={h} scope="col" className="px-4 py-3 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {org.policies.map((p) => (
                    <tr key={p.id} className="border-t border-line">
                      <td className="px-4 py-3">{p.transactionType} · {p.currency}</td>
                      <td className="px-4 py-3 tabular">{formatNaira(p.min)} to {p.max === null ? "no upper limit" : formatNaira(p.max)}</td>
                      <td className="px-4 py-3">{p.inputterGroup}</td>
                      <td className="px-4 py-3">{p.verifierGroup ? `${p.verifiersRequired} from ${p.verifierGroup}` : "Not required"}</td>
                      <td className="px-4 py-3">{p.authorizersRequired} from {p.authorizerGroup}</td>
                      <td className="px-4 py-3">{p.routing}</td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" onClick={() => raise({ action: "Amend workflow policy band", target: `${org.name} · ${p.id}`, evidence: ["Customer instruction"], warning: pendingNote, body: <BandForm org={org} /> })}>Amend</Button>
                        <Button variant="ghost" size="sm" className="text-red-700" onClick={() => raise({ action: "Delete workflow policy band", target: `${org.name} · ${p.id}`, evidence: ["Customer instruction", "Board Resolution"], danger: true, warning: `Deleting this band leaves its amount range without a rule, so matching transactions cannot proceed until another band covers it.${pendingNote ? " " + pendingNote : ""}` })}>Delete</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
