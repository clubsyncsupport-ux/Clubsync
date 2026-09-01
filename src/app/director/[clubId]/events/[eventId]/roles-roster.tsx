"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

type RosterPerson = {
  userId: string;
  firstName: string;
  lastName: string;
  grade: string | null;
  status: "REGISTERED" | "WAITLISTED" | "ATTENDED" | "NO_SHOW";
};

type RoleWithRoster = {
  id: string;
  name: string;
  capacity: number;
  waitlistCapacity: number | null;
  people: RosterPerson[];
};

// Click a role to expand the full list of who's actually in it (both
// registered and waitlisted) — previously a director could only see a bare
// "X / Y filled" count with no way to find out who those X people were
// without scrolling the whole event's Registrants list looking for a
// matching role label.
export function RolesRoster({ roles }: { roles: RoleWithRoster[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <Card>
      {roles.map((r, i) => {
        const filled = r.people.filter((p) => p.status === "REGISTERED").length;
        const waitlisted = r.people.filter((p) => p.status === "WAITLISTED").length;
        const roleFull = filled >= r.capacity;
        const expanded = expandedId === r.id;
        return (
          <div key={r.id} className={cn(i > 0 && "border-t border-border")}>
            <button
              type="button"
              onClick={() => setExpandedId(expanded ? null : r.id)}
              className="flex w-full items-center justify-between px-5 py-3 text-left text-sm hover:bg-surface-2"
            >
              <span className="text-text-primary">{r.name}</span>
              <span className="flex items-center gap-2">
                <span className={roleFull ? "font-medium text-success" : "text-text-secondary"}>
                  {filled} / {r.capacity} {roleFull ? "✓ Filled" : "filled"}
                </span>
                {waitlisted > 0 && (
                  <span className="text-xs font-medium text-warning">
                    {waitlisted} waitlisted{r.waitlistCapacity != null ? ` / ${r.waitlistCapacity}` : ""}
                  </span>
                )}
                <span className="text-text-muted">{expanded ? "▲" : "▼"}</span>
              </span>
            </button>
            {expanded && (
              <div className="divide-y divide-border border-t border-border bg-surface-0">
                {r.people.length === 0 ? (
                  <p className="px-5 py-3 text-sm text-text-muted">No one has picked this role yet.</p>
                ) : (
                  r.people.map((p) => (
                    <div key={p.userId} className="flex items-center gap-3 px-5 py-2.5">
                      <Avatar firstName={p.firstName} lastName={p.lastName} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text-primary">
                          {p.firstName} {p.lastName}
                        </p>
                        <p className="text-xs text-text-muted">{p.grade ?? "—"}</p>
                      </div>
                      {p.status === "WAITLISTED" && <Badge tone="warning">Waitlisted</Badge>}
                      {p.status === "ATTENDED" && <Badge tone="success">Attended</Badge>}
                      {p.status === "NO_SHOW" && <Badge tone="neutral">No Show</Badge>}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="overflow-hidden rounded-2xl border border-border">{children}</div>;
}
