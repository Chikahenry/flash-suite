"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { Notice } from "@/components/ui/layout";
import { Modal } from "@/components/ui/modal";
import { ApiError } from "@/lib/bo/client";
import { useUpdateCustomer } from "@/lib/bo/customers";
import type { CustomerDetail, UpdateCustomerBody } from "@/lib/bo/types";

type Key = "firstName" | "middleName" | "lastName" | "dateOfBirth" | "maritalStatus" | "nationality" | "stateOfOrigin" | "lga";

const MARITAL = ["Single", "Married", "Divorced", "Widowed", "Separated"];

/**
 * Figma "Update Customer Info". Sends only the fields that changed, together with the record's version,
 * so two staff members editing the same customer cannot overwrite each other: the back end refuses a stale version.
 * Mount it only while open, so the form always starts from the customer's current values.
 */
export function UpdateCustomerModal({ customer, onClose, onSaved }: { customer: CustomerDetail; onClose: () => void; onSaved: (message: string) => void }) {
  const update = useUpdateCustomer(customer.customerId);
  const initial: Record<Key, string> = {
    firstName: customer.firstName ?? "",
    middleName: customer.middleName ?? "",
    lastName: customer.lastName ?? "",
    dateOfBirth: customer.dateOfBirth ?? "",
    maritalStatus: customer.maritalStatus ?? "",
    nationality: customer.nationality ?? "",
    stateOfOrigin: customer.stateOfOrigin ?? "",
    lga: customer.lga ?? "",
  };
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const set = (key: Key) => (e: { target: { value: string } }) => setValues((v) => ({ ...v, [key]: e.target.value }));
  const changed = (Object.keys(values) as Key[]).filter((k) => values[k] !== initial[k]);

  // Match the way the back end writes marital status (Single or SINGLE) so the saved value looks the same.
  const shout = !!customer.maritalStatus && customer.maritalStatus === customer.maritalStatus.toUpperCase();
  const options = MARITAL.map((m) => (shout ? m.toUpperCase() : m));
  if (customer.maritalStatus && !options.some((o) => o.toLowerCase() === customer.maritalStatus!.toLowerCase())) options.unshift(customer.maritalStatus);

  const save = async () => {
    setError(null);
    setFieldErrors({});
    if (changed.length === 0) return setError("Change at least one field before saving.");
    if (!values.firstName.trim() || !values.lastName.trim()) return setError("First name and last name cannot be empty.");

    const body: UpdateCustomerBody = { version: customer.version ?? 0 };
    for (const k of changed) body[k] = values[k].trim();
    try {
      await update.mutateAsync(body);
      onSaved("Customer details updated.");
      onClose();
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.status === 409 ? "Someone else changed this customer while you were editing. The latest details have been loaded; check them and save again." : e.message);
        setFieldErrors(Object.fromEntries(e.fieldErrors.map((f) => [f.field, f.message])));
      } else {
        setError("Something went wrong. Try again.");
      }
    }
  };

  const text = (key: Key, label: string) => (
    <Field label={label} htmlFor={`uc-${key}`} error={fieldErrors[key]}>
      <Input id={`uc-${key}`} value={values[key]} onChange={set(key)} aria-invalid={!!fieldErrors[key]} />
    </Field>
  );

  return (
    <Modal open onClose={onClose} title="Update Customer Info" footer={<Button block disabled={update.isPending || changed.length === 0} onClick={() => void save()}>{update.isPending ? "Saving…" : "Update Customer Info"}</Button>}>
      <div className="flex flex-col gap-4 pb-2">
        {error && <Notice tone="danger">{error}</Notice>}
        {text("firstName", "First Name")}
        {text("middleName", "Middle Name")}
        {text("lastName", "Last Name")}
        {text("lga", "LGA")}
        {text("stateOfOrigin", "State of Origin")}
        {text("nationality", "Nationality")}
        <Field label="Marital Status" htmlFor="uc-maritalStatus" error={fieldErrors.maritalStatus}>
          <Select id="uc-maritalStatus" value={values.maritalStatus} onChange={set("maritalStatus")}>
            <option value="">Not set</option>
            {options.map((o) => <option key={o} value={o}>{o}</option>)}
          </Select>
        </Field>
        <Field label="DOB" htmlFor="uc-dateOfBirth" error={fieldErrors.dateOfBirth}>
          <Input id="uc-dateOfBirth" type="date" value={values.dateOfBirth} onChange={set("dateOfBirth")} max="2100-01-01" />
        </Field>
        <p className="text-xs text-ink-500">Phone, email, BVN and NIN are not editable here.</p>
      </div>
    </Modal>
  );
}
