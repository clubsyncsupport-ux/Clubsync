"use client";

import { useTransition } from "react";
import { joinClubAction, leaveClubAction } from "@/app/actions/clubs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function JoinClubButton({
  clubId,
  status,
  size = "md",
  className,
}: {
  clubId: string;
  status: "NONE" | "ACTIVE" | "PENDING";
  size?: "sm" | "md";
  className?: string;
}) {
  const [pending, startTransition] = useTransition();

  if (status === "ACTIVE") {
    return (
      <Button
        variant="secondary"
        size={size}
        className={cn("text-success", className)}
        disabled={pending}
        onClick={() => startTransition(() => leaveClubAction(clubId))}
      >
        {pending ? "…" : "Joined ✓"}
      </Button>
    );
  }

  if (status === "PENDING") {
    return (
      <Button variant="secondary" size={size} className={className} disabled>
        Pending approval
      </Button>
    );
  }

  return (
    <Button size={size} className={className} disabled={pending} onClick={() => startTransition(() => joinClubAction(clubId))}>
      {pending ? "Joining…" : "Join Club"}
    </Button>
  );
}
