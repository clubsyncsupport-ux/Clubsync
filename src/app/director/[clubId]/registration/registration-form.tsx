"use client";

import { useActionState } from "react";
import { submitClubRegistrationAction, type ActionState } from "@/app/actions/club-registration";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, FieldError } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

type Prefill = { description: string; meetingSchedule: string; meetingLocation: string; fundraisingGuidelines: string };

export function RegistrationForm({ clubId, prefill }: { clubId: string; prefill?: Prefill }) {
  const boundAction = async (_prev: ActionState, formData: FormData) => submitClubRegistrationAction(clubId, _prev, formData);
  const [state, formAction, pending] = useActionState(boundAction, { error: null });

  return (
    <form action={formAction} className="mt-5">
      <Card>
        <CardContent className="space-y-4 p-5">
          {prefill && <p className="text-xs text-text-muted">Pre-filled from last year&rsquo;s registration — edit anything that&rsquo;s changed.</p>}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={3} defaultValue={prefill?.description} required />
          </div>
          <div>
            <Label htmlFor="meetingSchedule">Meeting schedule</Label>
            <Input id="meetingSchedule" name="meetingSchedule" defaultValue={prefill?.meetingSchedule} placeholder="e.g. Tuesdays 3:30 PM, Room 204" />
          </div>
          <div>
            <Label htmlFor="meetingLocation">Meeting location</Label>
            <Input id="meetingLocation" name="meetingLocation" defaultValue={prefill?.meetingLocation} />
          </div>
          <div>
            <Label htmlFor="fundraisingGuidelines">Fundraising guidelines (optional)</Label>
            <Textarea id="fundraisingGuidelines" name="fundraisingGuidelines" rows={2} defaultValue={prefill?.fundraisingGuidelines} />
          </div>
          <FieldError>{state.error}</FieldError>
          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? "Submitting…" : "Submit for Approval"}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
