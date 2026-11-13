"use client";

import { Field, Input, ReadOnlyField, Select } from "@/components/ui/form";
import { Notice } from "@/components/ui/layout";
import type { Organization } from "@/lib/types";

/**
 * Amend a permitted organisation detail without deleting and recreating it (BRD UAM-048, 3.5 item 6).
 * Name, CIF and branch are owned by core banking and shown locked. The organisation's own contact
 * is separate from every user's contact (BRD 16.5 rule 2), so changing it never touches a user.
 */
export function OrgAmendForm({ org }: { org: Organization }) {
  return (
    <div className="flex flex-col gap-4">
      <Notice tone="info">Name, CIF and domicile branch come from core banking and cannot be edited here. Correct them in the source system.</Notice>
      <div className="grid gap-4 sm:grid-cols-2">
        <ReadOnlyField label="Organisation name" value={org.name} source="Finacle" />
        <ReadOnlyField label="CIF" value={org.cif} source="Finacle" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Organisation email" htmlFor="oa-email" hint="Channel-profile contact. Does not change any user."><Input id="oa-email" type="email" placeholder="accounts@company.ng" /></Field>
        <Field label="Organisation phone" htmlFor="oa-phone"><Input id="oa-phone" inputMode="tel" placeholder="0800 000 0000" /></Field>
        <Field label="Segment" htmlFor="oa-seg" hint="SME follows its own approved role and workflow model."><Select id="oa-seg" defaultValue={org.segment}><option>Corporate</option><option>SME</option></Select></Field>
        <Field label="Verification before authorisation" htmlFor="oa-ver" hint="Applies to new workflows."><Select id="oa-ver"><option>Required where a band names a Verifier group</option><option>Not used</option></Select></Field>
      </div>
    </div>
  );
}
