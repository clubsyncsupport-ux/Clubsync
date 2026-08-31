"use client";

import { useState, useTransition } from "react";
import { archiveOwnClubAction, restoreOwnClubAction, deleteOwnClubAction } from "@/app/actions/director-club";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function DangerZone({ clubId, clubName, isArchived }: { clubId: string; clubName: string; isArchived: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmName, setConfirmName] = useState("");

  return (
    <Card className="mt-6 border-danger/30">
      <CardContent className="space-y-4 p-5">
        <p className="text-sm font-semibold text-danger">Danger Zone</p>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
          <div>
            <p className="text-sm font-medium text-text-primary">{isArchived ? "Restore this club" : "Archive this club"}</p>
            <p className="text-xs text-text-muted">
              {isArchived
                ? "Makes the club visible and active again — nothing was lost while archived."
                : "Hides the club from Discover and prevents new activity. Nothing is deleted, and you can restore it anytime."}
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = isArchived ? await restoreOwnClubAction(clubId) : await archiveOwnClubAction(clubId);
                if (res.error) setError(res.error);
              })
            }
          >
            {isArchived ? "Restore" : "Archive"}
          </Button>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="rounded-xl border border-danger/30 bg-danger-soft p-3">
          <p className="text-sm font-medium text-danger">Delete this club permanently</p>
          <p className="mt-1 text-xs text-text-secondary">
            This deletes the club and everything in it — every member, event, announcement, and every logged service hour tied
            to it — for everyone, with no way to undo it. If you just want to pause the club, use Archive instead.
          </p>
          {!deleting ? (
            <Button variant="danger" size="sm" className="mt-3" onClick={() => setDeleting(true)}>
              Delete Club…
            </Button>
          ) : (
            <div className="mt-3 space-y-2">
              <Label htmlFor="confirm-delete-club" className="text-xs">
                Type <span className="font-semibold text-text-primary">{clubName}</span> to confirm
              </Label>
              <Input id="confirm-delete-club" value={confirmName} onChange={(e) => setConfirmName(e.target.value)} />
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setDeleting(false)} disabled={pending}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  disabled={pending || confirmName !== clubName}
                  onClick={() =>
                    startTransition(async () => {
                      const res = await deleteOwnClubAction(clubId, confirmName);
                      if (res?.error) setError(res.error);
                    })
                  }
                >
                  {pending ? "Deleting…" : "Permanently Delete"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
