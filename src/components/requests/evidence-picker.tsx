"use client";

import { useRef, useState } from "react";
import { CheckCircle2, FileText, Link2, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";

export interface EvidenceItem {
  type: string;
  name: string;
  source: "Uploaded" | "Linked from repository";
  /** Only for the "Other" document type (BRD 4.1 rule 4). */
  description?: string;
}

const ALLOWED = ["application/pdf", "image/png", "image/jpeg"];
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Evidence for one request (BRD 4.1, NFR008): each mandatory document is uploaded or linked from the
 * approved repository, files are checked for type and size and shown as scanned before they count,
 * and extra "Other" documents need a description and never replace mandatory ones.
 * POST /evidence (upload) and POST /evidence/link.
 */
export function EvidencePicker({ required, value, onChange }: { required: string[]; value: EvidenceItem[]; onChange: (items: EvidenceItem[]) => void }) {
  const [scanning, setScanning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [otherOpen, setOtherOpen] = useState(false);
  const [otherDesc, setOtherDesc] = useState("");
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const get = (type: string) => value.find((v) => v.type === type);
  const put = (item: EvidenceItem) => onChange([...value.filter((v) => v.type !== item.type || item.type === "Other"), item]);
  const remove = (item: EvidenceItem) => onChange(value.filter((v) => v !== item));

  const upload = (type: string, file: File | undefined, description?: string) => {
    if (!file) return;
    if (!ALLOWED.includes(file.type)) return setError(`${file.name} is not a PDF, PNG or JPG.`);
    if (file.size > MAX_BYTES) return setError(`${file.name} is larger than 5 MB.`);
    setError(null);
    setScanning(type);
    // Stand-in for the malware scan that runs before a checker can open the file.
    setTimeout(() => {
      put({ type, name: file.name, source: "Uploaded", description });
      setScanning(null);
    }, 900);
  };

  const link = (type: string) => put({ type, name: `${type.replace(/\s+/g, "-")}-on-file.pdf`, source: "Linked from repository" });

  const others = value.filter((v) => v.type === "Other");

  return (
    <fieldset className="rounded-lg border border-line p-4">
      <legend className="px-1 text-[13px] font-medium text-ink-900">Evidence</legend>
      {error && <p role="alert" className="mb-3 text-xs text-red-600">{error}</p>}

      {required.length === 0 && others.length === 0 && <p className="mb-3 text-[13px] text-ink-500">No mandatory evidence is configured for this action.</p>}

      <ul className="flex flex-col gap-2.5">
        {required.map((type) => {
          const item = get(type);
          return (
            <li key={type} className="flex flex-wrap items-center gap-2 rounded-lg bg-surface px-3 py-2.5">
              <FileText size={16} aria-hidden className={item ? "text-accent-600" : "text-ink-400"} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-ink-900">{type} <span className="text-red-600">*</span></p>
                {item && <p className="truncate text-xs text-ink-500">{item.name} · {item.source}</p>}
              </div>
              {scanning === type ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-ink-500"><Loader2 size={14} className="animate-spin" aria-hidden /> Scanning…</span>
              ) : item ? (
                <>
                  <Badge tone="success" dot={false}><CheckCircle2 size={12} aria-hidden /> {item.source === "Uploaded" ? "Scanned" : "Linked"}</Badge>
                  <button type="button" aria-label={`Remove ${type}`} onClick={() => remove(item)} className="rounded p-1 text-ink-500 hover:text-red-600"><Trash2 size={14} /></button>
                </>
              ) : (
                <>
                  <input ref={(el) => { inputs.current[type] = el; }} type="file" accept=".pdf,.png,.jpg,.jpeg" className="sr-only" aria-label={`Upload ${type}`} onChange={(e) => { upload(type, e.target.files?.[0]); e.target.value = ""; }} />
                  <Button variant="secondary" size="sm" onClick={() => inputs.current[type]?.click()}><Upload size={13} aria-hidden /> Upload</Button>
                  <Button variant="secondary" size="sm" onClick={() => link(type)}><Link2 size={13} aria-hidden /> Link</Button>
                </>
              )}
            </li>
          );
        })}

        {others.map((item, i) => (
          <li key={`other-${i}`} className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2.5">
            <FileText size={16} aria-hidden className="text-accent-600" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-ink-900">Other: {item.description}</p>
              <p className="truncate text-xs text-ink-500">{item.name} · {item.source}</p>
            </div>
            <button type="button" aria-label="Remove document" onClick={() => remove(item)} className="rounded p-1 text-ink-500 hover:text-red-600"><Trash2 size={14} /></button>
          </li>
        ))}
      </ul>

      {otherOpen ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="min-w-[180px] flex-1"><Input aria-label="Describe the other document" placeholder="Describe the document" value={otherDesc} onChange={(e) => setOtherDesc(e.target.value)} /></div>
          <input ref={(el) => { inputs.current.__other = el; }} type="file" accept=".pdf,.png,.jpg,.jpeg" className="sr-only" aria-label="Upload other document" onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            if (!ALLOWED.includes(file.type)) return setError(`${file.name} is not a PDF, PNG or JPG.`);
            if (file.size > MAX_BYTES) return setError(`${file.name} is larger than 5 MB.`);
            setError(null);
            onChange([...value, { type: "Other", name: file.name, source: "Uploaded", description: otherDesc.trim() }]);
            setOtherDesc("");
            setOtherOpen(false);
          }} />
          <Button variant="secondary" size="sm" disabled={!otherDesc.trim()} onClick={() => inputs.current.__other?.click()}><Upload size={13} aria-hidden /> Upload</Button>
          <Button variant="ghost" size="sm" onClick={() => { setOtherOpen(false); setOtherDesc(""); }}>Cancel</Button>
        </div>
      ) : (
        <button type="button" onClick={() => setOtherOpen(true)} className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-brand-700 hover:underline"><Plus size={14} aria-hidden /> Add another document</button>
      )}
      <p className="mt-3 text-xs text-ink-500">PDF, PNG or JPG, up to 5 MB each. An &ldquo;Other&rdquo; document never replaces a mandatory one.</p>
    </fieldset>
  );
}
