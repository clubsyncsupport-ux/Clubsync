"use client";

import { useActionState, useState, useTransition } from "react";
import { createMemberGroupAction, deleteMemberGroupAction, toggleGroupMembershipAction, type MemberGroupState } from "@/app/actions/member-groups";
import { ColorDot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

type Group = { id: string; name: string; color: string; memberIds: string[] };
type Member = { id: string; firstName: string; lastName: string };

const GROUP_COLORS = [
  "#dc2626",
  "#ea580c",
  "#d97706",
  "#65a30d",
  "#059669",
  "#0891b2",
  "#2563eb",
  "#7c3aed",
  "#c026d3",
  "#db2777",
];

export function ManageGroups({ clubId, groups, members }: { clubId: string; groups: Group[]; members: Member[] }) {
  const [open, setOpen] = useState(false);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-2xl border border-border bg-surface-1 px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-text-primary">🏷️ Groups {groups.length > 0 && `(${groups.length})`}</span>
        <span className="text-text-muted">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="mt-2 space-y-3 rounded-2xl border border-border p-4">
          <p className="text-xs text-text-muted">
            Tag members into groups (e.g. &ldquo;Executive Team&rdquo;) so you can bulk-select them when creating an event instead
            of checking names one by one. A member can belong to more than one group.
          </p>

          {groups.map((g) => (
            <div key={g.id} className="rounded-xl border border-border">
              <div className="flex items-center gap-3 p-3">
                <ColorDot color={g.color} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">
                  {g.name} <span className="text-xs text-text-muted">({g.memberIds.length})</span>
                </span>
                <button
                  type="button"
                  onClick={() => setExpandedGroupId(expandedGroupId === g.id ? null : g.id)}
                  className="shrink-0 text-xs font-medium text-accent"
                >
                  {expandedGroupId === g.id ? "Done" : "Manage members"}
                </button>
                <DeleteGroupButton groupId={g.id} />
              </div>
              {expandedGroupId === g.id && (
                <div className="max-h-56 space-y-0.5 overflow-y-auto border-t border-border p-2">
                  {members.length === 0 && <p className="p-2 text-sm text-text-muted">No members yet.</p>}
                  {members.map((m) => (
                    <MemberToggleRow key={m.id} groupId={g.id} member={m} checked={g.memberIds.includes(m.id)} />
                  ))}
                </div>
              )}
            </div>
          ))}

          <NewGroupForm clubId={clubId} />
        </div>
      )}
    </div>
  );
}

function MemberToggleRow({ groupId, member, checked }: { groupId: string; member: Member; checked: boolean }) {
  const [isPending, startTransition] = useTransition();
  return (
    <label className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-2">
      <input
        type="checkbox"
        checked={checked}
        disabled={isPending}
        onChange={() => startTransition(() => toggleGroupMembershipAction(groupId, member.id))}
        className="h-4 w-4 accent-accent"
      />
      {member.firstName} {member.lastName}
    </label>
  );
}

function DeleteGroupButton({ groupId }: { groupId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => deleteMemberGroupAction(groupId))}
      className="shrink-0 text-xs font-medium text-danger disabled:opacity-50"
    >
      Delete
    </button>
  );
}

function NewGroupForm({ clubId }: { clubId: string }) {
  const [color, setColor] = useState(GROUP_COLORS[0]);
  const [state, formAction, isPending] = useActionState<MemberGroupState, FormData>(createMemberGroupAction.bind(null, clubId), { error: null });

  return (
    <form action={formAction} className="space-y-2 rounded-xl border border-dashed border-border-strong p-3">
      <Label htmlFor="new-group-name" className="mb-0 text-xs">
        New group
      </Label>
      <div className="flex gap-2">
        <Input id="new-group-name" name="name" placeholder="e.g. Executive Team" className="flex-1" />
        <input type="hidden" name="color" value={color} />
        <Button type="submit" variant="secondary" size="sm" disabled={isPending}>
          Add
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {GROUP_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            className={`h-6 w-6 rounded-full ring-offset-2 ring-offset-surface-0 ${color === c ? "ring-2 ring-accent" : ""}`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      {state.error && <p className="text-xs text-danger">{state.error}</p>}
    </form>
  );
}
