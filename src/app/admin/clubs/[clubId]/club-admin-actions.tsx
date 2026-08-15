"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { archiveClubAction, restoreClubAction, deleteClubAction, transferClubOwnershipAction, mergeClubsAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label, Select } from "@/components/ui/input";

export function ClubAdminActions({
  clubId,
  status,
  members,
  otherClubs,
}: {
  clubId: string;
  status: string;
  members: { id: string; name: string; role: string }[];
  otherClubs: { id: string; name: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [newDirector, setNewDirector] = useState(members[0]?.id ?? "");
  const [mergeTarget, setMergeTarget] = useState(otherClubs[0]?.id ?? "");
  const router = useRouter();

  return (
    <div className="mt-6 space-y-4">
      <Card>
        <CardContent className="p-5 space-y-3">
          <p className="text-sm font-semibold text-text-primary">Moderation</p>
          <div className="flex flex-wrap gap-2">
            {status === "ACTIVE" ? (
              <Button variant="secondary" disabled={pending} onClick={() => startTransition(() => archiveClubAction(clubId))}>
                Archive Club
              </Button>
            ) : (
              <Button variant="secondary" disabled={pending} onClick={() => startTransition(() => restoreClubAction(clubId))}>
                Restore Club
              </Button>
            )}
            {confirmDelete ? (
              <Button
                variant="danger"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await deleteClubAction(clubId);
                    router.push("/admin/clubs");
                  })
                }
              >
                Confirm Permanent Delete
              </Button>
            ) : (
              <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                Delete Club
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {members.length > 0 && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <p className="text-sm font-semibold text-text-primary">Transfer Ownership</p>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label htmlFor="newDirector">New Director</Label>
                <Select id="newDirector" value={newDirector} onChange={(e) => setNewDirector(e.target.value)}>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.role === "DIRECTOR" ? "(current)" : ""}
                    </option>
                  ))}
                </Select>
              </div>
              <Button disabled={pending} onClick={() => startTransition(() => transferClubOwnershipAction(clubId, newDirector))}>
                Transfer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {otherClubs.length > 0 && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <p className="text-sm font-semibold text-text-primary">Merge Into Another Club</p>
            <p className="text-xs text-text-muted">Moves all members, events, announcements, and service-hour records into the target club, then archives this one.</p>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label htmlFor="mergeTarget">Merge into</Label>
                <Select id="mergeTarget" value={mergeTarget} onChange={(e) => setMergeTarget(e.target.value)}>
                  {otherClubs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
              <Button variant="danger" disabled={pending} onClick={() => startTransition(() => mergeClubsAction(clubId, mergeTarget))}>
                Merge
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
