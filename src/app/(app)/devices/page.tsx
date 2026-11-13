"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Input, Select } from "@/components/ui/form";
import { Notice, PageHeader, SourceStamp } from "@/components/ui/layout";
import { DeviceList } from "@/components/customers/device-card-lists";
import { useRaise } from "@/components/requests/use-raise";
import { customers } from "@/lib/api";

// Device enquiry and deregistration across customers (BRD 11.2.1). GET /customers/{cif}/devices.
export default function DevicesPage() {
  const [q, setQ] = useState("");
  const [risk, setRisk] = useState("");
  const [raise, modal] = useRaise();

  const all = customers.flatMap((c) => c.devices.map((d) => ({ ...d, owner: `${c.firstName} ${c.lastName}`, key: `${c.accountNo} ${c.profile.username} ${c.cif}` })));
  const rows = all.filter((d) => `${d.owner} ${d.key} ${d.type}`.toLowerCase().includes(q.toLowerCase().trim()) && (!risk || d.risk === risk));

  return (
    <>
      <PageHeader title="Devices" description="Find a customer's registered devices and request deregistration. Replacement devices are registered by the customer in the channel." actions={<SourceStamp source="Device and session services" at="2026-11-11T12:20:00" />} />
      <div className="mb-4"><Notice tone="info">Deregistration needs customer verification and a checker. Device, session and credential outcomes are reported separately on the request.</Notice></div>
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="w-full max-w-sm"><Input aria-label="Search devices" placeholder="Customer, account number or username" value={q} onChange={(e) => setQ(e.target.value)} icon={<Search size={16} />} /></div>
        <Select aria-label="Risk indicator" value={risk} onChange={(e) => setRisk(e.target.value)} className="w-48"><option value="">All risk indicators</option><option>Normal</option><option>Flagged</option></Select>
      </div>
      <DeviceList devices={rows} raise={raise} />
      {modal}
    </>
  );
}
