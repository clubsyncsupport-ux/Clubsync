import type { Metadata } from "next";
import Link from "next/link";
import { getDirectorContext } from "@/lib/director";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { AddStudentButton } from "./add-student-button";

export const metadata: Metadata = { title: "Add Students" };

export default async function AddStudentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ clubId: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { clubId } = await params;
  const { club } = await getDirectorContext(clubId);
  const { q } = await searchParams;

  const school = await db.school.findUnique({ where: { id: club.schoolId } });

  const results =
    q && q.trim()
      ? await db.user.findMany({
          where: {
            schoolId: club.schoolId,
            accountKind: "STUDENT",
            OR: [{ firstName: { contains: q } }, { lastName: { contains: q } }, { email: { contains: q } }],
          },
          include: { memberships: { where: { clubId } } },
          take: 30,
          orderBy: { firstName: "asc" },
        })
      : [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 animate-fade-in">
      <Link href={`/director/${clubId}/members`} className="text-sm font-medium text-text-secondary hover:text-text-primary">
        ← Back to Members
      </Link>
      <h1 className="mt-3 text-2xl font-bold tracking-tight text-text-primary">Add Students</h1>
      <p className="mt-1 text-[15px] text-text-secondary">
        Search students at {school?.name ?? "your school"} and add them straight to the club — no invite or request needed.
      </p>

      <form action={`/director/${clubId}/members/add`} method="get" className="mt-4">
        <input
          type="search"
          name="q"
          defaultValue={q}
          autoFocus
          placeholder="Search by name or email…"
          className="w-full rounded-xl border border-border bg-surface-1 px-4 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      </form>

      <div className="mt-4 space-y-2">
        {q && results.length === 0 && <p className="text-sm text-text-muted">No students match &ldquo;{q}&rdquo;.</p>}
        {results.length > 0 && (
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {results.map((s) => {
                const membership = s.memberships[0];
                return (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                    <Avatar firstName={s.firstName} lastName={s.lastName} src={s.avatarUrl} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text-primary">
                        {s.firstName} {s.lastName}
                      </p>
                      <p className="text-xs text-text-muted">
                        {s.grade ?? "—"} · {s.email}
                      </p>
                    </div>
                    <AddStudentButton
                      clubId={clubId}
                      userId={s.id}
                      alreadyMember={membership?.status === "ACTIVE"}
                      pendingRequest={membership?.status === "PENDING"}
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
