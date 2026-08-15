"use client";

import { useTransition } from "react";
import { setPlatformRoleAction } from "@/app/actions/admin";
import { Avatar } from "@/components/ui/avatar";

type Admin = { id: string; firstName: string; lastName: string; email: string; avatarUrl: string | null };

export function AdminList({ admins, currentUserId }: { admins: Admin[]; currentUserId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="mt-3 space-y-2">
      {admins.map((a) => {
        const isSelf = a.id === currentUserId;
        return (
          <div key={a.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
            <Avatar firstName={a.firstName} lastName={a.lastName} src={a.avatarUrl} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-text-primary">
                {a.firstName} {a.lastName} {isSelf && <span className="text-xs text-text-muted">(you)</span>}
              </p>
              <p className="truncate text-xs text-text-muted">{a.email}</p>
            </div>
            {!isSelf && (
              <button
                type="button"
                disabled={pending}
                onClick={() => startTransition(() => setPlatformRoleAction(a.id, "STUDENT"))}
                className="shrink-0 text-xs font-medium text-danger hover:underline disabled:opacity-50"
              >
                Remove
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
