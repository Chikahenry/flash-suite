"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/layout";
import type { RaiseRequestConfig } from "@/components/requests/raise-request-modal";
import type { Organization } from "@/lib/types";

/**
 * Link and unlink several accounts in one request (BRD AA002).
 * GET /organizations/{id}/accounts + /eligible-accounts; submit as ACCOUNT_LINK / ACCOUNT_UNLINK.
 */
export function AccountsTab({ org, raise }: { org: Organization; raise: (c: RaiseRequestConfig) => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  const chosen = org.accounts.filter((a) => selected.includes(a.number));
  const toLink = chosen.filter((a) => !a.linked);
  const toUnlink = chosen.filter((a) => a.linked);
  const toggle = (n: string) => setSelected((s) => (s.includes(n) ? s.filter((x) => x !== n) : [...s, n]));

  const submit = (kind: "Link" | "Unlink") => {
    const list = kind === "Link" ? toLink : toUnlink;
    raise({
      action: `${kind} accounts`,
      target: org.name,
      evidence: ["Customer instruction", "Mandate confirmation"],
      warning: kind === "Unlink" ? "Unlinking removes digital access to these accounts only. The core accounts are not changed." : undefined,
      body: (
        <ul className="rounded-lg border border-line text-[13px]">
          {list.map((a) => (
            <li key={a.number} className="flex justify-between border-b border-line px-3 py-2 last:border-b-0">
              <span className="font-medium tabular">{a.number}</span>
              <span className="text-ink-500">{a.name}</span>
            </li>
          ))}
        </ul>
      ),
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-ink-500">Accounts under CIF {org.cif}. Select accounts, then link or unlink them in one request.</p>
        <div className="flex gap-2">
          <Button variant="secondary" disabled={toUnlink.length === 0} onClick={() => submit("Unlink")}>Unlink selected ({toUnlink.length})</Button>
          <Button disabled={toLink.length === 0} onClick={() => submit("Link")}>Link selected ({toLink.length})</Button>
        </div>
      </div>

      {org.accounts.length === 0 ? (
        <Notice tone="warning">Core banking returned no accounts for this CIF.</Notice>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead>
              <tr className="bg-surface text-ink-700">
                <th scope="col" className="w-10 px-4 py-3"><span className="sr-only">Select</span></th>
                <th scope="col" className="px-4 py-3 font-semibold">Account</th>
                <th scope="col" className="px-4 py-3 font-semibold">Type</th>
                <th scope="col" className="px-4 py-3 font-semibold">Currency</th>
                <th scope="col" className="px-4 py-3 font-semibold">Core status</th>
                <th scope="col" className="px-4 py-3 font-semibold">Digital link</th>
              </tr>
            </thead>
            <tbody>
              {org.accounts.map((a) => {
                const blocked = !a.linked && a.status !== "Active";
                return (
                  <tr key={a.number} className="border-t border-line">
                    <td className="px-4 py-3">
                      <input type="checkbox" aria-label={`Select ${a.number}`} className="size-4 accent-accent-500" checked={selected.includes(a.number)} disabled={blocked} onChange={() => toggle(a.number)} />
                    </td>
                    <td className="px-4 py-3"><p className="font-medium tabular">{a.number}</p><p className="text-xs text-ink-500">{a.name}</p></td>
                    <td className="px-4 py-3">{a.type}</td>
                    <td className="px-4 py-3">{a.currency}</td>
                    <td className="px-4 py-3"><Badge tone={a.status === "Active" ? "success" : "warning"}>{a.status}</Badge>{blocked && <p className="mt-1 text-xs text-ink-500">Not eligible to link</p>}</td>
                    <td className="px-4 py-3"><Badge tone={a.linked ? "info" : "neutral"}>{a.linked ? "Linked" : "Not linked"}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
