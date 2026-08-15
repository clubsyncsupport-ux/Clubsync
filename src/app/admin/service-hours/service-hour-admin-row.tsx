"use client";

import { useState, useTransition } from "react";
import {
  adminUpdateServiceHoursAction,
  adminDeleteServiceHoursAction,
  adminVerifyServiceHoursAction,
  adminRejectServiceHoursAction,
} from "@/app/actions/admin";
import { Badge } from "@/components/ui/badge";

type Record = { id: string; hours: number; status: string; selfReported: boolean; studentName: string; clubName: string; eventTitle: string };

export function ServiceHourAdminRow({ record }: { record: Record }) {
  const [editing, setEditing] = useState(false);
  const [hours, setHours] = useState(String(record.hours));
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <tr className="hover:bg-surface-2">
      <td className="px-4 py-2.5 text-text-primary">{record.studentName}</td>
      <td className="px-4 py-2.5 text-text-secondary">
        {record.clubName}
        {record.selfReported && (
          <Badge tone="neutral" className="ml-1.5 py-0 text-[10px]">
            Self-reported
          </Badge>
        )}
      </td>
      <td className="px-4 py-2.5 text-text-secondary">{record.eventTitle}</td>
      <td className="px-4 py-2.5">
        {editing ? (
          <input
            type="number"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            className="w-16 rounded-lg border border-border bg-surface-1 px-2 py-1 text-sm"
          />
        ) : (
          <span className="font-medium text-text-primary">{record.hours}</span>
        )}
      </td>
      <td className="px-4 py-2.5">
        <Badge tone={record.status === "VERIFIED" ? "success" : record.status === "REJECTED" ? "danger" : "warning"}>
          {record.status}
        </Badge>
      </td>
      <td className="px-4 py-2.5">
        {editing ? (
          <div className="flex items-center gap-1.5">
            <input
              placeholder="Reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-24 rounded-lg border border-border bg-surface-1 px-2 py-1 text-xs"
            />
            <button
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await adminUpdateServiceHoursAction(record.id, Math.max(0, Number(hours) || 0), reason);
                  setEditing(false);
                })
              }
              className="text-xs font-medium text-accent"
            >
              Save
            </button>
            <button onClick={() => setEditing(false)} className="text-xs text-text-muted">
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 text-xs">
            {record.status === "PENDING" && (
              <>
                <button
                  disabled={pending}
                  onClick={() => startTransition(() => adminVerifyServiceHoursAction(record.id))}
                  className="font-medium text-success"
                >
                  Verify
                </button>
                <button
                  disabled={pending}
                  onClick={() => startTransition(() => adminRejectServiceHoursAction(record.id, reason || "Could not be verified"))}
                  className="font-medium text-danger"
                >
                  Reject
                </button>
              </>
            )}
            <button onClick={() => setEditing(true)} className="font-medium text-accent">
              Edit
            </button>
            <button
              disabled={pending}
              onClick={() => startTransition(() => adminDeleteServiceHoursAction(record.id, "Removed by admin"))}
              className="font-medium text-danger"
            >
              Remove
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
