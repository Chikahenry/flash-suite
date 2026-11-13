"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/form";
import { Card, EmptyState, PageHeader } from "@/components/ui/layout";
import { InbPanel } from "@/components/customers/inb-panel";
import { useRaise } from "@/components/requests/use-raise";
import { customers } from "@/lib/api";
import { cn } from "@/lib/cn";
import { maskAccount } from "@/lib/format";

// Instant Banking/USSD administration (BRD 3.5 item 4, UAM-045..047).
// Find the profile by account number or phone, select it, then raise the restriction request.
export default function InstantBankingPage() {
  const [q, setQ] = useState("");
  const [cif, setCif] = useState<string | null>(null);
  const [raise, modal] = useRaise();

  const enrolled = customers.filter((c) => c.inb.enrolled);
  const matches = enrolled.filter((c) => `${c.firstName} ${c.lastName} ${c.accountNo} ${c.inb.phone.replace(/\s/g, "")} ${c.inb.phone}`.toLowerCase().includes(q.toLowerCase().trim()));
  const selected = enrolled.find((c) => c.cif === cif) ?? null;

  return (
    <>
      <PageHeader title="Instant Banking" description="Lock, disable, blacklist or reset the PIN on a USSD profile. Every restriction affects Instant Banking only." />
      <div className="grid gap-6 lg:grid-cols-[minmax(300px,380px)_1fr]">
        <Card padded={false}>
          <div className="border-b border-line p-4">
            <Input aria-label="Search INB profiles" placeholder="Account number, phone or name" value={q} onChange={(e) => setQ(e.target.value)} icon={<Search size={16} />} />
          </div>
          <ul className="max-h-[520px] overflow-y-auto">
            {matches.length === 0 && <li className="px-4 py-8 text-center text-[13px] text-ink-500">No Instant Banking profile matches.</li>}
            {matches.map((c) => (
              <li key={c.cif}>
                <button type="button" onClick={() => setCif(c.cif)} aria-pressed={cif === c.cif} className={cn("flex w-full items-start justify-between gap-3 border-b border-line px-4 py-3 text-left hover:bg-surface", cif === c.cif && "bg-accent-50")}>
                  <span>
                    <span className="block text-sm font-medium">{c.firstName} {c.lastName}</span>
                    <span className="block text-xs tabular text-ink-500">{c.inb.phone} · {maskAccount(c.accountNo)}</span>
                  </span>
                  <span className="flex flex-col items-end gap-1">
                    <Badge tone={c.inb.status === "Active" ? "success" : "danger"}>{c.inb.status}</Badge>
                    {c.inb.blacklisted && <Badge tone="danger">Blacklisted</Badge>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        {selected ? (
          <Card title={`${selected.firstName} ${selected.lastName}`} actions={<Link href={`/customers/${selected.cif}`} className="text-[13px] font-medium text-brand-700 hover:underline">Open customer</Link>}>
            <InbPanel customer={selected} raise={raise} />
          </Card>
        ) : (
          <EmptyState title="Select a profile" body="Search for the customer, then select the profile to see its lock, enabled and blacklist states." />
        )}
      </div>
      {modal}
    </>
  );
}
