"use client";

import { useState } from "react";
import Link from "next/link";
import { CircleUserRound, Hash, Layers, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Field, Select } from "@/components/ui/form";
import { Notice, PageHeader } from "@/components/ui/layout";
import { DateRangeButton, DownloadCsvButton, FiltersButton, SearchField, Toolbar } from "@/components/ui/toolbar";
import { StepUpModal } from "@/components/requests/step-up-modal";
import { customers, type RetailCustomer } from "@/lib/api";
import type { Tone } from "@/lib/format";
import { SourceBanner } from "@/components/ui/source-banner";

/** Figma shows one status per customer: Review, Active or Inactive. */
type CustomerStatus = "Review" | "Active" | "Inactive";
const statusOf = (c: RetailCustomer): CustomerStatus => (c.kyc === "Review" ? "Review" : c.profile.status === "Active" ? "Active" : "Inactive");
const tone: Record<CustomerStatus, Tone> = { Review: "warning", Active: "success", Inactive: "danger" };

const columns: Column<RetailCustomer>[] = [
  { key: "name", header: "Name", icon: CircleUserRound, cell: (c) => `${c.firstName} ${c.lastName}` },
  { key: "account", header: "Account No.", icon: Hash, cell: (c) => <span className="tabular">{c.accountNo}</span> },
  { key: "phone", header: "Phone", icon: Phone, cell: (c) => <span className="tabular">{c.phone.replace(/\s/g, "")}</span> },
  { key: "channel", header: "Channel", icon: Layers, cell: (c) => c.channelType },
  { key: "status", header: "Status", cell: (c) => <Badge tone={tone[statusOf(c)]}>{statusOf(c)}</Badge> },
  { key: "action", header: "Action", cell: (c) => <Link href={`/customers/${c.cif}`} className="inline-flex h-8 items-center whitespace-nowrap rounded-lg bg-[#f1f2f5] px-3.5 text-[13px] font-medium text-ink-900 hover:bg-line">View Details</Link> },
];

// Figma "Customers": title, search, Filters, Date Range, Download as CSV, and a selectable table.
// GET /search, GET /customers. Identity and contact values come from CRM and are read-only.
export default function CustomersPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [stepUp, setStepUp] = useState(false);
  const [exported, setExported] = useState(false);

  const rows = customers.filter((c) => {
    const text = `${c.firstName} ${c.lastName} ${c.cif} ${c.profile.username} ${c.accounts.map((a) => a.number).join(" ")}`.toLowerCase();
    const day = c.crmUpdated.slice(0, 10);
    return text.includes(q.toLowerCase().trim()) && (!status || statusOf(c) === status) && (!from || day >= from) && (!to || day <= to);
  });

  return (
    <>
      <PageHeader title="Customers" />
      <SourceBanner source="CRM" affects="Customer details" />
      {exported && <div className="mb-4"><Notice tone="success">Export started for {selected.length || rows.length} customers. Masking and your access rules apply, and the download is recorded in the audit log.</Notice></div>}
      <Toolbar actions={<DownloadCsvButton onClick={() => setStepUp(true)} />}>
        <SearchField value={q} onChange={setQ} placeholder="Search by Account No, Name" />
        <FiltersButton active={status ? 1 : 0}>
          <Field label="Status" htmlFor="f-status">
            <Select id="f-status" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option><option>Review</option><option>Active</option><option>Inactive</option>
            </Select>
          </Field>
        </FiltersButton>
        <DateRangeButton from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
      </Toolbar>
      <DataTable grid columns={columns} rows={rows} rowKey={(c) => c.cif} selectable={{ selected, onChange: setSelected }} empty="No matching customer. Check the account number or name." />
      <StepUpModal open={stepUp} onClose={() => setStepUp(false)} onVerified={() => { setStepUp(false); setExported(true); }} actionLabel="export these customers" />
    </>
  );
}
