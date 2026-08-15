"use client";

import { useTransition } from "react";
import { removeSchoolAdminAction } from "@/app/actions/admin";
import { Avatar } from "@/components/ui/avatar";

type SchoolAdmin = { id: string; firstName: string; lastName: string; email: string; avatarUrl: string | null };

export function SchoolAdminList({ admins }: { admins: SchoolAdmin[] }) {
  const [pending, startTransition] = useTransition();

  if (admins.length === 0) {
    return <p className="mt-3 text-sm text-text-muted">No School Admin assigned yet.</p>;
  }

  return (
    <div className="mt-3 space-y-2">
      {admins.map((a) => (
        <div key={a.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
          <Avatar firstName={a.firstName} lastName={a.lastName} src={a.avatarUrl} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-text-primary">
              {a.firstName} {a.lastName}
            </p>
            <p className="truncate text-xs text-text-muted">{a.email}</p>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => removeSchoolAdminAction(a.id))}
            className="shrink-0 text-xs font-medium text-danger hover:underline disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}
