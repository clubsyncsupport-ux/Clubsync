"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { getRecurringSeriesEventsAction, registerForRecurringSeriesAction, type BulkRegisterResult } from "@/app/actions/events";
import { Button } from "@/components/ui/button";

type Occurrence = { id: string; startAt: Date; cancelled: boolean };

export function RecurringSeriesJoin({ eventId, roleNames = [] }: { eventId: string; roleNames?: string[] }) {
  const [open, setOpen] = useState(false);
  const [occurrences, setOccurrences] = useState<Occurrence[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [role, setRole] = useState<string | undefined>(roleNames[0]);
  const [results, setResults] = useState<BulkRegisterResult[] | null>(null);
  const [pending, startTransition] = useTransition();

  function openPicker() {
    setOpen(true);
    setResults(null);
    startTransition(async () => {
      const series = await getRecurringSeriesEventsAction(eventId);
      setOccurrences(series);
    });
  }

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
    const joinable = occurrences.filter((o) => !o.cancelled).map((o) => o.id);
    setSelected((prev) => (joinable.every((id) => prev.has(id)) ? new Set() : new Set(joinable)));
  }

  function submit() {
    startTransition(async () => {
      const res = await registerForRecurringSeriesAction(Array.from(selected), role);
      setResults(res);
      setSelected(new Set());
    });
  }

  if (!open) {
    return (
      <button type="button" onClick={openPicker} className="mt-2 w-full text-center text-sm font-medium text-accent hover:underline">
        This event repeats — choose which dates to join →
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-border p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-text-primary">Choose which dates to join</p>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-text-muted hover:text-text-primary">
          Close
        </button>
      </div>

      {roleNames.length > 0 && (
        <div className="mt-2">
          <label className="mb-1 block text-xs font-medium text-text-secondary">Role for every date you pick</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface-1 px-2 py-1.5 text-sm"
          >
            {roleNames.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      )}

      {occurrences === null ? (
        <p className="mt-3 text-sm text-text-muted">Loading dates…</p>
      ) : (
        <>
          <label className="mt-3 flex items-center gap-2 border-b border-border pb-2 text-sm font-medium text-text-primary">
            <input
              type="checkbox"
              checked={occurrences.filter((o) => !o.cancelled).length > 0 && occurrences.filter((o) => !o.cancelled).every((o) => selected.has(o.id))}
              onChange={toggleAll}
              className="h-4 w-4 accent-accent"
            />
            Select all
          </label>
          <div className="mt-1 max-h-56 space-y-0.5 overflow-y-auto">
            {occurrences.map((o) => {
              const result = results?.find((r) => r.eventId === o.id);
              return (
                <label key={o.id} className="flex items-center justify-between gap-2 rounded-lg px-1 py-1.5 text-sm hover:bg-surface-2">
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      disabled={o.cancelled}
                      checked={selected.has(o.id)}
                      onChange={() => toggle(o.id)}
                      className="h-4 w-4 accent-accent disabled:opacity-40"
                    />
                    <span className={o.cancelled ? "text-text-muted line-through" : "text-text-primary"}>
                      {format(new Date(o.startAt), "EEE, MMM d, h:mm a")}
                    </span>
                  </span>
                  {result && (
                    <span className={result.ok ? "text-xs font-medium text-success" : "text-xs font-medium text-danger"}>
                      {result.ok ? (result.status === "REGISTERED" ? "Joined ✓" : "Waitlisted") : result.error}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
          <Button className="mt-3 w-full" size="sm" disabled={pending || selected.size === 0} onClick={submit}>
            {pending ? "Joining…" : `Join ${selected.size || ""} Selected`.trim()}
          </Button>
        </>
      )}
    </div>
  );
}
