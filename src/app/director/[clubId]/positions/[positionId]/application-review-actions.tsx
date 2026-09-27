"use client";

import { useTransition } from "react";
import { reviewApplicationAction } from "@/app/actions/positions";
import { Button } from "@/components/ui/button";

export function ApplicationReviewActions({ applicationId }: { applicationId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex gap-2">
      <Button size="sm" disabled={pending} onClick={() => startTransition(() => reviewApplicationAction(applicationId, "ACCEPTED"))}>
        Accept
      </Button>
      <Button
        size="sm"
        variant="secondary"
        className="text-danger"
        disabled={pending}
        onClick={() => startTransition(() => reviewApplicationAction(applicationId, "REJECTED"))}
      >
        Reject
      </Button>
    </div>
  );
}
