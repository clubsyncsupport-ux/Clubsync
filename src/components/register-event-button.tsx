"use client";

import { useState, useTransition } from "react";
import { registerForEventAction, cancelRegistrationAction, updateRegistrationRemindersAction } from "@/app/actions/events";
import { Button } from "@/components/ui/button";
import { REMINDER_OFFSETS } from "@/lib/constants";
import { cn } from "@/lib/cn";

type EventRoleOption = { id: string; name: string; capacity: number; filledCount: number };

export function RegisterEventButton({
  eventId,
  initialStatus,
  full,
  waitlistEnabled,
  initialReminderOffsets,
  accountDefaultOffsets,
  roles = [],
  initialRoleName,
}: {
  eventId: string;
  initialStatus: "NONE" | "REGISTERED" | "WAITLISTED" | "ATTENDED";
  full: boolean;
  waitlistEnabled: boolean;
  initialReminderOffsets: number[];
  accountDefaultOffsets: number[];
  /** When an event has roles, everyone joining has to pick one instead of a
   * single "Join Event" button — see the event-creation "Roles" section. */
  roles?: EventRoleOption[];
  /** The role this person already picked, if registered/waitlisted. */
  initialRoleName?: string | null;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function join(roleId?: string) {
    setError(null);
    startTransition(async () => {
      const res = await registerForEventAction(eventId, roleId);
      if (res.ok) setStatus(res.status);
      else setError(res.error);
    });
  }

  if (status === "REGISTERED" || status === "ATTENDED") {
    return (
      <div className="space-y-2">
        <Button variant="secondary" size="lg" className="w-full text-success" disabled>
          Registered ✓{initialRoleName ? ` — ${initialRoleName}` : ""}
        </Button>
        {status === "REGISTERED" && (
          <>
            <ReminderChecklist eventId={eventId} initialOffsets={initialReminderOffsets} accountDefault={accountDefaultOffsets} />
            <button
              className="w-full text-center text-sm text-text-muted hover:text-danger"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await cancelRegistrationAction(eventId);
                  setStatus("NONE");
                })
              }
            >
              Cancel registration
            </button>
          </>
        )}
      </div>
    );
  }

  if (status === "WAITLISTED") {
    return (
      <div className="space-y-2">
        <Button variant="secondary" size="lg" className="w-full text-warning" disabled>
          On Waitlist{initialRoleName ? ` — ${initialRoleName}` : ""}
        </Button>
        <ReminderChecklist eventId={eventId} initialOffsets={initialReminderOffsets} accountDefault={accountDefaultOffsets} />
        <button
          className="w-full text-center text-sm text-text-muted hover:text-danger"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await cancelRegistrationAction(eventId);
              setStatus("NONE");
            })
          }
        >
          Leave waitlist
        </button>
      </div>
    );
  }

  if (full && !waitlistEnabled) {
    return (
      <Button size="lg" className="w-full" disabled>
        Event Full
      </Button>
    );
  }

  if (roles.length > 0) {
    return (
      <div>
        <p className="mb-2 text-sm font-medium text-text-primary">Pick a role to join:</p>
        <div className="space-y-2">
          {roles.map((r) => {
            const roleFull = r.filledCount >= r.capacity;
            return (
              <button
                key={r.id}
                type="button"
                disabled={pending || (roleFull && !waitlistEnabled)}
                onClick={() => join(r.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                  roleFull ? "border-border bg-surface-2 text-text-muted" : "border-border-strong text-text-primary hover:border-accent hover:bg-accent-soft"
                )}
              >
                <span>{r.name}</span>
                <span className="text-xs font-normal text-text-muted">
                  {roleFull ? (waitlistEnabled ? "Full — join waitlist" : "Full") : `${r.filledCount} / ${r.capacity} filled`}
                </span>
              </button>
            );
          })}
        </div>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <Button size="lg" className="w-full" disabled={pending} onClick={() => join()}>
        {pending ? "…" : full ? "Join Waitlist" : "Join Event"}
      </Button>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}

function ReminderChecklist({
  eventId,
  initialOffsets,
  accountDefault,
}: {
  eventId: string;
  initialOffsets: number[];
  accountDefault: number[];
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(() => new Set(initialOffsets.length > 0 ? initialOffsets : accountDefault));
  const [pending, startTransition] = useTransition();

  function toggle(minutes: number) {
    const next = new Set(selected);
    if (next.has(minutes)) next.delete(minutes);
    else next.add(minutes);
    setSelected(next);
    startTransition(() => updateRegistrationRemindersAction(eventId, Array.from(next)));
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="w-full text-center text-sm font-medium text-accent">
        🔔 Choose reminder times
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-text-primary">Remind me</p>
        {pending && <span className="text-xs text-text-muted">Saving…</span>}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {REMINDER_OFFSETS.map((opt) => {
          const active = selected.has(opt.minutes);
          return (
            <button
              key={opt.minutes}
              type="button"
              onClick={() => toggle(opt.minutes)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                active ? "border-accent bg-accent-soft text-accent-soft-text" : "border-border text-text-secondary hover:border-border-strong"
              )}
            >
              {active ? "✓ " : ""}
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
