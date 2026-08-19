import Link from "next/link";
import { ColorDot, Badge } from "@/components/ui/badge";
import { formatEventDate } from "@/lib/format";

export type EventCardData = {
  id: string;
  title: string;
  category: string;
  startAt: Date;
  building: string | null;
  room: string | null;
  awardsServiceHours: boolean;
  club: { id: string; name: string; color: string; slug: string };
};

// Red is reserved app-wide to mean "full" (never a pickable club/category
// color — see CLUB_COLOR_PALETTE), so a full event's color accents swap to
// it regardless of the club's own color.
export function EventCard({ event, full = false }: { event: EventCardData; full?: boolean }) {
  const location = [event.building, event.room].filter(Boolean).join(" · ");
  const color = full ? "var(--danger)" : event.club.color;
  return (
    <Link
      href={`/events/${event.id}`}
      data-club-id={event.club.id}
      className="flex items-center gap-3 rounded-2xl border border-border bg-surface-1 p-4 transition-all hover:border-border-strong hover:shadow-[var(--shadow-sm)] active:scale-[0.99]"
    >
      <div className="h-11 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
          <ColorDot color={color} />
          <span className="truncate">{event.club.name}</span>
        </div>
        <p className="mt-0.5 truncate font-semibold text-text-primary">{event.title}</p>
        <p className="mt-0.5 text-sm text-text-secondary">
          {formatEventDate(event.startAt)}
          {location && ` · ${location}`}
        </p>
      </div>
      {full && <Badge tone="danger">Full</Badge>}
      {event.awardsServiceHours && <span className="shrink-0 text-lg" title="Awards service hours">⏱</span>}
    </Link>
  );
}
