"use client";

import { useActionState, useState } from "react";
import { updateCalendarPrefsAction } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { REMINDER_OFFSETS, parseReminderOffsets } from "@/lib/constants";
import { cn } from "@/lib/cn";

export function CalendarPrefsForm({
  calendarView,
  weekStartsOn,
  timeFormat,
  reminderOffsets,
}: {
  calendarView: string;
  weekStartsOn: string;
  timeFormat: string;
  reminderOffsets: string;
}) {
  const [state, formAction, pending] = useActionState(updateCalendarPrefsAction, { error: null });
  const [selected, setSelected] = useState<Set<number>>(() => new Set(parseReminderOffsets(reminderOffsets)));

  function toggle(minutes: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(minutes)) next.delete(minutes);
      else next.add(minutes);
      return next;
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calendar</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="calendarView">Default view</Label>
              <Select id="calendarView" name="calendarView" defaultValue={calendarView}>
                <option value="month">Month</option>
                <option value="week">Week</option>
                <option value="day">Day</option>
                <option value="agenda">Agenda</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="weekStartsOn">Week starts on</Label>
              <Select id="weekStartsOn" name="weekStartsOn" defaultValue={weekStartsOn}>
                <option value="sunday">Sunday</option>
                <option value="monday">Monday</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="timeFormat">Time format</Label>
              <Select id="timeFormat" name="timeFormat" defaultValue={timeFormat}>
                <option value="12h">12-hour</option>
                <option value="24h">24-hour</option>
              </Select>
            </div>
          </div>

          <div>
            <Label>Event reminders</Label>
            <p className="mb-2 text-xs text-text-muted">Pick as many as you want — this is the default for every event you register for.</p>
            <div className="flex flex-wrap gap-1.5">
              {REMINDER_OFFSETS.map((opt) => {
                const active = selected.has(opt.minutes);
                return (
                  <button
                    key={opt.minutes}
                    type="button"
                    onClick={() => toggle(opt.minutes)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      active ? "border-accent bg-accent-soft text-accent-soft-text" : "border-border text-text-secondary hover:border-border-strong"
                    )}
                  >
                    {active ? "✓ " : ""}
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {Array.from(selected).map((m) => (
              <input key={m} type="hidden" name="reminderOffsets" value={m} />
            ))}
          </div>

          {state.success && <p className="text-sm text-success">Saved.</p>}
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save preferences"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
