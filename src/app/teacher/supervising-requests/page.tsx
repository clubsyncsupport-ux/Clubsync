import type { Metadata } from "next";
import Link from "next/link";
import { requireTeacher } from "@/lib/teacher";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { ColorDot } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ClubLogo } from "@/components/club-logo";
import { parseCategories } from "@/lib/categories";

export const metadata: Metadata = { title: "Supervising Requests" };

export default async function SupervisingRequestsPage() {
  const teacher = await requireTeacher();
  const requests = await db.club.findMany({
    where: { pendingSupervisorId: teacher.id, approvalStatus: "PENDING_SUPERVISOR" },
    include: { createdBy: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight text-text-primary">Supervising Requests</h1>
      <p className="mt-1 text-[15px] text-text-secondary">Students asking you to supervise a club they started.</p>

      {requests.length === 0 ? (
        <Card className="mt-6">
          <EmptyState icon="📭" title="Nothing waiting on you" description="New club requests will show up here." />
        </Card>
      ) : (
        <div className="mt-6 space-y-2">
          {requests.map((club) => (
            <Link key={club.id} href={`/teacher/supervising-requests/${club.id}`}>
              <Card>
                <div className="flex items-center gap-3 p-4">
                  <ClubLogo name={club.name} color={club.color} logoUrl={club.logoUrl} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-text-primary">{club.name}</p>
                    <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                      <ColorDot color={club.color} />
                      {parseCategories(club.category).join(", ")}
                    </div>
                    <p className="mt-0.5 text-xs text-text-muted">
                      Requested by {club.createdBy.firstName} {club.createdBy.lastName}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
