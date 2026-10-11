"use client";

import { useRef, useState, useTransition } from "react";
import { Paperclip, X } from "lucide-react";
import { postSchoolAnnouncementAction } from "@/app/actions/school-feed";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { cn } from "@/lib/cn";

export type PromotableEvent = { id: string; title: string; label: string };

export function SchoolFeedComposer({ schoolId, events }: { schoolId: string; events: PromotableEvent[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function clearFile() {
    setFileName(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await postSchoolAnnouncementAction(schoolId, { error: null }, formData);
      if (res.error) setError(res.error);
      else {
        formRef.current?.reset();
        clearFile();
      }
    });
  }

  return (
    <form ref={formRef} action={submit} data-tour="feed-composer" className="space-y-3 rounded-2xl border border-border bg-surface-1 p-4">
      <p className="text-sm font-semibold text-text-primary">Post to the whole school</p>
      <textarea
        name="body"
        rows={3}
        maxLength={2000}
        required
        placeholder="What should everyone know about? (Bubble tea sale Friday at lunch, tryouts open, ...)"
        className="w-full resize-y rounded-xl border border-border bg-surface-0 px-3 py-2 text-sm outline-none focus:border-accent"
      />
      {fileName && (
        <div className="flex items-center gap-1.5 rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs text-text-secondary">
          <Paperclip className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
          <span className="min-w-0 flex-1 truncate">{fileName}</span>
          <button type="button" onClick={clearFile} aria-label="Remove image" className="shrink-0 text-text-muted hover:text-danger">
            <X className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
      )}
      <div className="flex items-center gap-2">
        {events.length > 0 && (
          <Select name="eventId" defaultValue="" className="min-w-0 flex-1 text-xs">
            <option value="">Promote an event (optional)</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title} — {e.label}
              </option>
            ))}
          </Select>
        )}
        <input ref={fileRef} type="file" name="image" accept="image/*" className="hidden" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          aria-label="Attach a poster or photo"
          title="Attach a poster or photo"
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors",
            fileName ? "border-accent bg-accent-soft text-accent" : "border-border text-text-secondary hover:bg-surface-2"
          )}
        >
          <Paperclip className="h-4 w-4" strokeWidth={2} />
        </button>
        <Button type="submit" size="sm" disabled={pending} className="ml-auto">
          {pending ? "Posting…" : "Post"}
        </Button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </form>
  );
}
