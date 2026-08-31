"use client";

import { useTransition } from "react";
import { approveStaffAction, rejectStaffAction } from "@/app/actions/admin";
import { Avatar } from "@/components/ui/avatar";

type PendingStaff = { id: string; firstName: string; lastName: string; email: string; avatarUrl: string | null; school: { name: string } | null };

export function PendingStaffList({ pending }: { pending: PendingStaff[] }) {
  const [isPending, startTransition] = useTransition();

  if (pending.length === 0) {
    return <p className="mt-2 text-xs text-text-muted">No pending teacher accounts right now.</p>;
  }

  return (
    <div className="mt-3 space-y-2">
      {pending.map((s) => (
        <div key={s.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
          <Avatar firstName={s.firstName} lastName={s.lastName} src={s.avatarUrl} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-text-primary">
              {s.firstName} {s.lastName}
            </p>
            <p className="truncate text-xs text-text-muted">
              {s.email} {s.school && `· ${s.school.name}`}
            </p>
          </div>
          <div className="flex shrink-0 gap-3">
            <button
              type="button"
              disabled={isPending}
              onClick={() => startTransition(() => approveStaffAction(s.id))}
              className="text-xs font-medium text-accent hover:underline disabled:opacity-50"
            >
              Approve
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => startTransition(() => rejectStaffAction(s.id))}
              className="text-xs font-medium text-danger hover:underline disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
