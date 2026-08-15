"use client";

import { useActionState, useState } from "react";
import { reportSelfServiceHoursAction } from "@/app/actions/service-hours";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, FieldError } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export function ReportHoursForm() {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [state, formAction, pending] = useActionState(reportSelfServiceHoursAction, { error: null });
  const [processedState, setProcessedState] = useState(state);

  if (state !== processedState) {
    setProcessedState(state);
    if (state.success) {
      setOpen(false);
      setFormKey((k) => k + 1);
    }
  }

  if (!open) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        ➕ Add hours from outside volunteering
      </Button>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <form key={formKey} action={formAction} className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-text-primary">Report self-volunteered hours</p>
            <button type="button" onClick={() => setOpen(false)} className="text-xs text-text-muted">
              Cancel
            </button>
          </div>
          <div>
            <Label htmlFor="rh-task">What did you do?</Label>
            <Input id="rh-task" name="taskDescription" placeholder="e.g. Sorted donations at the food bank" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="rh-org">Organization</Label>
              <Input id="rh-org" name="organizationName" placeholder="e.g. City Food Bank" required />
            </div>
            <div>
              <Label htmlFor="rh-supervisor">Supervisor (optional)</Label>
              <Input id="rh-supervisor" name="supervisorName" placeholder="Name" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="rh-date">Date</Label>
              <Input id="rh-date" name="performedAt" type="date" required />
            </div>
            <div>
              <Label htmlFor="rh-hours">Hours</Label>
              <Input id="rh-hours" name="hours" type="number" step="0.5" min="0.5" required />
            </div>
          </div>
          <div>
            <Label htmlFor="rh-reflection">Reflection (optional)</Label>
            <Textarea id="rh-reflection" name="reflection" rows={2} placeholder="What did this experience mean to you?" />
          </div>
          <FieldError>{state.error}</FieldError>
          <p className="text-xs text-text-muted">Added to your service hour total right away — be honest, we&rsquo;re trusting you here.</p>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Submitting…" : "Submit"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
