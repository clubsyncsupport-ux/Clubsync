"use client";

import { useActionState } from "react";
import { createAnnouncementAction, type ActionState } from "@/app/actions/director-club";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, FieldError } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export function AnnouncementForm({ clubId }: { clubId: string }) {
  const boundAction = async (_prev: ActionState, formData: FormData) => createAnnouncementAction(clubId, formData);
  const [state, formAction, pending] = useActionState(boundAction, { error: null });

  return (
    <Card>
      <CardContent className="p-5">
        <form action={formAction} className="space-y-3" key={state.success ? "sent" : "form"}>
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" placeholder="e.g. Meeting Cancelled" required />
          </div>
          <div>
            <Label htmlFor="body">Message</Label>
            <Textarea id="body" name="body" rows={3} required />
          </div>
          <FieldError>{state.error}</FieldError>
          {state.success && <p className="text-sm text-success">Sent to all members.</p>}
          <Button type="submit" disabled={pending}>
            {pending ? "Posting…" : "Post Announcement"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
