"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteSchoolAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/input";

export function DeleteSchoolButton({ schoolId }: { schoolId: string }) {
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (!confirmDelete) {
    return (
      <Button variant="danger" onClick={() => setConfirmDelete(true)}>
        Delete School
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="danger"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const res = await deleteSchoolAction(schoolId);
            if (res.error) setError(res.error);
            else router.push("/admin/schools");
          })
        }
      >
        Confirm Permanent Delete
      </Button>
      <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
        Cancel
      </Button>
      <FieldError>{error}</FieldError>
    </div>
  );
}
