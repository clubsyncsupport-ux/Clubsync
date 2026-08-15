"use client";

import { useState, useTransition } from "react";
import { markAttendanceAction, updateAttendanceHoursAction, updateAttendanceNoteAction } from "@/app/actions/director-events";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

export type AttendanceRegistrant = {
  userId: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  grade: string | null;
  status: string;
  hours: number;
  note: string;
};

export function AttendanceRow({
  eventId,
  registrant,
  awardsServiceHours,
  defaultHours,
}: {
  eventId: string;
  registrant: AttendanceRegistrant;
  awardsServiceHours: boolean;
  defaultHours: number;
}) {
  const [status, setStatus] = useState(registrant.status);
  const [hours, setHours] = useState(String(registrant.hours || defaultHours));
  const [note, setNote] = useState(registrant.note);
  const [pending, startTransition] = useTransition();

  const attended = status === "ATTENDED";
  const notAttended = status === "NO_SHOW";

  function mark(value: boolean) {
    setStatus(value ? "ATTENDED" : "NO_SHOW");
    if (value && awardsServiceHours) setHours(String(defaultHours));
    startTransition(() => markAttendanceAction(eventId, registrant.userId, value));
  }

  return (
    <div className="flex flex-col gap-2 border-b border-border p-4 last:border-0 sm:flex-row sm:items-center sm:gap-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar firstName={registrant.firstName} lastName={registrant.lastName} src={registrant.avatarUrl} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-text-primary">
            {registrant.firstName} {registrant.lastName}
          </p>
          <p className="text-xs text-text-muted">{registrant.grade ?? "—"}</p>
        </div>
      </div>

      <div className="flex shrink-0 gap-1.5">
        <button
          type="button"
          disabled={pending}
          onClick={() => mark(true)}
          className={cn(
            "rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
            attended ? "border-success bg-success-soft text-success" : "border-border text-text-secondary hover:border-border-strong"
          )}
        >
          ✓ Attended
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => mark(false)}
          className={cn(
            "rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
            notAttended ? "border-danger bg-danger-soft text-danger" : "border-border text-text-secondary hover:border-border-strong"
          )}
        >
          ✕ Did Not Attend
        </button>
      </div>

      {awardsServiceHours && attended && (
        <div className="w-20 shrink-0">
          <Input
            type="number"
            min={0}
            step={0.5}
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            onBlur={() => startTransition(() => updateAttendanceHoursAction(eventId, registrant.userId, Math.max(0, Number(hours) || 0)))}
            className="py-1.5 text-sm"
            aria-label="Hours"
          />
        </div>
      )}

      <div className="min-w-0 flex-1 sm:max-w-48">
        <Input
          placeholder="Notes (optional)"
          defaultValue={note}
          onBlur={(e) => {
            setNote(e.target.value);
            startTransition(() => updateAttendanceNoteAction(eventId, registrant.userId, e.target.value));
          }}
          className="py-1.5 text-sm"
        />
      </div>
    </div>
  );
}
