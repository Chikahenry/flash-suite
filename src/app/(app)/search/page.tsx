"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, EmptyState, PageHeader } from "@/components/ui/layout";
import { customers, listOrganizations, listRequests } from "@/lib/api";
import { accessStatusTone, maskAccount, orgStatusTone } from "@/lib/format";

// Common search entry point (BRD UAM-013, CM-001/002): one search across Retail customers,
// organisations, corporate users and requests. Results say which type each record is. GET /search.
export default function SearchPage() {
  const q = (useSearchParams().get("q") ?? "").trim().toLowerCase();
  const has = (...parts: string[]) => parts.join(" ").toLowerCase().includes(q);
  const digits = q.replace(/\s/g, "");

  const retail = q ? customers.filter((c) => has(c.firstName, c.lastName, c.cif, c.profile.username) || c.accounts.some((a) => a.number.includes(digits))) : [];
  const orgs = q ? listOrganizations().filter((o) => has(o.name, o.cif, o.id) || o.accounts.some((a) => a.number.includes(digits))) : [];
  const users = q ? listOrganizations().flatMap((o) => o.users.filter((u) => has(u.username, u.firstName, u.lastName, u.email)).map((u) => ({ u, o }))) : [];
  const reqs = q ? listRequests().filter((r) => has(r.ref, r.target, r.action)) : [];
  const total = retail.length + orgs.length + users.length + reqs.length;

  const row = "flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3 last:border-b-0 hover:bg-surface/60";

  return (
    <>
      <PageHeader title="Search results" description={q ? `${total} result${total === 1 ? "" : "s"} for "${q}"` : "Enter an account number, username, name, CIF or request reference in the search box above."} />
      {q && total === 0 && <EmptyState title="No matching record" body="Check the account number or username and search again. Nothing was created or selected." />}
      <div className="flex flex-col gap-6">
        {retail.length > 0 && (
          <Card title={`Retail customers (${retail.length})`} padded={false}>
            {retail.map((c) => (
              <Link key={c.cif} href={`/customers/${c.cif}`} className={row}>
                <span><span className="font-medium text-brand-700">{c.firstName} {c.lastName}</span> <span className="text-xs tabular text-ink-500">· CIF {c.cif} · {maskAccount(c.accountNo)}</span></span>
                <span className="flex gap-2"><Badge tone="neutral" dot={false}>Retail</Badge>{c.profile.status === "Not enrolled" ? <Badge tone="neutral">Not enrolled</Badge> : <Badge tone={accessStatusTone[c.profile.status]}>{c.profile.status}</Badge>}</span>
              </Link>
            ))}
          </Card>
        )}
        {orgs.length > 0 && (
          <Card title={`Organisations (${orgs.length})`} padded={false}>
            {orgs.map((o) => (
              <Link key={o.id} href={`/corporate/${o.id}`} className={row}>
                <span><span className="font-medium text-brand-700">{o.name}</span> <span className="text-xs tabular text-ink-500">· {o.id} · CIF {o.cif}</span></span>
                <span className="flex gap-2"><Badge tone="info" dot={false}>{o.segment}</Badge><Badge tone={orgStatusTone[o.status]}>{o.status}</Badge></span>
              </Link>
            ))}
          </Card>
        )}
        {users.length > 0 && (
          <Card title={`Corporate and SME users (${users.length})`} padded={false}>
            {users.map(({ u, o }) => (
              <Link key={u.id} href={`/corporate/${o.id}`} className={row}>
                <span><span className="font-medium text-brand-700">{u.firstName} {u.lastName}</span> <span className="text-xs text-ink-500">· {u.username} · {o.name} · {u.roles.join(", ")}</span></span>
                <Badge tone={accessStatusTone[u.status]}>{u.status}</Badge>
              </Link>
            ))}
          </Card>
        )}
        {reqs.length > 0 && (
          <Card title={`Requests (${reqs.length})`} padded={false}>
            {reqs.map((r) => (
              <Link key={r.ref} href={`/requests/${r.ref}`} className={row}>
                <span><span className="font-medium tabular text-brand-700">{r.ref}</span> <span className="text-xs text-ink-500">· {r.action} · {r.target}</span></span>
              </Link>
            ))}
          </Card>
        )}
      </div>
    </>
  );
}
