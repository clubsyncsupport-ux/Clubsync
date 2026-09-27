import { Card, CardContent } from "@/components/ui/card";
import { getTodaysSchedule, currentSlotIndex } from "@/lib/bell-schedule";
import { format } from "date-fns";
import { schoolNow } from "@/lib/school-time";

// Today's bell schedule, styled after the school's own "My School App"
// widget — a plain glance-info card, no reminders/notifications wired to it
// (explicitly not wanted by default; a per-user opt-in would be a separate,
// later addition, not this card's job).
export async function BellScheduleCard({ schoolId }: { schoolId: string }) {
  const now = schoolNow();
  const schedule = await getTodaysSchedule(schoolId, now);

  if (schedule.status === "UNKNOWN") return null;

  if (schedule.status === "NO_SCHOOL") {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Today</p>
          <p className="mt-1 text-sm text-text-primary">{schedule.reason} — no classes today.</p>
        </CardContent>
      </Card>
    );
  }

  const current = currentSlotIndex(schedule.slots, now);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-baseline justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Today&rsquo;s Schedule</p>
          <p className="text-xs text-text-muted">{format(now, "EEEE, MMM d")}</p>
        </div>
        <p className="mt-0.5 text-sm font-medium text-text-primary">{schedule.dayLabel}</p>
        <div className="mt-3 divide-y divide-border">
          {schedule.slots.map((slot, i) => (
            <div key={i} className={`flex items-center justify-between py-1.5 ${i === current ? "text-accent" : "text-text-secondary"}`}>
              <span className="text-sm font-medium">
                {slot.isBlock ? `Block ${slot.letter ?? ""}`.trim() : slot.name}
              </span>
              <span className="text-xs tabular-nums">
                {slot.start === slot.end ? slot.start : `${slot.start} – ${slot.end}`}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
