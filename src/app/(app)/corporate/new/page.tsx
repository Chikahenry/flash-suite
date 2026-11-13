"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, CheckCircle2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, ReadOnlyField, Select } from "@/components/ui/form";
import { Card, DefinitionGrid, Notice, PageHeader } from "@/components/ui/layout";
import { listOrganizations } from "@/lib/api";
import { cn } from "@/lib/cn";

const STEPS = ["Find account", "Organisation", "Authority and evidence", "Review"] as const;
const EVIDENCE = ["CONB Form", "Board Resolution", "Director confirmation", "KYC verification"];

// Mock of the core-banking lookup: GET /customers by account number, then GET /organizations?cif=.
const CORE = { name: "Meridian Steel Works Ltd", cif: "R004700215", branch: "Ikeja (SOL 031)", accounts: ["5600470021 · Operations · NGN", "5600470038 · Payroll · NGN", "5600470045 · USD Dom · USD"] };

// Corporate setup flow (BRD 6.3.2): find the account, check for an existing organisation,
// choose accounts, record authority and evidence, then submit for checker approval.
export default function NewOrganizationPage() {
  const [step, setStep] = useState(0);
  const [account, setAccount] = useState("");
  const [found, setFound] = useState<"none" | "new" | "exists">("none");
  const [existingId, setExistingId] = useState("");
  const [segment, setSegment] = useState("Corporate");
  const [accounts, setAccounts] = useState<string[]>([]);
  const [authorisedBy, setAuthorisedBy] = useState("");
  const [channel, setChannel] = useState("Branch visit");
  const [evidence, setEvidence] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const lookup = () => {
    setError(null);
    if (!/^\d{10}$/.test(account)) return setError("Enter a 10-digit account number.");
    const existing = listOrganizations().find((o) => o.accounts.some((a) => a.number === account));
    if (existing) { setExistingId(existing.id); return setFound("exists"); }
    setFound("new");
  };

  const next = () => {
    setError(null);
    if (step === 0 && found !== "new") return setError("Look up an account that has no organisation yet.");
    if (step === 1 && accounts.length === 0) return setError("Select at least one account authorised by the customer.");
    if (step === 2) {
      if (!authorisedBy.trim()) return setError("Enter who authorised the enrolment.");
      const missing = ["CONB Form", "Board Resolution"].filter((e) => !evidence.includes(e));
      if (missing.length) return setError(`Attach the mandatory evidence: ${missing.join(", ")}.`);
    }
    setStep((s) => s + 1);
  };

  const toggle = (list: string[], set: (v: string[]) => void, v: string) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  if (submitted) {
    return (
      <Card className="mx-auto max-w-xl">
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CheckCircle2 size={40} className="text-accent-500" aria-hidden />
          <h1 className="text-xl font-semibold">Request submitted</h1>
          <p className="max-w-sm text-sm text-ink-700">Create organisation for {CORE.name} is waiting for a checker. The organisation is created only after approval and confirmation from the Corporate platform.</p>
          <p className="rounded-lg bg-surface px-3 py-2 text-sm font-semibold tabular">BO-2026-004830</p>
          <div className="mt-2 flex gap-3">
            <Link href="/requests?tab=mine" className="text-sm font-medium text-brand-700 hover:underline">Track request</Link>
            <Link href="/corporate" className="text-sm font-medium text-brand-700 hover:underline">Back to Corporate & SME</Link>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        back={<Link href="/corporate" className="inline-flex items-center gap-1 text-[13px] text-ink-500 hover:text-ink-900"><ArrowLeft size={14} aria-hidden /> Corporate & SME</Link>}
        title="Set up organisation"
        description="Details held in core banking are filled in for you and cannot be edited here."
      />

      <ol className="mb-6 flex flex-wrap gap-2">
        {STEPS.map((s, i) => (
          <li key={s} aria-current={i === step ? "step" : undefined} className={cn("flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px]", i === step ? "border-accent-500 bg-accent-50 font-medium text-accent-700" : i < step ? "border-line bg-white text-ink-900" : "border-line bg-white text-ink-400")}>
            <span className={cn("grid size-5 place-items-center rounded-full text-[11px] font-semibold", i < step ? "bg-accent-500 text-white" : "bg-surface text-ink-700")}>{i < step ? <Check size={12} aria-hidden /> : i + 1}</span>
            {s}
          </li>
        ))}
      </ol>

      <Card>
        <div className="flex flex-col gap-5">
          {error && <Notice tone="danger">{error}</Notice>}

          {step === 0 && (
            <>
              <Field label="Account number" htmlFor="acct" hint="Try 5600470021 for a new customer, or 5600184421 for one that already has an organisation.">
                <div className="flex gap-2">
                  <div className="flex-1"><Input id="acct" inputMode="numeric" maxLength={10} value={account} onChange={(e) => { setAccount(e.target.value.replace(/\D/g, "")); setFound("none"); }} icon={<Search size={16} />} /></div>
                  <Button variant="secondary" onClick={lookup}>Look up</Button>
                </div>
              </Field>
              {found === "exists" && (
                <Notice tone="warning" title="An organisation already exists for this account">
                  Creating a duplicate is not allowed. <Link href={`/corporate/${existingId}`} className="font-medium underline">Open {existingId}</Link> to add users or accounts.
                </Notice>
              )}
              {found === "new" && (
                <>
                  <Notice tone="success">No organisation exists for CIF {CORE.cif}. You can create one.</Notice>
                  <DefinitionGrid>
                    <ReadOnlyField label="Customer name" value={CORE.name} source="Finacle" />
                    <ReadOnlyField label="CIF" value={CORE.cif} source="Finacle" />
                    <ReadOnlyField label="Domicile branch" value={CORE.branch} source="Finacle" />
                  </DefinitionGrid>
                </>
              )}
            </>
          )}

          {step === 1 && (
            <>
              <DefinitionGrid cols={2}>
                <ReadOnlyField label="Organisation name" value={CORE.name} source="Finacle" />
                <Field label="Segment" htmlFor="segment"><Select id="segment" value={segment} onChange={(e) => setSegment(e.target.value)}><option>Corporate</option><option>SME</option></Select></Field>
              </DefinitionGrid>
              <fieldset>
                <legend className="mb-2 text-[13px] font-medium">Accounts to link</legend>
                <p className="mb-3 text-xs text-ink-500">Include only accounts named in the customer&apos;s instruction.</p>
                <div className="flex flex-col gap-2">
                  {CORE.accounts.map((a) => <Checkbox key={a} label={<span className="tabular">{a}</span>} checked={accounts.includes(a)} onChange={() => toggle(accounts, setAccounts, a)} />)}
                </div>
              </fieldset>
            </>
          )}

          {step === 2 && (
            <>
              <Notice tone="info">Directors authorising enrolment are verified as directors. They do not need to be account signatories.</Notice>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Enrolment authorised by" htmlFor="auth" required><Input id="auth" value={authorisedBy} onChange={(e) => setAuthorisedBy(e.target.value)} placeholder="Name and capacity" /></Field>
                <Field label="Submission channel" htmlFor="chan" required>
                  <Select id="chan" value={channel} onChange={(e) => setChannel(e.target.value)}>
                    <option>Branch visit</option><option>Email (indemnity on file)</option><option>Cross-branch</option><option>Third-party submission</option>
                  </Select>
                </Field>
              </div>
              {channel === "Cross-branch" && <Notice tone="warning">Obtain and attach the domicile branch&apos;s confirmation that documentation is complete.</Notice>}
              {channel === "Third-party submission" && <Notice tone="warning">Attach the Account Officer&apos;s confirmation and the Branch Leader&apos;s concurrence.</Notice>}
              <fieldset className="rounded-lg border border-line p-4">
                <legend className="px-1 text-[13px] font-medium">Evidence</legend>
                <div className="flex flex-col gap-2">
                  {EVIDENCE.map((e, i) => <Checkbox key={e} label={<>{e}{i < 2 && <span className="text-red-600"> *</span>} <span className="text-ink-500">attached or linked</span></>} checked={evidence.includes(e)} onChange={() => toggle(evidence, setEvidence, e)} />)}
                </div>
              </fieldset>
            </>
          )}

          {step === 3 && (
            <>
              <DefinitionGrid cols={2}>
                <ReadOnlyField label="Organisation" value={CORE.name} />
                <ReadOnlyField label="CIF" value={CORE.cif} />
                <ReadOnlyField label="Segment" value={segment} />
                <ReadOnlyField label="Authorised by" value={authorisedBy} />
                <ReadOnlyField label="Submission channel" value={channel} />
                <ReadOnlyField label="Evidence" value={evidence.join(", ")} />
              </DefinitionGrid>
              <div>
                <p className="text-xs text-ink-500">Accounts to link ({accounts.length})</p>
                <ul className="mt-1 text-sm tabular">{accounts.map((a) => <li key={a}>{a}</li>)}</ul>
              </div>
              <Notice tone="info">Add users, roles and workflow after the organisation is approved and created.</Notice>
            </>
          )}

          <div className="flex justify-between border-t border-line pt-4">
            <Button variant="secondary" disabled={step === 0} onClick={() => { setError(null); setStep((s) => s - 1); }}>Back</Button>
            {step < 3 ? <Button onClick={next}>Continue</Button> : <Button onClick={() => setSubmitted(true)}>Submit for approval</Button>}
          </div>
        </div>
      </Card>
    </div>
  );
}
