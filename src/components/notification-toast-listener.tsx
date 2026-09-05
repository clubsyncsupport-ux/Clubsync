"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getNotificationsSinceAction, openNotificationAction } from "@/app/actions/notifications";
import type { Notification } from "@prisma/client";

const TYPE_ICON: Record<string, string> = {
  EVENT_REMINDER: "⏰",
  ANNOUNCEMENT: "📢",
  REGISTRATION: "🎟",
  SERVICE_HOURS: "⏱",
  ACHIEVEMENT: "🏅",
  PLATFORM: "🛠",
};

const POLL_MS = 20_000;
const AUTO_DISMISS_MS = 8_000;

// Polls for notifications created since the page loaded and surfaces each as
// a toast in the corner — without this, a club's announcement only shows up
// once someone happens to open the bell, which defeats the point of posting
// something time-sensitive while students are already using the app.
export function NotificationToastListener() {
  const [toasts, setToasts] = useState<Notification[]>([]);
  const lastCheckedRef = useRef(new Date());
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(async () => {
      const since = lastCheckedRef.current;
      lastCheckedRef.current = new Date();
      const fresh = await getNotificationsSinceAction(since.toISOString());
      if (fresh.length > 0) setToasts((prev) => [...prev, ...fresh]);
    }, POLL_MS);
    return () => clearInterval(interval);
  }, []);

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  async function openToast(toast: Notification) {
    dismiss(toast.id);
    await openNotificationAction(toast.id, toast.linkUrl);
    router.refresh();
  }

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onOpen={() => openToast(toast)} onDismiss={() => dismiss(toast.id)} />
      ))}
    </div>
  );
}

function Toast({ toast, onOpen, onDismiss }: { toast: Notification; onOpen: () => void; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast.id]);

  return (
    <div
      role="status"
      className="animate-fade-in flex items-start gap-3 rounded-2xl border border-border bg-surface-1 p-4 shadow-[var(--shadow-lg)]"
    >
      <span className="text-lg leading-none">{TYPE_ICON[toast.type] ?? "🔔"}</span>
      <Link href={toast.linkUrl ?? "/notifications"} onClick={onOpen} className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-text-primary">{toast.title}</p>
        <p className="mt-0.5 line-clamp-2 text-sm text-text-secondary">{toast.body}</p>
      </Link>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="shrink-0 text-text-muted hover:text-text-primary"
      >
        ✕
      </button>
    </div>
  );
}
