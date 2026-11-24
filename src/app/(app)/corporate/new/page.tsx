"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { Card, Notice, PageHeader } from "@/components/ui/layout";
import { ApiError } from "@/lib/bo/client";
import { useCreateEnrolment, type EnrolmentRole, type EnrolmentUser } from "@/lib/bo/enrolment";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const blank = (role: EnrolmentRole): EnrolmentUser => ({ fullName: "", email: "", phone: "", role });

// Enrol a customer from the back office, together with the people who will use the customer platform:
// at least one user (initiates) and one authorizer (approves). POST /enrolment-requests.
// The Bank emails each person their login details, so every email address is checked here first.
export default function EnrolCustomerPage() {
  const create = useCreateEnrolment();
  const [accountNumber, setAccountNumber] = useState("");
  const [organisationName, setOrganisationName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [authorisedBy, setAuthorisedBy] = useState("");
  const [users, setUsers] = useState<EnrolmentUser[]>([blank("USER"), blank("AUTHORIZER")]);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [done, setDone] = useState<{ reference?: string; status?: string } | null>(null);

  const setUser = (i: number, patch: Partial<EnrolmentUser>) => setUsers((list) => list.map((u, n) => (n === i ? { ...u, ...patch } : u)));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!/^\d{10}$/.test(accountNumber)) e.accountNumber = "Enter the 10-digit account number.";
    if (organisationName.trim().length < 2) e.organisationName = "Enter the organisation name.";
    if (!EMAIL.test(email)) e.email = "Enter a valid email address.";
    if (!/^\+?\d{10,15}$/.test(phone.replace(/\s/g, ""))) e.phone = "Enter a valid phone number.";
    if (authorisedBy.trim().length < 2) e.authorisedBy = "Enter who authorised the enrolment.";
    users.forEach((u, i) => {
      if ((u.fullName ?? "").trim().length < 2) e[`u${i}name`] = "Enter the name.";
      if (!EMAIL.test(u.email ?? "")) e[`u${i}email`] = "Enter a valid email address.";
      if (!/^\+?\d{10,15}$/.test((u.phone ?? "").replace(/\s/g, ""))) e[`u${i}phone`] = "Enter a valid phone number.";
    });
    const addresses = users.map((u) => (u.email ?? "").trim().toLowerCase()).filter(Boolean);
    addresses.forEach((a, i) => { if (addresses.indexOf(a) !== i) e[`u${i}email`] = "This email is used twice. Each person needs their own."; });
    if (!users.some((u) => u.role === "USER")) e.users = "Add at least one user.";
    else if (!users.some((u) => u.role === "AUTHORIZER")) e.users = "Add at least one authorizer.";
    return e;
  };

  const submit = async () => {
    setError(null);
    const e = validate();
    setFields(e);
    if (Object.keys(e).length) return setError("Check the highlighted fields.");
    try {
      const r = await create.mutateAsync({
        accountNumber, organisationName: organisationName.trim(), email: email.trim(), phone: phone.replace(/\s/g, ""), authorisedBy: authorisedBy.trim(),
        users: users.map((u) => ({ ...u, fullName: u.fullName?.trim(), email: u.email?.trim(), phone: u.phone?.replace(/\s/g, "") })),
      });
      setDone({ reference: r.data?.referenceId ?? r.data?.id, status: r.data?.status });
    } catch (err) {
      if (err instanceof ApiError) {
        setFields(Object.fromEntries(err.fieldErrors.map((f) => [f.field, f.message])));
        setError(err.message);
      } else setError("Something went wrong. Try again.");
    }
  };

  const back = <Link href="/enrolments" className="inline-flex items-center gap-1 text-[13px] text-ink-500 hover:text-ink-900"><ArrowLeft size={14} aria-hidden /> Enrolment requests</Link>;

  if (done) {
    return (
      <Card className="mx-auto max-w-xl">
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CheckCircle2 size={40} className="text-accent-500" aria-hidden />
          <h1 className="text-xl font-semibold">Customer enrolled</h1>
          <p className="max-w-sm text-sm text-ink-700">{organisationName} has been submitted. The customer, and each user and authorizer, are emailed how to log in to the customer platform.</p>
          {done.reference && <p className="rounded-lg bg-surface px-3 py-2 text-sm font-semibold tabular">{done.reference}</p>}
          <div className="mt-2 flex gap-3">
            <Link href="/enrolments" className="text-sm font-medium text-brand-700 hover:underline">Enrolment requests</Link>
            <Link href="/corporate" className="text-sm font-medium text-brand-700 hover:underline">Back to Corporate & SME</Link>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader back={back} title="Enrol a customer" description="Register the organisation with its users and authorizers. Each person is emailed their login details." />
      <div className="flex flex-col gap-6">
        {error && <Notice tone="danger">{error}</Notice>}

        <Card title="Organisation">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Account number" htmlFor="en-acct" required error={fields.accountNumber}><Input id="en-acct" inputMode="numeric" maxLength={10} value={accountNumber} onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))} /></Field>
            <Field label="Organisation name" htmlFor="en-name" required error={fields.organisationName}><Input id="en-name" value={organisationName} onChange={(e) => setOrganisationName(e.target.value)} /></Field>
            <Field label="Organisation email" htmlFor="en-email" required error={fields.email}><Input id="en-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
            <Field label="Organisation phone" htmlFor="en-phone" required error={fields.phone}><Input id="en-phone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
            <Field label="Enrolment authorised by" htmlFor="en-auth" required error={fields.authorisedBy} hint="Name and capacity of the person who gave the instruction." className="sm:col-span-2"><Input id="en-auth" value={authorisedBy} onChange={(e) => setAuthorisedBy(e.target.value)} /></Field>
          </div>
        </Card>

        <Card title="Users and authorizers">
          <p className="mb-4 text-[13px] text-ink-700">A user starts transactions. An authorizer approves them. Add at least one of each.</p>
          {fields.users && <div className="mb-4"><Notice tone="danger">{fields.users}</Notice></div>}
          <div className="flex flex-col gap-4">
            {users.map((u, i) => (
              <div key={i} className="rounded-lg border border-line p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Full name" htmlFor={`u${i}n`} required error={fields[`u${i}name`]}><Input id={`u${i}n`} value={u.fullName} onChange={(e) => setUser(i, { fullName: e.target.value })} /></Field>
                  <Field label="Role" htmlFor={`u${i}r`} required><Select id={`u${i}r`} value={u.role} onChange={(e) => setUser(i, { role: e.target.value })}><option value="USER">User</option><option value="AUTHORIZER">Authorizer</option></Select></Field>
                  <Field label="Email" htmlFor={`u${i}e`} required error={fields[`u${i}email`]}><Input id={`u${i}e`} type="email" value={u.email} onChange={(e) => setUser(i, { email: e.target.value })} /></Field>
                  <Field label="Phone" htmlFor={`u${i}p`} required error={fields[`u${i}phone`]}><Input id={`u${i}p`} inputMode="tel" value={u.phone} onChange={(e) => setUser(i, { phone: e.target.value })} /></Field>
                </div>
                {users.length > 2 && <button type="button" onClick={() => setUsers((l) => l.filter((_, n) => n !== i))} className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-red-700 hover:underline"><Trash2 size={14} aria-hidden /> Remove</button>}
              </div>
            ))}
          </div>
          <Button variant="secondary" className="mt-4" onClick={() => setUsers((l) => [...l, blank("USER")])}><Plus size={14} aria-hidden /> Add another person</Button>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href="/enrolments" className="inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium text-ink-700 hover:bg-surface">Cancel</Link>
          <Button onClick={() => void submit()} disabled={create.isPending}>{create.isPending ? "Submitting…" : "Enrol customer"}</Button>
        </div>
      </div>
    </div>
  );
}
