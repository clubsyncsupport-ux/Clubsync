"use client";

import { useState, useTransition } from "react";
import { finalizeEventAction } from "@/app/actions/director-events";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label, Textarea, FieldError } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";

type Registrant = { id: string; name: string; grade: string | null; avatarUrl: string | null; hours: number };

export function FinalizeSection({
  eventId,
  defaultHours,
  awardsServiceHours,
  eventImpact,
  alreadyFinalized,
  registrants,
}: {
  eventId: string;
  defaultHours: number;
  awardsServiceHours: boolean;
  eventImpact: string | null;
  alreadyFinalized: boolean;
  registrants: Registrant[];
}) {
  const [useDefault, setUseDefault] = useState(true);
  const [hours, setHours] = useState<Record<string, string>>(Object.fromEntries(registrants.map((r) => [r.id, String(r.hours)])));
  const [impact, setImpact] = useState(eventImpact ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(alreadyFinalized);

  if (!awardsServiceHours) {
    return (
      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-text-muted">Finalize Event</h2>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-text-secondary">This event doesn&rsquo;t award service hours. Registrants have already been marked as attended once finalized.</p>
            {!done && (
              <Button
                className="mt-3"
                size="sm"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await finalizeEventAction(eventId, "", Object.fromEntries(registrants.map((r) => [r.id, 0])));
                    setDone(true);
                  })
                }
              >
                Mark event finalized
              </Button>
            )}
            {done && <p className="mt-2 text-sm text-success">✓ Finalized</p>}
          </CardContent>
        </Card>
      </div>
    );
  }

  function setAllDefault() {
    setHours(Object.fromEntries(registrants.map((r) => [r.id, String(defaultHours)])));
  }

  function submit() {
    setError(null);
    const finalHours = useDefault
      ? Object.fromEntries(registrants.map((r) => [r.id, defaultHours]))
      : Object.fromEntries(registrants.map((r) => [r.id, Math.max(0, Number(hours[r.id]) || 0)]));
    startTransition(async () => {
      const res = await finalizeEventAction(eventId, impact, finalHours);
      if (res?.error) setError(res.error);
      else setDone(true);
    });
  }

  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-text-muted">Finalize & Approve Service Hours</h2>
      <Card>
        <CardContent className="p-4 space-y-4">
          <div>
            <p className="font-semibold text-text-primary">{registrants.length} attendee(s)</p>
            <p className="text-sm text-text-secondary">{defaultHours} default hours</p>
          </div>

          <label className="flex items-center gap-2 text-sm text-text-primary">
            <input
              type="checkbox"
              checked={useDefault}
              onChange={(e) => {
                setUseDefault(e.target.checked);
                if (e.target.checked) setAllDefault();
              }}
              className="h-4 w-4 accent-accent"
            />
            Award default hours to every attendee
          </label>

          {!useDefault && (
            <div className="space-y-2 rounded-xl border border-border p-3">
              {registrants.map((r) => (
                <div key={r.id} className="flex items-center gap-3">
                  <Avatar firstName={r.name.split(" ")[0]} lastName={r.name.split(" ")[1] ?? ""} src={r.avatarUrl} size="sm" />
                  <span className="flex-1 min-w-0 text-sm text-text-primary">
                    {r.name}
                    <span className="ml-1.5 text-xs text-text-muted">{r.grade ?? "—"}</span>
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={hours[r.id] ?? ""}
                    onChange={(e) => setHours((h) => ({ ...h, [r.id]: e.target.value }))}
                    className="w-20 rounded-lg border border-border bg-surface-1 px-2 py-1 text-right text-sm"
                  />
                  <span className="text-xs text-text-muted">✓</span>
                </div>
              ))}
            </div>
          )}

          <div>
            <Label htmlFor="eventImpact">Event impact (optional)</Label>
            <Textarea
              id="eventImpact"
              rows={2}
              value={impact}
              onChange={(e) => setImpact(e.target.value)}
              placeholder="e.g. Raised over $2,000 for charity."
            />
          </div>

          <FieldError>{error}</FieldError>
          {done ? (
            <p className="text-sm text-success">✓ Finalized — hours have been added to student profiles.</p>
          ) : (
            <Button onClick={submit} disabled={pending || registrants.length === 0}>
              {pending ? "Finalizing…" : "Confirm & Finalize"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
