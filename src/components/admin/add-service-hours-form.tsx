"use client";

import { useActionState, useState } from "react";
import { adminAddServiceHoursAction, type AddHoursState } from "@/app/actions/admin";
import { Input, Textarea, Label, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const initialState: AddHoursState = { error: null };

export function AddServiceHoursForm({ userId }: { userId: string }) {
  const [formKey, setFormKey] = useState(0);
  const [state, formAction, pending] = useActionState(adminAddServiceHoursAction.bind(null, userId), initialState);
  const [processedState, setProcessedState] = useState(state);

  if (state !== processedState) {
    setProcessedState(state);
    if (state.success) setFormKey((k) => k + 1);
  }

  return (
    <form key={formKey} action={formAction} className="space-y-3">
      <p className="text-sm font-semibold text-text-primary">Add Hours Manually</p>
      <div className="flex gap-3">
        <div className="w-24">
          <Label htmlFor="hours">Hours</Label>
          <Input id="hours" name="hours" type="number" min="0" step="0.5" required />
        </div>
        <div className="flex-1">
          <Label htmlFor="taskDescription">Description (optional)</Label>
          <Input id="taskDescription" name="taskDescription" placeholder="e.g. Beach cleanup makeup hours" />
        </div>
      </div>
      <div>
        <Label htmlFor="reason">Reason</Label>
        <Textarea id="reason" name="reason" rows={2} placeholder="Why these hours are being added manually" required />
      </div>
      <FieldError>{state.error}</FieldError>
      {state.success && <p className="text-sm text-success">Hours added.</p>}
      <Button type="submit" size="sm" disabled={pending}>
        Add Hours
      </Button>
    </form>
  );
}
