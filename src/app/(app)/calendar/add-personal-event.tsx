"use client";

import { useActionState, useState } from "react";
import { createPersonalEventAction } from "@/app/actions/personal-events";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, FieldError } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/cn";

type Category = { id: string; name: string; color: string };

export function AddPersonalEvent({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [categoryId, setCategoryId] = useState("");
  const [recurrence, setRecurrence] = useState("NONE");
  const [state, formAction, pending] = useActionState(createPersonalEventAction, { error: null });
  const [processedState, setProcessedState] = useState(state);

  if (state !== processedState) {
    setProcessedState(state);
    if (state.success) {
      setOpen(false);
      setCategoryId("");
      setRecurrence("NONE");
      setFormKey((k) => k + 1);
    }
  }

  if (!open) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        ➕ Add to my calendar
      </Button>
    );
  }

  return (
    <Card className="mt-3 w-full">
      <CardContent className="p-4">
        <form key={formKey} action={formAction} className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-text-primary">Add a personal event</p>
            <button type="button" onClick={() => setOpen(false)} className="text-xs text-text-muted">
              Cancel
            </button>
          </div>
          <div>
            <Label htmlFor="pe-title">Title</Label>
            <Input id="pe-title" name="title" placeholder="e.g. Dentist appointment" required />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label htmlFor="pe-date">Date</Label>
              <Input id="pe-date" name="date" type="date" required />
            </div>
            <div>
              <Label htmlFor="pe-start">Start</Label>
              <Input id="pe-start" name="startTime" type="time" defaultValue="09:00" required />
            </div>
            <div>
              <Label htmlFor="pe-end">End</Label>
              <Input id="pe-end" name="endTime" type="time" defaultValue="10:00" required />
            </div>
          </div>
          <div>
            <Label htmlFor="pe-location">Location (optional)</Label>
            <Input id="pe-location" name="location" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="pe-recurrence">Repeat</Label>
              <Select id="pe-recurrence" name="recurrence" value={recurrence} onChange={(e) => setRecurrence(e.target.value)}>
                <option value="NONE">Doesn&rsquo;t repeat</option>
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
              </Select>
            </div>
            {recurrence !== "NONE" && (
              <div>
                <Label htmlFor="pe-recurrence-until">Until</Label>
                <Input id="pe-recurrence-until" name="recurrenceUntil" type="date" required />
              </div>
            )}
          </div>
          {categories.length > 0 && (
            <div>
              <Label>Color (optional)</Label>
              <input type="hidden" name="categoryId" value={categoryId} />
              <div className="flex flex-wrap gap-1.5">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategoryId((v) => (v === c.id ? "" : c.id))}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                      categoryId === c.id ? "border-accent bg-accent-soft text-accent-soft-text" : "border-border text-text-secondary hover:bg-surface-2"
                    )}
                  >
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <FieldError>{state.error}</FieldError>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Adding…" : "Add Event"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
