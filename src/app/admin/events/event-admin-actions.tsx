"use client";

import { useTransition } from "react";
import { adminCancelEventAction, adminDeleteEventAction } from "@/app/actions/admin";

export function EventAdminActions({ eventId, status }: { eventId: string; status: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex shrink-0 gap-3 text-xs">
      {status !== "CANCELLED" && (
        <button disabled={pending} onClick={() => startTransition(() => adminCancelEventAction(eventId))} className="font-medium text-warning">
          Cancel
        </button>
      )}
      <button disabled={pending} onClick={() => startTransition(() => adminDeleteEventAction(eventId))} className="font-medium text-danger">
        Delete
      </button>
    </div>
  );
}
