"use client";

import { useState, useTransition } from "react";
import { approveSupervisorRequestAction, rejectSupervisorRequestAction } from "@/app/actions/supervisor-requests";
import { Button } from "@/components/ui/button";

export function ReviewActions({ clubId, clubName }: { clubId: string; clubName: string }) {
  const [confirmReject, setConfirmReject] = useState(false);
  const [pending, startTransition] = useTransition();

  if (confirmReject) {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <p className="text-sm text-text-secondary">
          Permanently delete &ldquo;{clubName}&rdquo;? This can&rsquo;t be undone.
        </p>
        <div className="flex gap-2">
          <Button variant="danger" disabled={pending} onClick={() => startTransition(() => rejectSupervisorRequestAction(clubId))}>
            Confirm Reject
          </Button>
          <Button variant="secondary" onClick={() => setConfirmReject(false)}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <Button disabled={pending} onClick={() => startTransition(() => approveSupervisorRequestAction(clubId))}>
        Approve — Become Supervisor
      </Button>
      <Button variant="danger" disabled={pending} onClick={() => setConfirmReject(true)}>
        Reject
      </Button>
    </div>
  );
}
