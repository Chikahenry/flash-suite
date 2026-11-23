"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CaseBody } from "@/components/cases/case-body";
import { PageHeader } from "@/components/ui/layout";
import { RefreshButton } from "@/components/ui/refresh-button";
import { ErrorState, Skeleton } from "@/components/ui/query-state";
import { useCase } from "@/lib/bo/modules";

// One CRM case, read-only. GET /cases/{ticketId}.
export default function CasePage() {
  const { ref } = useParams<{ ref: string }>();
  const q = useCase(decodeURIComponent(ref));
  const back = <Link href="/cases" className="inline-flex items-center gap-1 text-[13px] text-ink-500 hover:text-ink-900"><ArrowLeft size={14} aria-hidden /> Cases</Link>;

  if (q.isLoading) return <div className="flex flex-col gap-3"><Skeleton className="h-8 w-64" /><Skeleton className="h-24" /><Skeleton className="h-40" /></div>;
  if (q.isError || !q.data) return <><div className="mb-4">{back}</div><ErrorState error={q.error} onRetry={() => void q.refetch()} title="This case could not be loaded" /></>;

  const c = q.data;
  return (
    <>
      <PageHeader back={back} title={[c.categoryName, c.subcategoryName].filter(Boolean).join(": ") || "Case"} description={`${c.ticketId} · Tracking no. ${c.complaintTrackingNumber ?? "—"}`} actions={<RefreshButton />} />
      <CaseBody c={c} />
    </>
  );
}
