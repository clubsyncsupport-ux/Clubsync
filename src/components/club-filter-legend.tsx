"use client";

import { useEffect, useState } from "react";
import { ColorDot } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

function readHiddenFromStorage(storageKey: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

// Purely a personal display preference — stored in this browser only, never
// touches the server. Hiding a club here never deletes or hides its events
// for anyone else, and can always be turned back on. Shared between the
// director's All Clubs Calendar and the student's own Calendar — each
// passes its own storageKey so hiding a club in one context never affects
// the other.
export function ClubFilterLegend({ clubs, storageKey }: { clubs: { id: string; name: string; color: string }[]; storageKey: string }) {
  const [hidden, setHidden] = useState<Set<string>>(() => readHiddenFromStorage(storageKey));

  // The only job of this effect is to keep the calendar's DOM (an external
  // system relative to this component) in sync with `hidden` — a textbook
  // effect use, not a setState-in-effect.
  useEffect(() => {
    document.querySelectorAll<HTMLElement>("[data-club-id]").forEach((el) => {
      const id = el.dataset.clubId;
      el.style.display = id && hidden.has(id) ? "none" : "";
    });
  }, [hidden]);

  function toggle(id: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(storageKey, JSON.stringify(Array.from(next)));
      } catch {
        // best-effort persistence only
      }
      return next;
    });
  }

  if (clubs.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {clubs.map((c) => {
        const isHidden = hidden.has(c.id);
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => toggle(c.id)}
            aria-pressed={!isHidden}
            title={isHidden ? `Show ${c.name} on this calendar` : `Hide ${c.name} from this calendar`}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
              isHidden ? "border-border text-text-muted opacity-50" : "border-transparent text-text-secondary hover:bg-surface-2"
            )}
          >
            <ColorDot color={c.color} />
            {c.name}
          </button>
        );
      })}
    </div>
  );
}
