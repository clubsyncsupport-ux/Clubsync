import type { Metadata } from "next";
import { isToday, isYesterday, isThisWeek } from "date-fns";
import { getViewer } from "@/lib/viewer";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { timeAgo } from "@/lib/format";
import { openNotificationAction, deleteNotificationAction } from "@/app/actions/notifications";
import { MarkAllReadOnView } from "./mark-all-read-on-view";

const TYPE_ICON: Record<string, string> = {
  EVENT_REMINDER: "⏰",
  ANNOUNCEMENT: "📢",
  REGISTRATION: "🎟",
  SERVICE_HOURS: "⏱",
  ACHIEVEMENT: "🏅",
  PLATFORM: "🛠",
};

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const viewer = await getViewer();
  const notifications = await db.notification.findMany({
    where: { userId: viewer.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const groups: { label: string; items: typeof notifications }[] = [
    { label: "Today", items: notifications.filter((n) => isToday(n.createdAt)) },
    { label: "Yesterday", items: notifications.filter((n) => isYesterday(n.createdAt)) },
    { label: "Earlier This Week", items: notifications.filter((n) => !isToday(n.createdAt) && !isYesterday(n.createdAt) && isThisWeek(n.createdAt)) },
    { label: "Earlier", items: notifications.filter((n) => !isThisWeek(n.createdAt)) },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 animate-fade-in">
      <MarkAllReadOnView />
      <h1 className="text-2xl font-bold tracking-tight text-text-primary">Notifications</h1>

      {notifications.length === 0 ? (
        <Card className="mt-6">
          <EmptyState icon="🔔" title="Nothing new right now" description="We'll let you know when something important happens." />
        </Card>
      ) : (
        <div className="mt-6 space-y-6">
          {groups.map((group) => (
            <div key={group.label}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-text-muted">{group.label}</h2>
              <div className="space-y-2">
                {group.items.map((n) => (
                  <Card key={n.id} className={n.read ? "opacity-70" : ""}>
                    <div className="flex items-start gap-3 p-4">
                      {!n.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" title="Unread" />}
                      <span className={`text-xl leading-none ${n.read ? "" : "-ml-0.5"}`}>{TYPE_ICON[n.type] ?? "🔔"}</span>
                      <form action={openNotificationAction.bind(null, n.id, n.linkUrl)} className="min-w-0 flex-1">
                        <button type="submit" className="block w-full text-left">
                          <p className="font-medium text-text-primary">{n.title}</p>
                          <p className="mt-0.5 text-sm text-text-secondary">{n.body}</p>
                          <p className="mt-1 text-xs text-text-muted">{timeAgo(n.createdAt)}</p>
                        </button>
                      </form>
                      <form action={deleteNotificationAction.bind(null, n.id)} className="shrink-0">
                        <button type="submit" className="text-xs text-text-muted hover:text-danger">
                          ✕
                        </button>
                      </form>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
