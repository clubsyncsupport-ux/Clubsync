"use client";

import { useEffect, useRef, useState } from "react";
import { getClassOverlapPreviewAction } from "@/app/actions/director-events";

// Reads the date/time fields straight off the surrounding <form> (so the
// create and edit forms don't need any new state) and shows which class
// blocks the event would cut into. Purely informational — events during class
// are allowed; this just makes the cost visible before saving.
export function ClassOverlapNotice({ clubId }: { clubId: string }) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    const form = anchorRef.current?.closest("form");
    if (!form) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let latest = 0;

    function schedule() {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const fd = new FormData(form!);
        const date = String(fd.get("date") ?? "");
        const start = String(fd.get("startTime") ?? "");
        const end = String(fd.get("endTime") ?? "");
        const mine = ++latest;
        if (!date || !start || !end) {
          setText(null);
          return;
        }
        const result = await getClassOverlapPreviewAction(clubId, date, start, end, fd.get("endsNextDay") === "on");
        if (mine === latest) setText(result);
      }, 350);
    }

    form.addEventListener("input", schedule);
    form.addEventListener("change", schedule);
    schedule();
    return () => {
      clearTimeout(timer);
      form.removeEventListener("input", schedule);
      form.removeEventListener("change", schedule);
    };
  }, [clubId]);

  return (
    <div ref={anchorRef}>
      {text && (
        <p className="rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-text-primary">
          <span className="font-semibold">🏫 During class time:</span> {text}. Students can still sign up — this just shows on their calendar so they know which classes they&rsquo;d miss.
        </p>
      )}
    </div>
  );
}
