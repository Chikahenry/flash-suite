"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, ReadOnlyField, Select } from "@/components/ui/form";
import { Notice } from "@/components/ui/layout";
import { documentTypes, type EvidenceChecklist, type NotificationRule } from "@/lib/api";

// Forms for configuration changes. Every one is submitted through the request engine as a
// configuration request, so a different checker approves it and the previous values stay in history
// (BRD NFR026, 14.10 rule 2).

export function BusinessHoursForm() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Working days" htmlFor="bh-days"><Select id="bh-days" defaultValue="Monday to Friday"><option>Monday to Friday</option><option>Monday to Saturday</option></Select></Field>
      <Field label="Cut-off time" htmlFor="bh-cut" hint="Requests submitted after this count from the next business day."><Input id="bh-cut" type="time" defaultValue="16:00" /></Field>
      <Field label="Opens (WAT)" htmlFor="bh-open"><Input id="bh-open" type="time" defaultValue="08:00" /></Field>
      <Field label="Closes (WAT)" htmlFor="bh-close"><Input id="bh-close" type="time" defaultValue="17:00" /></Field>
    </div>
  );
}

export function SessionSettingsForm() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Inactivity limit (minutes)" htmlFor="ss-idle"><Input id="ss-idle" inputMode="numeric" defaultValue="15" /></Field>
        <Field label="Maximum session (hours)" htmlFor="ss-max"><Input id="ss-max" inputMode="numeric" defaultValue="8" /></Field>
        <Field label="Evidence size limit (MB)" htmlFor="ss-size"><Input id="ss-size" inputMode="numeric" defaultValue="5" /></Field>
        <Field label="Step-up check applies to" htmlFor="ss-step"><Select id="ss-step" defaultValue="Approvals and exports"><option>Approvals and exports</option><option>Every request submission as well</option></Select></Field>
      </div>
      <Notice tone="info">The second factor itself, MFA thresholds and token administration are outside this application.</Notice>
    </div>
  );
}

export function EvidenceChecklistForm({ checklist }: { checklist?: EvidenceChecklist }) {
  const [docs, setDocs] = useState<string[]>(checklist?.documents ?? []);
  const toggle = (d: string) => setDocs((x) => (x.includes(d) ? x.filter((y) => y !== d) : [...x, d]));
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Action" htmlFor="ec-action" required><Input id="ec-action" defaultValue={checklist?.action} /></Field>
        <Field label="Customer type" htmlFor="ec-type"><Select id="ec-type" defaultValue={checklist?.customerType ?? "Any"}><option>Any</option><option>Retail</option><option>Corporate</option><option>SME</option></Select></Field>
        <Field label="Submission route" htmlFor="ec-route"><Select id="ec-route" defaultValue={checklist?.route ?? "Any"}><option>Any</option><option>Branch visit</option><option>Email</option><option>Cross-branch</option><option>Third-party submission</option></Select></Field>
      </div>
      <fieldset>
        <legend className="mb-2 text-[13px] font-medium">Mandatory documents <span className="text-red-600">*</span></legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {documentTypes.filter((d) => d !== "Other").map((d) => <Checkbox key={d} label={d} checked={docs.includes(d)} onChange={() => toggle(d)} />)}
        </div>
        <p className="mt-2 text-xs text-ink-500">&ldquo;Other&rdquo; is always available to staff but never counts as mandatory evidence.</p>
      </fieldset>
      {docs.length === 0 && <Notice tone="warning">An action with no mandatory document can be submitted without evidence. Confirm that is intended.</Notice>}
    </div>
  );
}

export function NotificationRuleForm({ rule }: { rule?: NotificationRule }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Service" htmlFor="nr-svc" required><Input id="nr-svc" defaultValue={rule?.service} /></Field>
        <Field label="Event" htmlFor="nr-event" required><Select id="nr-event" defaultValue={rule?.event}>
          {["Submitted for approval", "Approved", "Rejected", "Returned for correction", "Completed", "Processing failed", "User created", "User removed", "Contact changed", "Account linked or unlinked", "Workflow changed", "Profile maintenance", "Credential recovery"].map((e) => <option key={e}>{e}</option>)}
        </Select></Field>
        <Field label="Recipient" htmlFor="nr-rec" required hint="Company representatives and old or new contacts follow the approved matrix and do not apply to every event."><Input id="nr-rec" defaultValue={rule?.recipient} /></Field>
        <Field label="Channel" htmlFor="nr-ch"><Select id="nr-ch" defaultValue={rule?.channel}><option>Email</option><option>SMS</option><option>In-app</option><option>Email and SMS</option></Select></Field>
        <Field label="Timing" htmlFor="nr-time" className="sm:col-span-2"><Select id="nr-time" defaultValue={rule?.timing}><option>Immediately</option><option>On source confirmation</option></Select></Field>
      </div>
      <Notice tone="info">Notifications say whether a request was submitted, approved or completed. Approval is never described as completion, and no message contains credentials.</Notice>
    </div>
  );
}

/** Edit a short list (document types or change reasons). "Other" is fixed. */
export function ListEditor({ title, items }: { title: string; items: string[] }) {
  const [list, setList] = useState(items);
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (v && !list.some((x) => x.toLowerCase() === v.toLowerCase())) setList((l) => [...l.filter((x) => x !== "Other"), v, ...(l.includes("Other") ? ["Other"] : [])]);
    setDraft("");
  };
  return (
    <div className="flex flex-col gap-4">
      <ReadOnlyField label="List" value={title} />
      <ul className="flex flex-wrap gap-1.5">
        {list.map((i) => (
          <li key={i} className="inline-flex items-center gap-1">
            <Badge tone={i === "Other" ? "info" : "neutral"} dot={false}>
              {i}
              {i !== "Other" && <button type="button" aria-label={`Remove ${i}`} onClick={() => setList((l) => l.filter((x) => x !== i))} className="ml-1 text-ink-500 hover:text-red-600"><X size={12} /></button>}
            </Badge>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <div className="flex-1"><Input aria-label="New item" placeholder="Add an item" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} /></div>
        <Button variant="secondary" onClick={add}><Plus size={14} aria-hidden /> Add</Button>
      </div>
    </div>
  );
}
