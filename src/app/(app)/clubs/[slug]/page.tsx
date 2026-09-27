import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getViewer } from "@/lib/viewer";
import { db } from "@/lib/db";
import { ColorDot } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { JoinClubButton } from "@/components/join-club-button";
import { parseCategories } from "@/lib/categories";
import { BackButton } from "@/components/ui/back-button";
import { EventCard } from "@/components/event-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar } from "@/components/ui/avatar";
import { timeAgo } from "@/lib/format";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const club = await db.club.findUnique({ where: { slug }, select: { name: true } });
  return { title: club?.name ?? "Club" };
}

export default async function ClubProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const viewer = await getViewer();

  const club = await db.club.findUnique({
    where: { slug },
    include: {
      memberships: {
        where: { status: "ACTIVE", role: { in: ["DIRECTOR", "OFFICER", "SUPER_ADMIN"] } },
        include: { user: true },
      },
      _count: { select: { memberships: { where: { status: "ACTIVE" } } } },
      announcements: { orderBy: { createdAt: "desc" }, take: 5, include: { createdBy: true } },
      events: {
        where: { status: "SCHEDULED", startAt: { gte: new Date() }, approvalStatus: "APPROVED" },
        orderBy: { startAt: "asc" },
        take: 8,
      },
    },
  });

  if (!club || club.status !== "ACTIVE" || club.approvalStatus !== "APPROVED") notFound();

  const myRegisteredEventIds = new Set(
    (
      await db.eventRegistration.findMany({
        where: { userId: viewer.id, eventId: { in: club.events.map((e) => e.id) }, status: { in: ["REGISTERED", "WAITLISTED", "ATTENDED"] } },
        select: { eventId: true },
      })
    ).map((r) => r.eventId)
  );

  const myMembership =
    viewer.memberships.find((m) => m.clubId === club.id) ??
    (await db.clubMembership.findUnique({ where: { userId_clubId: { userId: viewer.id, clubId: club.id } } }));

  const isActiveMember = myMembership?.status === "ACTIVE";
  const [openPositions, myApplications] = isActiveMember
    ? await Promise.all([
        db.clubPosition.findMany({ where: { clubId: club.id, status: "OPEN" }, orderBy: { createdAt: "desc" } }),
        db.positionApplication.findMany({ where: { userId: viewer.id, position: { clubId: club.id } }, select: { positionId: true } }),
      ])
    : [[], []];
  const appliedPositionIds = new Set(myApplications.map((a) => a.positionId));

  return (
    <div className="animate-fade-in">
      <div className="relative">
        <div
          className="h-32 w-full bg-cover bg-center sm:h-44"
          style={
            club.bannerUrl
              ? { backgroundImage: `url(${club.bannerUrl})` }
              : { background: `linear-gradient(135deg, ${club.color}, ${club.color}99)` }
          }
        />
        <BackButton fallbackHref="/discover" className="absolute left-4 top-4 rounded-full bg-black/30 px-3 py-1.5 text-white backdrop-blur-sm hover:bg-black/40 hover:text-white" />
      </div>

      <div className="mx-auto max-w-3xl px-4 pb-10">
        <div className="flex items-end gap-4">
          {/* Only the logo overlaps the banner — pulling the whole row up
             (including the text) let the club name render on top of the
             banner image itself once the name/category line ran past a
             single short line. */}
          <div
            className="-mt-10 flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-surface-0 text-2xl font-bold text-white shadow-md"
            style={{ backgroundColor: club.color }}
          >
            {club.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={club.logoUrl} alt={`${club.name} logo`} className="h-full w-full object-cover" />
            ) : (
              club.name[0]
            )}
          </div>
          <div className="flex-1 pb-1">
            <h1 className="text-xl font-bold text-text-primary sm:text-2xl">{club.name}</h1>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-sm text-text-secondary">
              <ColorDot color={club.color} />
              {parseCategories(club.category).join(", ")} · {club._count.memberships} members
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <JoinClubButton clubId={club.id} status={(myMembership?.status as "ACTIVE" | "PENDING") ?? "NONE"} />
            {myMembership?.status === "ACTIVE" && (
              <Link href={`/clubs/${club.slug}/chat`} className="text-xs font-medium text-accent">
                💬 Chat
              </Link>
            )}
          </div>
        </div>

        <p className="mt-5 text-[15px] leading-relaxed text-text-primary">{club.description}</p>
        {club.missionStatement && <p className="mt-2 text-sm italic text-text-secondary">&ldquo;{club.missionStatement}&rdquo;</p>}
        {club.allowedGrades && (
          <p className="mt-2 text-xs font-medium text-text-muted">Open to {club.allowedGrades.split(",").join(", ")} only</p>
        )}

        <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-text-secondary sm:grid-cols-2">
          {club.meetingSchedule && (
            <div className="flex items-center gap-2">
              <span>🗓</span> {club.meetingSchedule}
            </div>
          )}
          {club.meetingLocation && (
            <div className="flex items-center gap-2">
              <span>📍</span> {club.meetingLocation}
            </div>
          )}
          {club.contactEmail && (
            <div className="flex items-center gap-2">
              <span>✉️</span> {club.contactEmail}
            </div>
          )}
        </div>

        {club.memberships.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-text-muted">Leadership</h2>
            <div className="flex flex-wrap gap-3">
              {club.memberships.map((m) => (
                <div key={m.id} className="flex items-center gap-2 rounded-full border border-border bg-surface-1 py-1 pl-1 pr-3">
                  <Avatar firstName={m.user.firstName} lastName={m.user.lastName} src={m.user.avatarUrl} size="sm" />
                  <span className="text-sm font-medium text-text-primary">
                    {m.user.firstName} {m.user.lastName}
                  </span>
                  <span className="text-xs text-text-muted">{m.role === "DIRECTOR" ? "Director" : m.role === "SUPER_ADMIN" ? "Super Admin" : "Admin"}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8">
          <h2 className="mb-3 text-lg font-semibold text-text-primary">Upcoming Events</h2>
          {club.events.length === 0 ? (
            <Card>
              <EmptyState icon="📅" title="No upcoming events" description="Check back soon." />
            </Card>
          ) : (
            <div className="space-y-2">
              {club.events.map((e) => (
                <EventCard
                  key={e.id}
                  event={{ ...e, club: { id: club.id, name: club.name, color: club.color, slug: club.slug } }}
                  registered={myRegisteredEventIds.has(e.id)}
                />
              ))}
            </div>
          )}
        </div>

        {openPositions.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-lg font-semibold text-text-primary">Open Positions</h2>
            <div className="space-y-2">
              {openPositions.map((p) => {
                const applied = appliedPositionIds.has(p.id);
                return (
                  <Card key={p.id}>
                    <CardContent className="flex items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="font-medium text-text-primary">{p.title}</p>
                        {p.description && <p className="mt-0.5 truncate text-sm text-text-secondary">{p.description}</p>}
                      </div>
                      {applied ? (
                        <span className="shrink-0 text-sm font-medium text-success">Applied ✓</span>
                      ) : (
                        <Link
                          href={`/clubs/${club.slug}/positions/${p.id}/apply`}
                          className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-on-accent hover:bg-accent-hover"
                        >
                          Apply
                        </Link>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-8">
          <h2 className="mb-3 text-lg font-semibold text-text-primary">Announcements</h2>
          {club.announcements.length === 0 ? (
            <Card>
              <EmptyState icon="📢" title="No announcements yet" />
            </Card>
          ) : (
            <div className="space-y-3">
              {club.announcements.map((a) => (
                <Card key={a.id}>
                  <CardContent className="p-4">
                    <p className="font-semibold text-text-primary">{a.title}</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-text-secondary">{a.body}</p>
                    <p className="mt-2 text-xs text-text-muted">
                      {a.createdBy.firstName} {a.createdBy.lastName} · {timeAgo(a.createdAt)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
