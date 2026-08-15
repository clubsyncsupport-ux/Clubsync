"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { suspendUserAction, reactivateUserAction, deleteUserAction, setPlatformRoleAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";

export function UserActions({
  userId,
  accountStatus,
  platformRole,
}: {
  userId: string;
  accountStatus: string;
  platformRole: string;
}) {
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

      {platformRole === "PLATFORM_ADMIN" ? (
        <Button variant="danger" disabled={pending} onClick={() => startTransition(() => setPlatformRoleAction(userId, "STUDENT"))}>
          Remove Admin Access
        </Button>
      ) : (
        <Button variant="secondary" disabled={pending} onClick={() => startTransition(() => setPlatformRoleAction(userId, "PLATFORM_ADMIN"))}>
          Grant Admin Access
        </Button>
      )}

      {confirmDelete ? (
        <Button
          variant="danger"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await deleteUserAction(userId);
              router.push("/admin/users");
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
