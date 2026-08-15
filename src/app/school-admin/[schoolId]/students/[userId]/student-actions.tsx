"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { suspendUserAction, reactivateUserAction, deleteUserAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";

export function StudentActions({ schoolId, userId, accountStatus }: { schoolId: string; userId: string; accountStatus: string }) {
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const router = useRouter();

  return (
    <div className="flex flex-wrap gap-2">
      {accountStatus === "SUSPENDED" ? (
        <Button variant="secondary" disabled={pending} onClick={() => startTransition(() => reactivateUserAction(userId))}>
          Reactivate Account
        </Button>
      ) : (
        <Button variant="secondary" disabled={pending} onClick={() => startTransition(() => suspendUserAction(userId))}>
          Suspend Account
        </Button>
      )}

      {confirmDelete ? (
        <Button
          variant="danger"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await deleteUserAction(userId);
              router.push(`/school-admin/${schoolId}/students`);
            })
          }
        >
          Confirm Delete Account
        </Button>
      ) : (
        <Button variant="danger" onClick={() => setConfirmDelete(true)}>
          Delete Account
        </Button>
      )}
    </div>
  );
}
