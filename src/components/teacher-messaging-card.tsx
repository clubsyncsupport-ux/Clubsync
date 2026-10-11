"use client";

import { useState, useTransition } from "react";
import { setTeacherMessagingAction } from "@/app/actions/school-admin";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/cn";

// The "can teachers message students?" switch. It lives in a school's settings
// (for its own admin) and on the Platform Admin's school page. Flipping it is
// immediate: the next message a teacher tries to send follows the new setting.
export function TeacherMessagingCard({ schoolId, enabled: initial }: { schoolId: string; enabled: boolean }) {
  const [enabled, setEnabled] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function choose(next: boolean) {
    if (next === enabled || pending) return;
    const previous = enabled;
    setEnabled(next);
    setError(null);
    startTransition(async () => {
      const result = await setTeacherMessagingAction(schoolId, next);
      if (result.error) {
        setEnabled(previous);
        setError(result.error);
      }
    });
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div>
          <p className="text-sm font-semibold text-text-primary">Teacher messaging</p>
          <p className="mt-1 text-xs text-text-muted">
            Whether teachers can send messages in student club chats. Turning it off takes effect right away, with nothing to deploy.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-1 rounded-xl border border-border p-1" role="radiogroup" aria-label="Teacher messaging">
          {(
            [
              { value: true, label: "On" },
              { value: false, label: "Off" },
            ] as const
          ).map((option) => (
            <button
              key={option.label}
              type="button"
              role="radio"
              aria-checked={enabled === option.value}
              onClick={() => choose(option.value)}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                enabled === option.value ? "bg-accent text-on-accent" : "text-text-secondary hover:bg-surface-2"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-text-secondary">
          {enabled
            ? "Teachers can chat with their clubs, the same way they do on other school messaging tools."
            : "Teachers can read every club chat but can't send messages or join private conversations. School-wide announcements and club news still work."}
        </p>
        {error && <p className="text-xs text-danger">{error}</p>}
      </CardContent>
    </Card>
  );
}
