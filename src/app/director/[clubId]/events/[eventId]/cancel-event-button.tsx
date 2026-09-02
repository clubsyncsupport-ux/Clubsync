"use client";

import { useEffect, useState, useTransition } from "react";
import { format } from "date-fns";
import { cancelEventAction, cancelRecurringEventsAction } from "@/app/actions/director-events";
import { getRecurringSeriesEventsAction } from "@/app/actions/events";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function CancelEventButton({ eventId, clubId, isRecurring = false }: { eventId: string; clubId: string; isRecurring?: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const [picking, setPicking] = useState(false);
  const [pending, startTransition] = useTransition();

  if (picking) {
    return <RecurringCancelPicker eventId={eventId} clubId={clubId} onClose={() => setPicking(false)} />;
  }

  if (!confirming) {
    return (
      <Button variant="outline" size="sm" className="text-danger" onClick={() => setConfirming(true)}>
        Cancel Event
      </Button>
    );
  }

  return (
    <Card className="border-danger/30 bg-danger-soft">
      <CardContent className="flex flex-wrap items-center gap-3 p-4">
        <p className="flex-1 text-sm text-text-primary">
          {isRecurring ? "This is part of a recurring series. Cancel just this date, or pick specific dates?" : "Cancel this event and notify registrants?"}
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setConfirming(false)} disabled={pending}>
            No
          </Button>
          {isRecurring && (
            <Button variant="secondary" size="sm" disabled={pending} onClick={() => setPicking(true)}>
              Choose dates…
            </Button>
          )}
          <Button variant="danger" size="sm" disabled={pending} onClick={() => startTransition(() => cancelEventAction(eventId))}>
            {pending ? "Cancelling…" : isRecurring ? "Just this one" : "Yes, cancel"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

type Occurrence = { id: string; startAt: Date; cancelled: boolean };

function RecurringCancelPicker({ eventId, clubId, onClose }: { eventId: string; clubId: string; onClose: () => void }) {
  const [occurrences, setOccurrences] = useState<Occurrence[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [done, setDone] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const series = await getRecurringSeriesEventsAction(eventId);
      setOccurrences(series);
    });
  }, [eventId]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (!occurrences) return;
    const cancellable = occurrences.filter((o) => !o.cancelled).map((o) => o.id);
    setSelected((prev) => (cancellable.every((id) => prev.has(id)) ? new Set() : new Set(cancellable)));
  }

  function submit() {
    startTransition(async () => {
      const res = await cancelRecurringEventsAction(clubId, Array.from(selected));
      setDone(res.cancelledCount);
    });
  }

  return (
    <Card className="w-full max-w-md border-danger/30 bg-danger-soft">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-6">
          <p className="text-sm font-semibold text-text-primary">Choose which dates to cancel</p>
          <button type="button" onClick={onClose} className="shrink-0 text-xs text-text-muted hover:text-text-primary">
            Close
          </button>
        </div>

        {done !== null ? (
          <p className="mt-4 text-sm text-success">
            Cancelled {done} event{done === 1 ? "" : "s"}.
          </p>
        ) : occurrences === null ? (
          <p className="mt-4 text-sm text-text-muted">Loading dates…</p>
        ) : (
          <>
            <label className="mt-4 flex items-center gap-2 border-b border-border pb-3 text-sm font-medium text-text-primary">
              <input
                type="checkbox"
                checked={occurrences.filter((o) => !o.cancelled).length > 0 && occurrences.filter((o) => !o.cancelled).every((o) => selected.has(o.id))}
                onChange={toggleAll}
                className="h-4 w-4 accent-danger"
              />
              Select all
            </label>
            <div className="mt-2 max-h-56 space-y-1 overflow-y-auto">
              {occurrences.map((o) => (
                <label key={o.id} className="flex items-center gap-2 rounded-lg px-1.5 py-2 text-sm hover:bg-surface-2">
                  <input
                    type="checkbox"
                    disabled={o.cancelled}
                    checked={selected.has(o.id)}
                    onChange={() => toggle(o.id)}
                    className="h-4 w-4 accent-danger disabled:opacity-40"
                  />
                  <span className={o.cancelled ? "text-text-muted line-through" : "text-text-primary"}>
                    {format(new Date(o.startAt), "EEE, MMM d, h:mm a")}
                    {o.cancelled && " (already cancelled)"}
                  </span>
                </label>
              ))}
            </div>
            <Button variant="danger" size="sm" className="mt-4 w-full" disabled={pending || selected.size === 0} onClick={submit}>
              {pending ? "Cancelling…" : `Cancel ${selected.size || ""} Selected`.trim()}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
