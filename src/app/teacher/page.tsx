import type { Metadata } from "next";
import Link from "next/link";
import { requireTeacher } from "@/lib/teacher";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { ColorDot } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { ClubLogo } from "@/components/club-logo";
import { parseCategories } from "@/lib/categories";

export const metadata: Metadata = { title: "Teacher Dashboard" };

export default async function TeacherDashboardPage() {
  const user = await requireTeacher();
  const memberships = await db.clubMembership.findMany({
    where: { userId: user.id, role: "DIRECTOR", status: "ACTIVE" },
    include: { club: true },
    orderBy: { joinedAt: "asc" },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight text-text-primary">Good day, {user.firstName} 👋</h1>
      <p className="mt-1 text-[15px] text-text-secondary">
        {user.staffApprovalStatus === "PENDING"
          ? "Your account is under review."
          : user.staffApprovalStatus === "REJECTED"
            ? "Your account wasn't approved."
            : memberships.length === 0
              ? "Get started by creating your first club."
              : "Here are the clubs you run."}
      </p>

      {user.staffApprovalStatus === "PENDING" ? (
        <Card className="mt-6">
          <EmptyState
            icon="⏳"
            title="Pending approval"
            description="Your teacher account is waiting on a Platform Admin to approve it — you'll be able to create a club as soon as it's approved."
          />
        </Card>
      ) : user.staffApprovalStatus === "REJECTED" ? (
        <Card className="mt-6">
          <EmptyState
            icon="🚫"
            title="Account not approved"
            description="Your teacher account wasn't approved. If you think this is a mistake, contact your school's ClubSync admin."
          />
        </Card>
      ) : memberships.length === 0 ? (
        <Card className="mt-6">
          <EmptyState
            icon="🏫"
            title="No clubs yet"
            description="Create your first club to get started — you'll be its teacher right away."
            action={
              <LinkButton href="/clubs/new" size="sm">
                Create a Club
              </LinkButton>
            }
          />
        </Card>
      ) : (
        <div className="mt-6 space-y-4">
          {memberships.map((m) => (
            <Link key={m.id} href={`/director/${m.club.id}`}>
              <Card>
                <div className="flex items-center gap-3 p-4">
                  <ClubLogo name={m.club.name} color={m.club.color} logoUrl={m.club.logoUrl} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-text-primary">{m.club.name}</p>
                    <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                      <ColorDot color={m.club.color} />
                      {parseCategories(m.club.category).join(", ")}
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
          <LinkButton href="/clubs/new" variant="secondary" size="sm" className="mt-2">
            + Create Another Club
          </LinkButton>
        </div>
      )}
    </div>
  );
}
