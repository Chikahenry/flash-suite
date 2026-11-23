"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ApprovalPanel } from "@/components/approvals/approval-panel";
import { Card, EmptyState, Notice, PageHeader } from "@/components/ui/layout";

// One approval request: GET /approval-requests/{id}, with its history and the decisions available.
export default function RequestDetailPage() {
  const { ref } = useParams<{ ref: string }>();
  const id = Number(ref);
  const [done, setDone] = useState<string | null>(null);
  const back = <Link href="/requests" className="inline-flex items-center gap-1 text-[13px] text-ink-500 hover:text-ink-900"><ArrowLeft size={14} aria-hidden /> Approval queue</Link>;

  if (!Number.isInteger(id)) return <EmptyState title="Request not found" body="Check the reference and try again." action={<Link href="/requests" className="text-sm font-medium text-brand-700">Back to the queue</Link>} />;

  return (
    <>
      <PageHeader back={back} title="Request details" />
      {done && <div className="mb-4"><Notice tone="success">{done}</Notice></div>}
      <Card><ApprovalPanel id={id} onChanged={setDone} /></Card>
    </>
  );
}
