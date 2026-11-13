"use client";

import { useState } from "react";
import { Field, Input, Select } from "@/components/ui/form";
import { Notice, PageHeader } from "@/components/ui/layout";
import { DateRangeButton, DownloadCsvButton, FiltersButton, SearchField, Toolbar } from "@/components/ui/toolbar";
import { TransactionTable } from "@/components/ops/tables";
import { StepUpModal } from "@/components/requests/step-up-modal";
import { CHANNELS, transactions, type TxnStatus } from "@/lib/api";
import { SourceBanner } from "@/components/ui/source-banner";

const TYPES = ["Transfer", "Airtime", "Data", "Bills", "Collections", "Bulk payment"];
const STATUSES: TxnStatus[] = ["Completed", "Pending", "Failed", "Unknown", "Partially successful"];

// Transaction enquiry (BRD TMM-001..012). Read-only: no retry, no status change, no adjustment.
// GET /transactions with the BRD's search criteria; GET /transactions/export.
export default function TransactionsPage() {
  const [q, setQ] = useState("");
  const [channel, setChannel] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [min, setMin] = useState("");
  const [stepUp, setStepUp] = useState(false);
  const [exported, setExported] = useState(false);

  const rows = transactions.filter((t) => {
    const text = `${t.ref} ${t.account} ${t.cif} ${t.customer} ${t.sessionId}`.toLowerCase();
    const day = t.date.slice(0, 10);
    return (
      text.includes(q.toLowerCase().trim()) &&
      (!channel || t.channel === channel) &&
      (!type || t.type === type) &&
      (!status || t.status === status) &&
      (!from || day >= from) &&
      (!to || day <= to) &&
      (!min || t.amount >= Number(min))
    );
  });

  return (
    <>
      <PageHeader title="Transactions" />
      <SourceBanner source="NIP switch (NIBSS)" affects="Transfer statuses" />

      {exported && <div className="mb-4"><Notice tone="success">Export started with the current filters. Masking and your access rules apply to the file, and the download is recorded in the audit log.</Notice></div>}

      <Toolbar actions={<DownloadCsvButton onClick={() => setStepUp(true)} />}>
        <SearchField value={q} onChange={setQ} placeholder="Search by Account No, Name" />
        <FiltersButton active={[channel, type, status, min].filter(Boolean).length}>
          <Field label="Channel" htmlFor="t-ch"><Select id="t-ch" value={channel} onChange={(e) => setChannel(e.target.value)}><option value="">All channels</option>{CHANNELS.map((c) => <option key={c}>{c}</option>)}</Select></Field>
          <Field label="Type" htmlFor="t-ty"><Select id="t-ty" value={type} onChange={(e) => setType(e.target.value)}><option value="">All types</option>{TYPES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
          <Field label="Status" htmlFor="t-st"><Select id="t-st" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option>{STATUSES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
          <Field label="Minimum amount" htmlFor="t-min"><Input id="t-min" inputMode="decimal" value={min} onChange={(e) => setMin(e.target.value.replace(/[^d.]/g, ""))} /></Field>
        </FiltersButton>
        <DateRangeButton from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
      </Toolbar>

      <TransactionTable rows={rows} />
      <StepUpModal open={stepUp} onClose={() => setStepUp(false)} onVerified={() => { setStepUp(false); setExported(true); }} actionLabel="export these transactions" />
    </>
  );
}
