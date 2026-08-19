import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireTeacher } from "@/lib/teacher";
import { db } from "@/lib/db";
import { ColorDot } from "@/components/ui/badge";
import { BackButton } from "@/components/ui/back-button";
import { parseCategories } from "@/lib/categories";
import { ReviewActions } from "./review-actions";

export async function generateMetadata({ params }: { params: Promise<{ clubId: string }> }): Promise<Metadata> {
  const { clubId } = await params;
  const club = await db.club.findUnique({ where: { id: clubId }, select: { name: true } });
  return { title: club ? `Review: ${club.name}` : "Review Request" };
}

export default async function SupervisingRequestDetailPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  const teacher = await requireTeacher();

  const club = await db.club.findUnique({ where: { id: clubId }, include: { createdBy: true } });
  if (!club) notFound();
  if (club.pendingSupervisorId !== teacher.id || club.approvalStatus !== "PENDING_SUPERVISOR") {
    redirect("/teacher/supervising-requests");
  }

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
        <BackButton
          fallbackHref="/teacher/supervising-requests"
          className="absolute left-4 top-4 rounded-full bg-black/30 px-3 py-1.5 text-white backdrop-blur-sm hover:bg-black/40 hover:text-white"
        />
      </div>

      <div className="mx-auto max-w-2xl px-4 pb-10">
        <div className="-mt-10 flex items-end gap-4">
          <div
            className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-surface-0 text-2xl font-bold text-white shadow-md"
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
            <div className="mt-0.5 flex items-center gap-1.5 text-sm text-text-secondary">
              <ColorDot color={club.color} />
              {parseCategories(club.category).join(", ")}
            </div>
          </div>
        </div>

        <p className="mt-5 rounded-xl border border-warning/30 bg-warning-soft p-3 text-sm text-warning">
          Requested by {club.createdBy.firstName} {club.createdBy.lastName} ({club.createdBy.email}) — awaiting your review. Not visible to anyone else yet.
        </p>

        <p className="mt-5 text-[15px] leading-relaxed text-text-primary">{club.description}</p>

        {club.meetingSchedule && (
          <p className="mt-4 text-sm text-text-secondary">
            <span className="font-medium text-text-primary">Meets:</span> {club.meetingSchedule}
          </p>
        )}

        <div className="mt-8 border-t border-border pt-6">
          <ReviewActions clubId={club.id} clubName={club.name} />
        </div>
      </div>
    </div>
  );
}
