"use client";

import { useTransition } from "react";
import { disconnectGoogleCalendarAction } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function GoogleCalendarCard({ connected }: { connected: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Google Calendar</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-text-secondary">
          {connected
            ? "Your personal Google Calendar events show up alongside your club calendar. ClubSync only reads it — nothing is ever added to your Google Calendar."
            : "Connect your Google Calendar to see your personal events alongside your club calendar, all in one place. Read-only — ClubSync never adds anything to your Google Calendar."}
        </p>
        <div className="mt-4">
          {connected ? (
            <Button variant="secondary" disabled={pending} onClick={() => startTransition(() => disconnectGoogleCalendarAction())}>
              Disconnect Google Calendar
            </Button>
          ) : (
            <a
              href="/api/auth/google-calendar"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-[15px] font-medium text-on-accent shadow-sm transition-all hover:bg-accent-hover"
            >
              Connect Google Calendar
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
