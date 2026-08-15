"use client";

import { useMemo, useRef, useState } from "react";
import { useOnClickOutside } from "@/lib/use-on-click-outside";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

/** Styled search-as-you-type dropdown — replaces native <input list>/<datalist>,
 * which renders as a generic unstyled browser popup that doesn't match the app's theme. */
export function Combobox({
  id,
  value,
  onChange,
  options,
  placeholder,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOnClickOutside(ref, () => setOpen(false));

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [value, options]);

  return (
    <div className="relative" ref={ref}>
      <Input
        id={id}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        autoComplete="off"
        placeholder={placeholder}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-20 mt-1.5 max-h-56 w-full overflow-y-auto rounded-xl border border-border bg-surface-1 p-1.5 shadow-[var(--shadow-lg)]">
          {filtered.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              className={cn(
                "block w-full truncate rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-2",
                opt === value ? "bg-accent-soft text-accent-soft-text font-medium" : "text-text-primary"
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
