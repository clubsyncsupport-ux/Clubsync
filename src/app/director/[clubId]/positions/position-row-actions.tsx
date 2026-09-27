"use client";

import { useTransition } from "react";
import { closePositionAction, reopenPositionAction, deletePositionAction } from "@/app/actions/positions";

export function PositionRowActions({ positionId, status }: { positionId: string; status: "OPEN" | "CLOSED" }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      {status === "OPEN" ? (
        <button disabled={pending} onClick={() => startTransition(() => closePositionAction(positionId))} className="text-xs font-medium text-text-secondary">
          Close
        </button>
      ) : (
        <button disabled={pending} onClick={() => startTransition(() => reopenPositionAction(positionId))} className="text-xs font-medium text-accent">
          Reopen
        </button>
      )}
      <button
        disabled={pending}
        onClick={() => {
          if (confirm("Delete this position and all its applications?")) startTransition(() => deletePositionAction(positionId));
        }}
        className="text-xs font-medium text-danger"
      >
        Delete
      </button>
    </div>
  );
}
