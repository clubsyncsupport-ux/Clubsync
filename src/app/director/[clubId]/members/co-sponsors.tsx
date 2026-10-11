"use client";

import { useState, useTransition } from "react";
import { addCoSponsorAction, removeCoSponsorAction } from "@/app/actions/director-club";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";

type Sponsor = { membershipId: string; name: string; isYou: boolean };
type Candidate = { id: string; name: string };

// Sponsor teachers of this club, and the control to bring in another one. Shown
// to the club's Director only — the people it lists are teachers who can run
// the club exactly as the Director does.
export function CoSponsors({ clubId, sponsors, candidates }: { clubId: string; sponsors: Sponsor[]; candidates: Candidate[] }) {
  const [picked, setPicked] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(task: () => Promise<{ error: string | null }>) {
    setError(null);
    startTransition(async () => {
      const result = await task();
      if (result.error) setError(result.error);
      else setPicked("");
    });
  }

  return (
    <div className="mt-6 space-y-3 rounded-2xl border border-border p-4">
      <div>
        <p className="text-sm font-semibold text-text-primary">Sponsor teachers</p>
        <p className="mt-1 text-xs text-text-muted">
          A club can have more than one sponsor teacher. Co-sponsors can approve events, manage members and post announcements, just like you.
        </p>
      </div>

      <ul className="divide-y divide-border rounded-xl border border-border">
        {sponsors.map((s) => (
          <li key={s.membershipId} className="flex items-center justify-between gap-3 px-3 py-2">
            <span className="min-w-0 truncate text-sm text-text-primary">
              {s.name} {s.isYou && <span className="text-xs text-text-muted">(you)</span>}
            </span>
            {sponsors.length > 1 && (
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => removeCoSponsorAction(clubId, s.membershipId))}
                className="shrink-0 text-xs font-medium text-danger disabled:opacity-50"
              >
                {s.isYou ? "Step down" : "Remove"}
              </button>
            )}
          </li>
        ))}
      </ul>

      {candidates.length > 0 ? (
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <Select value={picked} onChange={(e) => setPicked(e.target.value)} aria-label="Teacher to add as co-sponsor">
              <option value="">Add a co-sponsor…</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <Button size="sm" disabled={!picked || pending} onClick={() => run(() => addCoSponsorAction(clubId, picked))}>
            {pending ? "Adding…" : "Add"}
          </Button>
        </div>
      ) : (
        <p className="text-xs text-text-muted">No other approved teachers at your school to add yet.</p>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
