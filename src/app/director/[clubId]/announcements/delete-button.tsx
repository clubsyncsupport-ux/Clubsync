"use client";

import { useTransition } from "react";
import { deleteAnnouncementAction } from "@/app/actions/director-club";

export function DeleteAnnouncementButton({ announcementId, clubId }: { announcementId: string; clubId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => deleteAnnouncementAction(announcementId, clubId))}
      className="shrink-0 text-xs text-text-muted hover:text-danger"
    >
      Delete
    </button>
  );
}
