import type { Metadata } from "next";
import { getDirectorContext } from "@/lib/director";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { timeAgo } from "@/lib/format";
import { AnnouncementForm } from "./announcement-form";

export const metadata: Metadata = { title: "Announcements" };
import { DeleteAnnouncementButton } from "./delete-button";

export default async function DirectorAnnouncementsPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  await getDirectorContext(clubId);

  const announcements = await db.announcement.findMany({
    where: { clubId },
    include: { createdBy: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight text-text-primary">Announcements</h1>

      <AnnouncementForm clubId={clubId} />

      <div className="mt-8">
        {announcements.length === 0 ? (
          <Card>
            <EmptyState icon="📢" title="No announcements yet" />
          </Card>
        ) : (
          <div className="space-y-2">
            {announcements.map((a) => (
              <Card key={a.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-text-primary">{a.title}</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-text-secondary">{a.body}</p>
                      <p className="mt-2 text-xs text-text-muted">
                        {a.createdBy.firstName} {a.createdBy.lastName} · {timeAgo(a.createdAt)}
                      </p>
                    </div>
                    <DeleteAnnouncementButton announcementId={a.id} clubId={clubId} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
