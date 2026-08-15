"use client";

import { useEffect, useState, useTransition } from "react";
import { updateThemeAction } from "@/app/actions/settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import type { ThemePref } from "@/lib/constants";

const OPTIONS: { value: ThemePref; label: string; icon: string }[] = [
  { value: "light", label: "Light", icon: "☀️" },
  { value: "dark", label: "Dark", icon: "🌙" },
  { value: "system", label: "System", icon: "⚙️" },
];

function applyTheme(theme: ThemePref) {
  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);
  localStorage.setItem("clubsync-theme", theme);
}

export function ThemeSelector({ initial }: { initial: ThemePref }) {
  const [theme, setTheme] = useState<ThemePref>(initial);
  const [, startTransition] = useTransition();

  useEffect(() => {
    // Deliberately set after mount, not via a lazy useState initializer: the server-rendered
    // initial state comes from the DB and must match the client's first paint to avoid a
    // hydration mismatch. localStorage (the source of truth for the no-flash boot script)
    // is only consulted afterward, to catch drift between the two.
    const stored = localStorage.getItem("clubsync-theme") as ThemePref | null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) setTheme(stored);
  }, []);

  function select(value: ThemePref) {
    setTheme(value);
    applyTheme(value);
    startTransition(() => updateThemeAction(value));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2">
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => select(o.value)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border px-3 py-3 text-sm font-medium transition-colors",
                theme === o.value ? "border-accent bg-accent-soft text-accent-soft-text" : "border-border text-text-secondary hover:border-border-strong"
              )}
            >
              <span className="text-xl">{o.icon}</span>
              {o.label}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
