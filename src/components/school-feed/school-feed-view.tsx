import { format } from "date-fns";
import { getSchoolFeed, getPromotableEvents, canPostSchoolFeed, canDeleteSchoolFeedPost, posterLabel } from "@/lib/school-feed";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { EventCard } from "@/components/event-card";
import { timeAgo } from "@/lib/format";
import { toSchoolZone } from "@/lib/school-time";
import { SchoolFeedComposer } from "./school-feed-composer";
import { DeletePostButton } from "./delete-post-button";

type Viewer = {
  id: string;
  accountKind: string;
  platformRole: string;
  schoolId: string | null;
  schoolAdminOfId: string | null;
  staffApprovalStatus: string | null;
};

// The whole-school feed: everyone at the school reads it, only staff post.
// Shared by the student, teacher and school-admin shells — each role has its
// own layout, so each gets a thin page that renders this.
export async function SchoolFeedView({ schoolId, viewer }: { schoolId: string; viewer: Viewer }) {
  const canPost = canPostSchoolFeed(viewer, schoolId);
  const [posts, events] = await Promise.all([getSchoolFeed(schoolId), canPost ? getPromotableEvents(schoolId) : Promise.resolve([])]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight text-text-primary">School Announcements</h1>
      <p className="mt-1 text-[15px] text-text-secondary">
        {canPost ? "Everyone at the school sees what you post here." : "Updates from teachers and school staff. Only staff can post here."}
      </p>

      {canPost && (
        <div className="mt-5">
          <SchoolFeedComposer
            schoolId={schoolId}
            events={events.map((e) => ({ id: e.id, title: e.title, label: `${e.club.name}, ${format(toSchoolZone(e.startAt), "MMM d")}` }))}
          />
        </div>
      )}

      <div className="mt-5 space-y-3">
        {posts.length === 0 ? (
          <Card>
            <EmptyState icon="📣" title="Nothing posted yet" description={canPost ? "Post the first announcement above." : "Check back soon."} />
          </Card>
        ) : (
          posts.map((p) => (
            <Card key={p.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center gap-2.5">
                  <Avatar firstName={p.author.firstName} lastName={p.author.lastName} src={p.author.avatarUrl} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {p.author.firstName} {p.author.lastName}
                    </p>
                    <p className="text-xs text-text-muted">{timeAgo(p.createdAt)}</p>
                  </div>
                  <Badge tone="accent">{posterLabel(p.author)}</Badge>
                </div>
                <p className="whitespace-pre-wrap text-[15px] text-text-primary">{p.body}</p>
                {p.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageUrl} alt="" className="max-h-96 w-full rounded-xl border border-border object-contain" />
                )}
                {p.event && p.event.status === "SCHEDULED" && <EventCard event={p.event} />}
                {canDeleteSchoolFeedPost(viewer, p) && (
                  <div className="flex justify-end">
                    <DeletePostButton id={p.id} />
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
