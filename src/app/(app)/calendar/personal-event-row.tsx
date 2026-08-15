"use client";

import { useTransition } from "react";
import { deletePersonalEventAction } from "@/app/actions/personal-events";
import { formatEventDate } from "@/lib/format";

export function PersonalEventRow({
  event,
}: {
  event: {
    id: string;
    title: string;
    startAt: Date;
    endAt: Date;
    location: string | null;
    category: { name: string; color: string } | null;
  };
}) {
  const [pending, startTransition] = useTransition();
  const color = event.category?.color ?? "#6b7280";

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border-strong bg-surface-1 p-4">
      <div className="h-11 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
          <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
          <span className="truncate">{event.category?.name ?? "Personal"}</span>
        </div>
        <p className="mt-0.5 truncate font-semibold text-text-primary">{event.title}</p>
        <p className="mt-0.5 text-sm text-text-secondary">
          {formatEventDate(event.startAt)}
          {event.location && ` · ${event.location}`}
        </p>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => deletePersonalEventAction(event.id))}
        className="shrink-0 rounded-lg px-2 py-1 text-sm text-text-muted transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-50"
        title="Delete"
      >
        ✕
      </button>
    </div>
  );
}
