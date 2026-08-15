"use client";

import { useState, useTransition } from "react";
import { addStudentToClubAction } from "@/app/actions/director-club";

export function AddStudentButton({
  clubId,
  userId,
  alreadyMember,
  pendingRequest,
}: {
  clubId: string;
  userId: string;
  alreadyMember: boolean;
  pendingRequest: boolean;
}) {
  const [added, setAdded] = useState(alreadyMember);
  const [pending, startTransition] = useTransition();

  if (added) {
    return <span className="shrink-0 text-xs font-medium text-success">✓ In club</span>;
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await addStudentToClubAction(clubId, userId);
          setAdded(true);
        })
      }
      className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-on-accent hover:bg-accent-hover disabled:opacity-50"
    >
      {pending ? "Adding…" : pendingRequest ? "Approve & Add" : "+ Add"}
    </button>
  );
}
