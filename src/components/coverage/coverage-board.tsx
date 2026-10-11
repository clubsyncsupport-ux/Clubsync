import Link from "next/link";
import { addDays, endOfDay, format, startOfDay } from "date-fns";
import { db } from "@/lib/db";
import { computeStaffing } from "@/lib/staffing";
import { fromSchoolZone, schoolNow, toSchoolZone } from "@/lib/school-time";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";

const RANGES = [7, 14, 30] as const;

// "Who's still missing?" for the coming days: every upcoming event across the
// given clubs with its roles filled/needed, fully-staffed ones in green and the
// ones that still need people called out — what the athletics Google Form is
// used to check by hand, but live.
export async function CoverageBoard({
  clubIds,
  days,
  showClub,
  eventHref,
  rangeHref,
}: {
  clubIds: string[];
  days: number;
  showClub: boolean;
  eventHref: (e: { id: string; clubId: string }) => string;
  rangeHref: (days: number) => string;
}) {
  const now = schoolNow();
  const from = fromSchoolZone(startOfDay(now));
  const to = fromSchoolZone(endOfDay(addDays(now, days - 1)));

  const events = clubIds.length
    ? await db.event.findMany({
        where: { clubId: { in: clubIds }, status: "SCHEDULED", approvalStatus: "APPROVED", startAt: { gte: from, lte: to } },
        orderBy: { startAt: "asc" },
        include: {
          club: { select: { id: true, name: true, color: true } },
          _count: { select: { registrations: { where: { status: { in: ["REGISTERED", "ATTENDED"] } } } } },
          roles: { orderBy: { order: "asc" }, include: { _count: { select: { registrations: { where: { status: "REGISTERED" } } } } } },
        },
      })
    : [];

  const rows = events.map((e) => ({ event: e, staffing: computeStaffing(e) }));
  const trackable = rows.filter((r) => r.staffing.kind !== "open");
  const fullyCount = trackable.filter((r) => r.staffing.fully).length;
  const openSpots = trackable.reduce((sum, r) => sum + r.staffing.open, 0);

  const byDay = new Map<string, typeof rows>();
  for (const r of rows) {
    const key = format(toSchoolZone(r.event.startAt), "yyyy-MM-dd");
    byDay.set(key, [...(byDay.get(key) ?? []), r]);
  }

  return (
    <div>
      <div data-tour="coverage-range" className="flex w-full gap-1 rounded-xl border border-border p-1">
        {RANGES.map((d) => (
          <Link
            key={d}
            href={rangeHref(d)}
            className={cn(
              "flex-1 whitespace-nowrap rounded-lg px-2 py-1.5 text-center text-sm font-medium transition-colors",
              d === days ? "bg-accent text-on-accent" : "text-text-secondary hover:bg-surface-2"
            )}
          >
            {d} days
          </Link>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <SummaryTile value={rows.length} label="Events" />
        <SummaryTile value={fullyCount} label="Fully staffed" tone="success" />
        <SummaryTile value={openSpots} label="Spots open" tone={openSpots > 0 ? "warning" : undefined} />
      </div>

      {rows.length === 0 ? (
        <Card className="mt-5">
          <EmptyState icon="📅" title="No events in this window" description={`Nothing is scheduled in the next ${days} days.`} />
        </Card>
      ) : (
        <div className="mt-5 space-y-5">
          {Array.from(byDay.entries()).map(([key, dayRows]) => (
            <div key={key}>
              <p className="mb-2 text-sm font-semibold text-text-secondary">{format(new Date(`${key}T12:00:00`), "EEEE, MMMM d")}</p>
              <div className="space-y-2">
                {dayRows.map(({ event: e, staffing }) => {
                  const needs = staffing.kind !== "open" && !staffing.fully;
                  const location = [e.building, e.room].filter(Boolean).join(" · ");
                  return (
                    <Link
                      key={e.id}
                      href={eventHref({ id: e.id, clubId: e.clubId })}
                      className={cn(
                        "block rounded-2xl border p-4 transition-colors hover:border-border-strong",
                        staffing.fully ? "border-success/60 bg-success/10" : needs ? "border-warning/50 bg-warning/5" : "border-border bg-surface-1"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-text-primary">{e.title}</p>
                          <p className="text-sm text-text-secondary">
                            {format(toSchoolZone(e.startAt), "h:mm a")}
                            {location ? ` · ${location}` : ""}
                            {showClub ? ` · ${e.club.name}` : ""}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
                            staffing.fully ? "bg-success/20 text-success" : needs ? "bg-warning/20 text-warning" : "bg-surface-2 text-text-muted"
                          )}
                        >
                          {staffing.fully ? "Fully staffed" : needs ? `Needs ${staffing.open} more` : "No headcount set"}
                        </span>
                      </div>

                      {staffing.kind === "roles" && (
                        <div className="mt-3 space-y-1.5">
                          {staffing.roles.map((r) => (
                            <div key={r.id} className="flex items-center gap-2 text-sm">
                              <span className={cn("min-w-0 flex-1 truncate", r.open === 0 ? "text-text-secondary" : "font-medium text-text-primary")}>
                                {r.name}
                                {r.pay && <span className="ml-2 rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">{r.pay}</span>}
                              </span>
                              <span className={cn("shrink-0 tabular-nums", r.open === 0 ? "text-success" : "text-warning")}>
                                {r.filled}/{r.capacity}
                                {r.open > 0 ? ` · need ${r.open}` : " ✓"}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      {staffing.kind === "capacity" && (
                        <p className="mt-2 text-sm text-text-secondary">
                          {staffing.filled}/{staffing.target} signed up
                        </p>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryTile({ value, label, tone }: { value: number; label: string; tone?: "success" | "warning" }) {
  return (
    <div className={cn("min-w-0 rounded-2xl border p-3", tone === "success" ? "border-success/40 bg-success/10" : tone === "warning" ? "border-warning/40 bg-warning/10" : "border-border bg-surface-1")}>
      <p className={cn("text-2xl font-bold tabular-nums", tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-text-primary")}>{value}</p>
      <p className="text-xs text-text-secondary">{label}</p>
    </div>
  );
}
