import Link from "next/link";
import { getSchoolFeed } from "@/lib/school-feed";
import { Card, CardContent } from "@/components/ui/card";
import { timeAgo } from "@/lib/format";

// The latest couple of school-wide announcements, surfaced where students
// already look every day (Home) instead of waiting for them to open the feed.
// Renders nothing when there's nothing posted.
export async function SchoolFeedHighlights({ schoolId }: { schoolId: string }) {
  const posts = await getSchoolFeed(schoolId, 2);
  if (posts.length === 0) return null;
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-baseline justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">📣 School announcements</p>
          <Link href="/school-feed" className="text-xs font-medium text-accent">
            See all
          </Link>
        </div>
        <div className="mt-2 divide-y divide-border">
          {posts.map((p) => (
            <Link key={p.id} href="/school-feed" className="block py-2 first:pt-0 last:pb-0">
              <p className="line-clamp-2 text-sm text-text-primary">{p.body}</p>
              <p className="mt-0.5 text-xs text-text-muted">
                {p.author.firstName} {p.author.lastName} · {timeAgo(p.createdAt)}
              </p>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
