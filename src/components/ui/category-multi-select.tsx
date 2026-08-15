"use client";

import { CLUB_CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/cn";

/** Multi-select category picker — serializes the selection as a comma-joined
 * hidden input named `name`, matching the CSV-string convention used for
 * other multi-value fields (allowedGrades, gradeLevels) since there's no
 * native array column type on SQLite here. */
export function CategoryMultiSelect({
  name = "category",
  value,
  onChange,
}: {
  name?: string;
  value: string[];
  onChange: (value: string[]) => void;
}) {
  function toggle(c: string) {
    onChange(value.includes(c) ? value.filter((x) => x !== c) : [...value, c]);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <input type="hidden" name={name} value={value.join(",")} />
      {CLUB_CATEGORIES.map((c) => {
        const selected = value.includes(c);
        return (
          <button
            key={c}
            type="button"
            aria-pressed={selected}
            onClick={() => toggle(c)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              selected ? "border-accent bg-accent-soft text-accent-soft-text" : "border-border text-text-secondary hover:border-border-strong"
            )}
          >
            {c}
          </button>
        );
      })}
    </div>
  );
}
