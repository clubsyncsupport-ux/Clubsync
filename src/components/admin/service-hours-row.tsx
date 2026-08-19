"use client";

import { useState, useTransition } from "react";
import { adminUpdateServiceHoursAction, adminDeleteServiceHoursAction } from "@/app/actions/admin";
import { Badge } from "@/components/ui/badge";

type Record = { id: string; hours: number; status: string; selfReported: boolean; source: string };

export function ServiceHoursRow({ record }: { record: Record }) {
  const [editing, setEditing] = useState(false);
  const [hours, setHours] = useState(String(record.hours));
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
      <div className="min-w-0 flex-1">
        <p className="truncate text-text-primary">{record.source}</p>
        <div className="mt-0.5 flex items-center gap-1.5">
          <Badge
            tone={record.status === "VERIFIED" ? "success" : record.status === "REJECTED" ? "danger" : "warning"}
            className="py-0 text-[10px]"
          >
            {record.status}
          </Badge>
          {record.selfReported && (
            <Badge tone="neutral" className="py-0 text-[10px]">
              Self-reported
            </Badge>
          )}
        </div>
      </div>

      {editing ? (
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            className="w-16 rounded-lg border border-border bg-surface-1 px-2 py-1 text-sm"
          />
          <input
            placeholder="Reason (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-32 rounded-lg border border-border bg-surface-1 px-2 py-1 text-xs"
          />
          <button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await adminUpdateServiceHoursAction(record.id, Math.max(0, Number(hours) || 0), reason);
                setEditing(false);
              })
            }
            className="text-xs font-medium text-accent disabled:opacity-50"
          >
            Save
          </button>
          <button onClick={() => setEditing(false)} className="text-xs text-text-muted">
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <span className="font-medium text-text-primary">{record.hours}h</span>
          <button onClick={() => setEditing(true)} className="text-xs font-medium text-accent">
            Edit
          </button>
          <button
            disabled={pending}
            onClick={() => startTransition(() => adminDeleteServiceHoursAction(record.id, "Removed by admin"))}
            className="text-xs font-medium text-danger disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}
