"use client";

import { useState, useTransition } from "react";
import { cancelEventAction } from "@/app/actions/director-events";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function CancelEventButton({ eventId }: { eventId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <Button variant="outline" size="sm" className="text-danger" onClick={() => setConfirming(true)}>
        Cancel Event
      </Button>
    );
  }

  return (
    <Card className="border-danger/30 bg-danger-soft">
      <CardContent className="flex flex-wrap items-center gap-3 p-4">
        <p className="flex-1 text-sm text-text-primary">Cancel this event and notify registrants?</p>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setConfirming(false)} disabled={pending}>
            No
          </Button>
          <Button variant="danger" size="sm" disabled={pending} onClick={() => startTransition(() => cancelEventAction(eventId))}>
            {pending ? "Cancelling…" : "Yes, cancel"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
