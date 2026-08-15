"use client";

import { useTransition } from "react";
import { approveMembershipAction, denyMembershipAction, removeMemberAction, promoteMemberAction } from "@/app/actions/director-club";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { ClubMembership, User } from "@prisma/client";

export function MemberRow({
  membership,
  clubId,
  isDirector,
  pending = false,
}: {
  membership: ClubMembership & { user: User };
  clubId: string;
  isDirector: boolean;
  pending?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const { user } = membership;

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Avatar firstName={user.firstName} lastName={user.lastName} src={user.avatarUrl} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text-primary">
          {user.firstName} {user.lastName}
        </p>
        <p className="text-xs text-text-muted">
          {user.grade ?? "—"} · {user.email}
        </p>
      </div>
      {membership.role !== "MEMBER" && <Badge tone="accent">{membership.role === "DIRECTOR" ? "Director" : "Admin"}</Badge>}

      {pending ? (
        <div className="flex gap-2">
          <button
            disabled={isPending}
            onClick={() => startTransition(() => approveMembershipAction(membership.id, clubId))}
            className="rounded-lg bg-success px-2.5 py-1 text-xs font-medium text-white"
          >
            Accept
          </button>
          <button
            disabled={isPending}
            onClick={() => startTransition(() => denyMembershipAction(membership.id, clubId))}
            className="rounded-lg bg-danger px-2.5 py-1 text-xs font-medium text-white"
          >
            Reject
          </button>
        </div>
      ) : (
        membership.role !== "DIRECTOR" &&
        isDirector && (
          <div className="flex gap-2">
            {membership.role === "MEMBER" ? (
              <button
                disabled={isPending}
                onClick={() => startTransition(() => promoteMemberAction(membership.id, clubId, "OFFICER"))}
                className="text-xs font-medium text-accent"
              >
                Make Admin
              </button>
            ) : (
              <button
                disabled={isPending}
                onClick={() => startTransition(() => promoteMemberAction(membership.id, clubId, "MEMBER"))}
                className="text-xs font-medium text-danger"
              >
                Remove Admin
              </button>
            )}
            <button
              disabled={isPending}
              onClick={() => startTransition(() => removeMemberAction(membership.id, clubId))}
              className="text-xs font-medium text-danger"
            >
              Remove
            </button>
          </div>
        )
      )}
    </div>
  );
}
