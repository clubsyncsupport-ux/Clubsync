"use client";

import { useRef, useState, useTransition } from "react";
import { uploadEventAttachmentAction, deleteEventAttachmentAction } from "@/app/actions/director-events";
import { Card, CardContent } from "@/components/ui/card";
import { FileUploadButton } from "@/components/ui/file-upload-button";
import type { EventAttachment } from "@prisma/client";

export function AttachmentsSection({ eventId, attachments }: { eventId: string; attachments: EventAttachment[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleUpload(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await uploadEventAttachmentAction(eventId, formData);
      if (res?.error) setError(res.error);
      else formRef.current?.reset();
    });
  }

  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-text-muted">Attachments</h2>
      <Card>
        <CardContent className="p-4 space-y-3">
          {attachments.length === 0 && <p className="text-sm text-text-muted">No files uploaded.</p>}
          {attachments.map((a) => (
            <div key={a.id} className="flex items-center gap-3 text-sm">
              <a href={a.url} target="_blank" rel="noopener noreferrer" className="flex-1 truncate font-medium text-text-primary hover:text-accent">
                📎 {a.filename}
              </a>
              <button
                type="button"
                onClick={() => startTransition(() => deleteEventAttachmentAction(a.id))}
                className="text-xs text-text-muted hover:text-danger"
              >
                Remove
              </button>
            </div>
          ))}
          <form ref={formRef} action={handleUpload} className="flex items-center gap-2 pt-2">
            <FileUploadButton name="file" accept="image/*,.pdf" label="Choose File" />
            <button type="submit" disabled={pending} className="rounded-lg bg-surface-2 border border-border px-3 py-1.5 text-sm font-medium text-text-primary">
              {pending ? "Uploading…" : "Upload"}
            </button>
          </form>
          {error && <p className="text-sm text-danger">{error}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
