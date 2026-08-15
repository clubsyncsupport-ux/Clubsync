import type { Metadata } from "next";
import Link from "next/link";
import { getDirectorContext } from "@/lib/director";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MemberRow } from "./member-row";
import { schoolGradeLevels } from "@/lib/grades";

export const metadata: Metadata = { title: "Members" };

export default async function DirectorMembersPage({
  params,
  searchParams,
}: {
  params: Promise<{ clubId: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { clubId } = await params;
  const { isDirector, club } = await getDirectorContext(clubId);
  const { q } = await searchParams;

  const school = await db.school.findUniqueOrThrow({ where: { id: club.schoolId } });
  const gradeLevels = schoolGradeLevels(school);

  const memberships = await db.clubMembership.findMany({
    where: {
      clubId,
      ...(q
        ? { user: { OR: [{ firstName: { contains: q } }, { lastName: { contains: q } }, { email: { contains: q } }] } }
        : {}),
    },
    include: { user: true },
    orderBy: [{ status: "asc" }, { role: "asc" }, { joinedAt: "asc" }],
  });

  const pending = memberships.filter((m) => m.status === "PENDING");
  const active = memberships.filter((m) => m.status === "ACTIVE");
  const admins = active.filter((m) => m.role === "DIRECTOR" || m.role === "OFFICER");
  const regularMembers = active.filter((m) => m.role === "MEMBER");

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Members</h1>
          <p className="mt-1 text-[15px] text-text-secondary">{active.length} active members</p>
        </div>
        <Link
          href={`/director/${clubId}/members/add`}
          className="shrink-0 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-hover"
        >
          + Add Students
        </Link>
      </div>

      <form action={`/director/${clubId}/members`} method="get" className="mt-4">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search members by name or email…"
          className="w-full rounded-xl border border-border bg-surface-1 px-4 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      </form>

      {pending.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-warning">Invites ({pending.length})</h2>
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {pending.map((m) => (
                <MemberRow key={m.id} membership={m} clubId={clubId} isDirector={isDirector} pending />
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      <div id="admins" className="mt-6 scroll-mt-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-text-muted">Director &amp; Admins</h2>
        {admins.length === 0 ? (
          <p className="text-sm text-text-muted">No admins yet — promote a member below to help run the club.</p>
        ) : (
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {admins.map((m) => (
                <MemberRow key={m.id} membership={m} clubId={clubId} isDirector={isDirector} />
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="mt-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-text-muted">Members</h2>
        {regularMembers.length === 0 ? (
          <Card>
            <EmptyState icon="👥" title={q ? "No members match your search" : "No members yet"} />
          </Card>
        ) : (
          <div className="space-y-2">
            {[...gradeLevels, null].map((grade) => {
              const inGrade = regularMembers.filter((m) => (grade === null ? !m.user.grade : m.user.grade === grade));
              if (inGrade.length === 0) return null;
              return (
                <details key={grade ?? "no-grade"} className="group overflow-hidden rounded-2xl border border-border" open>
                  <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-text-primary hover:bg-surface-2">
                    <span>
                      {grade ?? "No Grade"} ({inGrade.length})
                    </span>
                    <span className="text-text-muted transition-transform group-open:rotate-180">▼</span>
                  </summary>
                  <div className="divide-y divide-border border-t border-border">
                    {inGrade.map((m) => (
                      <MemberRow key={m.id} membership={m} clubId={clubId} isDirector={isDirector} />
                    ))}
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
