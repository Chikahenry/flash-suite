"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Input, Select } from "@/components/ui/form";
import { Notice, PageHeader, SourceStamp } from "@/components/ui/layout";
import { CardList } from "@/components/customers/device-card-lists";
import { useRaise } from "@/components/requests/use-raise";
import { customers } from "@/lib/api";
import { SourceBanner } from "@/components/ui/source-banner";

// Card enquiry and permanent block (BRD 12). GET /customers/{cif}/cards, GET /cards/{cardRef}.
// PINs and security codes are never shown; card numbers are masked.
export default function CardsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [raise, modal] = useRaise();

  const all = customers.flatMap((c) => c.cards.map((k) => ({ ...k, owner: `${c.firstName} ${c.lastName}`, key: `${c.accountNo} ${c.cif}` })));
  const rows = all.filter((k) => `${k.owner} ${k.key} ${k.account} ${k.maskedPan.slice(-4)}`.toLowerCase().includes(q.toLowerCase().trim()) && (!status || k.status === status));

  return (
    <>
      <PageHeader title="Cards" description="Look up a customer's cards and request a permanent block. Temporary blocks, unblocking, PIN and limits are handled in Instant Card." actions={<SourceStamp source="Card-management system" at="2026-11-11T12:20:00" />} />
      <SourceBanner source="Card-management system" affects="Card statuses" />
      <div className="mb-4"><Notice tone="warning">A permanent block cannot be reversed here. The card is blocked only when the card system confirms it, not when the request is approved.</Notice></div>
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="w-full max-w-sm"><Input aria-label="Search cards" placeholder="Customer, account number or last 4 digits" value={q} onChange={(e) => setQ(e.target.value)} icon={<Search size={16} />} /></div>
        <Select aria-label="Card status" value={status} onChange={(e) => setStatus(e.target.value)} className="w-52"><option value="">All statuses</option><option>Active</option><option>Permanently blocked</option><option>Expired</option></Select>
      </div>
      <CardList cards={rows} raise={raise} />
      {modal}
    </>
  );
}
