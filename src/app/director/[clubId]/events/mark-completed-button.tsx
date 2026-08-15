"use client";

import { useTransition } from "react";
import { markEventCompletedAction } from "@/app/actions/director-events";
import { Button } from "@/components/ui/button";

export function MarkCompletedButton({ eventId }: { eventId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button variant="secondary" size="sm" disabled={pending} onClick={() => startTransition(() => markEventCompletedAction(eventId))}>
      {pending ? "…" : "Mark as Completed"}
    </Button>
  );
}
