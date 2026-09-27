"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { approveAsAdminAction, rejectApprovalAction, type ApprovalKind } from "@/app/actions/approvals";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Row = {
  kind: ApprovalKind;
  id: string;
  title: string;
  clubName: string;
  status: "PENDING_SPONSOR" | "PENDING_ADMIN";
  subtitle: string;
  href: string;
};

export function ApprovalRow({ row, canAct }: { row: Row; canAct: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");

  function approve() {
    setError(null);
    startTransition(async () => {
      const res = await approveAsAdminAction(row.kind, row.id);
      if (res.error) setError(res.error);
    });
  }

  function reject() {
    setError(null);
    startTransition(async () => {
      const res = await rejectApprovalAction(row.kind, row.id, reason);
      if (res.error) setError(res.error);
      else setShowReject(false);
    });
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <Link href={row.href} className="truncate text-sm font-medium text-text-primary hover:underline">
            {row.title}
          </Link>
          <p className="text-xs text-text-muted">
            {row.clubName} · {row.subtitle}
          </p>
        </div>
        <Badge tone={row.status === "PENDING_SPONSOR" ? "warning" : "accent"}>
          {row.status === "PENDING_SPONSOR" ? "Awaiting sponsor" : "Awaiting admin"}
        </Badge>
      </div>

      {canAct && row.status === "PENDING_ADMIN" && (
        <div className="mt-3 flex items-center gap-2">
          <Button size="sm" disabled={pending} onClick={approve}>
            Approve
          </Button>
          <Button size="sm" variant="secondary" className="text-danger" disabled={pending} onClick={() => setShowReject((v) => !v)}>
            Reject
          </Button>
        </div>
      )}

      {canAct && showReject && (
        <div className="mt-2 space-y-2">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (shown to the submitter)"
            rows={2}
            className="w-full rounded-xl border border-border bg-surface-1 px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <Button size="sm" variant="secondary" className="text-danger" disabled={pending} onClick={reject}>
            {pending ? "Rejecting…" : "Confirm Reject"}
          </Button>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
