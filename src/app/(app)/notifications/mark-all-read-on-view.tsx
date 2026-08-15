"use client";

import { useEffect } from "react";
import { markAllNotificationsReadAction } from "@/app/actions/notifications";

// Fires once on mount so simply viewing this page clears the bell badge
// everywhere else in the app — no per-item click required. The action is a
// harmless no-op if there's nothing unread, so it's safe to always call.
export function MarkAllReadOnView() {
  useEffect(() => {
    markAllNotificationsReadAction();
  }, []);

  return null;
}
