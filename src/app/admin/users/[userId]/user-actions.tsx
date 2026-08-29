"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { suspendUserAction, reactivateUserAction, deleteUserAction, setPlatformRoleAction, adminResetPasswordAction } from "@/app/actions/admin";
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
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="flex flex-col gap-3">
      {tempPassword && (
        <div className="rounded-xl border border-accent/30 bg-accent-soft p-4 text-sm text-accent-soft-text">
          <p className="font-medium">New temporary password — give this to the account owner directly, it won&rsquo;t be shown again:</p>
          <p className="mt-2 break-all font-mono text-base">{tempPassword}</p>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await adminResetPasswordAction(userId);
              setTempPassword(result.tempPassword);
            })
          }
        >
          Reset Password
        </Button>
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
    </div>
  );
}
