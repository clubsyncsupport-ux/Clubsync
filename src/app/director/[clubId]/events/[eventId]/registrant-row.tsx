"use client";

import { useState, useTransition } from "react";
import { directorRemoveRegistrantAction } from "@/app/actions/director-events";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export function RegistrantRow({
  eventId,
  userId,
  firstName,
  lastName,
  avatarUrl,
  grade,
  attended,
  roleName,
}: {
  eventId: string;
  userId: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  grade: string | null;
  attended: boolean;
  roleName?: string | null;
}) {
  const [removed, setRemoved] = useState(false);
  const [pending, startTransition] = useTransition();

  if (removed) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <Avatar firstName={firstName} lastName={lastName} src={avatarUrl} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text-primary">
          {firstName} {lastName}
        </p>
        <p className="text-xs text-text-muted">
          {grade ?? "—"}
          {roleName && ` · ${roleName}`}
        </p>
      </div>
      {attended && <Badge tone="success">Attended</Badge>}
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await directorRemoveRegistrantAction(eventId, userId);
            setRemoved(true);
          })
        }
        className="text-xs font-medium text-danger"
      >
        Remove
      </button>
    </div>
  );
}
