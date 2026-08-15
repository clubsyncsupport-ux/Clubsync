import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, ColorDot } from "@/components/ui/badge";
import { ClubLogo } from "@/components/club-logo";
import { parseCategories } from "@/lib/categories";
import { BackButton } from "@/components/ui/back-button";
import { ClubAdminActions } from "./club-admin-actions";

export async function generateMetadata({ params }: { params: Promise<{ clubId: string }> }): Promise<Metadata> {
  const { clubId } = await params;
  const club = await db.club.findUnique({ where: { id: clubId }, select: { name: true } });
  return { title: club?.name ?? "Club" };
}

export default async function AdminClubDetailPage({ params }: { params: Promise<{ clubId: string }> }) {
  await requireAdmin();
  const { clubId } = await params;

  const club = await db.club.findUnique({
    where: { id: clubId },
    include: {
      school: true,
      memberships: { where: { status: "ACTIVE" }, include: { user: true } },
      _count: { select: { events: true, announcements: true } },
    },
  });
  if (!club) notFound();

  const otherClubs = await db.club.findMany({
    where: { schoolId: club.schoolId, status: "ACTIVE", id: { not: club.id } },
    select: { id: true, name: true },
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <BackButton fallbackHref="/admin/clubs" />
      <div className="mt-3 flex items-center gap-3">
        <ClubLogo name={club.name} color={club.color} logoUrl={club.logoUrl} size="lg" />
        <div>
          <h1 className="text-xl font-bold text-text-primary">{club.name}</h1>
          <div className="flex items-center gap-1.5 text-sm text-text-secondary">
            <ColorDot color={club.color} />
            {parseCategories(club.category).join(", ")} · {club.school.name}
          </div>
        </div>
        <Badge tone={club.status === "ACTIVE" ? "success" : "danger"} className="ml-auto">
          {club.status}
        </Badge>
      </div>

      <Link
        href={`/director/${club.id}`}
        className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-hover"
      >
        🛡 Manage as Director →
      </Link>
      <p className="mt-1.5 text-xs text-text-muted">
        Opens this club&rsquo;s full director dashboard — events, members, announcements, and settings — so you can step in and help.
      </p>

      <p className="mt-4 text-sm text-text-primary">{club.description}</p>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="text-xl font-bold text-text-primary">{club.memberships.length}</p>
          <p className="text-xs text-text-secondary">Members</p>
        </Card>
        <Card className="p-4">
          <p className="text-xl font-bold text-text-primary">{club._count.events}</p>
          <p className="text-xs text-text-secondary">Events</p>
        </Card>
        <Card className="p-4">
          <p className="text-xl font-bold text-text-primary">{club._count.announcements}</p>
          <p className="text-xs text-text-secondary">Announcements</p>
        </Card>
      </div>

      <ClubAdminActions
        clubId={club.id}
        status={club.status}
        members={club.memberships.map((m) => ({ id: m.user.id, name: `${m.user.firstName} ${m.user.lastName}`, role: m.role }))}
        otherClubs={otherClubs}
      />
    </div>
  );
}
