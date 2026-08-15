"use client";

import { cn } from "@/lib/cn";
import { CLUB_COLOR_PALETTE } from "@/lib/constants";

export function ClubColorPicker({
  value,
  onChange,
  takenColors = [],
  helperText = "Greyed-out colors are already used by another club at your school.",
}: {
  value: string;
  onChange: (color: string) => void;
  /** Colors other clubs at the same school already use — shown disabled,
   * except the currently-selected one (so editing an existing club doesn't
   * lock out its own color). */
  takenColors?: string[];
  helperText?: string;
}) {
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {CLUB_COLOR_PALETTE.map((c) => {
          const taken = takenColors.includes(c.value) && c.value !== value;
          return (
            <button
              key={c.value}
              type="button"
              title={taken ? `${c.name} — already used by another club` : c.name}
              disabled={taken}
              onClick={() => onChange(c.value)}
              className={cn(
                "relative h-8 w-8 rounded-full ring-offset-2 ring-offset-surface-0 transition-all",
                value === c.value && "ring-2 ring-accent",
                taken && "cursor-not-allowed opacity-25"
              )}
              style={{ backgroundColor: c.value }}
            >
              {taken && <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white">✕</span>}
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-xs text-text-muted">{helperText}</p>
    </div>
  );
}
