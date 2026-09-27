"use client";

import { Label } from "@/components/ui/input";

// Reusable grade-restriction chip toggle — the same interaction the event
// creation form already uses, extracted here since club creation/settings
// now need the identical picker in three places.
export function GradeChipPicker({
  gradeLevels,
  selected,
  onToggle,
  label = "Grades allowed to join",
  openHint = "Open to every grade.",
  restrictedHint = "Students outside these grades can still see it, just not join.",
}: {
  gradeLevels: string[];
  selected: string[];
  onToggle: (grade: string) => void;
  label?: string;
  openHint?: string;
  restrictedHint?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {gradeLevels.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => onToggle(g)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${selected.includes(g) ? "border-accent bg-accent-soft text-accent-soft-text" : "border-border text-text-secondary"}`}
          >
            {g.replace("Grade ", "")}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-xs text-text-muted">{selected.length === gradeLevels.length ? openHint : restrictedHint}</p>
    </div>
  );
}
