"use client";

import { useTransition } from "react";
import { deleteSchoolAnnouncementAction } from "@/app/actions/school-feed";

export function DeletePostButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm("Delete this announcement for everyone?")) startTransition(() => deleteSchoolAnnouncementAction(id));
      }}
      className="text-xs font-medium text-text-muted hover:text-danger"
    >
      Delete
    </button>
  );
}
