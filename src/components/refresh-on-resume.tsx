"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const STALE_AFTER_MS = 60_000;

/** Reopening the installed PWA (or switching back to the tab) often resumes an
 * already-mounted page showing whatever it last rendered, since the app is
 * server-driven and doesn't refetch on its own. Refresh server data whenever
 * the page regains visibility after being backgrounded for a while, so a
 * reopened app shows current data instead of a stale snapshot. */
export function RefreshOnResume() {
  const router = useRouter();
  const hiddenAt = useRef<number | null>(null);

  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === "hidden") {
        hiddenAt.current = Date.now();
        return;
      }
      if (hiddenAt.current && Date.now() - hiddenAt.current > STALE_AFTER_MS) {
        router.refresh();
      }
      hiddenAt.current = null;
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [router]);

  return null;
}
