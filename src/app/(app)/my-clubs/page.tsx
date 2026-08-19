import type { Metadata } from "next";
import Link from "next/link";
import { getViewer } from "@/lib/viewer";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { ColorDot, Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { JoinClubButton } from "@/components/join-club-button";
import { ClubLogo } from "@/components/club-logo";
import { parseCategories } from "@/lib/categories";
import { BackButton } from "@/components/ui/back-button";

export const metadata: Metadata = { title: "My Clubs" };

export default async function MyClubsPage() {
  const viewer = await getViewer();
  // getViewer()'s memberships are ACTIVE-only — fetch PENDING ones too so a
  // requested-to-join private club still shows up here instead of vanishing.
  const memberships = await db.clubMembership.findMany({
    where: { userId: viewer.id, status: { in: ["ACTIVE", "PENDING"] } },
    include: { club: true },
    orderBy: { joinedAt: "asc" },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 animate-fade-in">
      <BackButton fallbackHref="/home" />
      <h1 className="mt-3 text-2xl font-bold tracking-tight text-text-primary">My Clubs</h1>

      {memberships.length === 0 ? (
        <Card className="mt-6">
          <EmptyState
            icon="👥"
            title="You haven't joined any clubs yet"
            description="Discover clubs and start getting involved."
            action={<LinkButton href="/discover" size="sm">Browse Clubs</LinkButton>}
          />
        </Card>
      ) : (
        <div className="mt-6 space-y-2">
          {memberships.map((m) => (
            <Card key={m.id}>
              <div className="flex items-center gap-3 p-4">
                <Link href={`/clubs/${m.club.slug}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <ClubLogo name={m.club.name} color={m.club.color} logoUrl={m.club.logoUrl} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-text-primary">{m.club.name}</p>
                    <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                      <ColorDot color={m.club.color} />
                      {parseCategories(m.club.category).join(", ")}
                      {m.role !== "MEMBER" && <Badge className="ml-1">{m.role === "DIRECTOR" ? "Teacher" : "Admin"}</Badge>}
                      {m.status === "PENDING" && <Badge tone="warning" className="ml-1">Pending</Badge>}
                    </div>
                  </div>
                </Link>
                {m.role === "MEMBER" && <JoinClubButton clubId={m.club.id} status={m.status as "ACTIVE" | "PENDING"} size="sm" />}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
