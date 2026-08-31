"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { autoMarkAttendedIfPastAction } from "@/app/actions/director-events";

// Fires once on mount so simply opening a past event's attendance page
// defaults everyone still sitting in "REGISTERED" to Attended — the
// director only has to manually correct the few who didn't actually show
// up, instead of clicking every single name. A harmless no-op if the event
// hasn't happened yet or everyone's already been marked one way or another.
export function AutoMarkAttendedOnView({ eventId }: { eventId: string }) {
  const router = useRouter();

  useEffect(() => {
    autoMarkAttendedIfPastAction(eventId).then((res) => {
      if (res.markedCount > 0) router.refresh();
    });
  }, [eventId, router]);

  return null;
}
