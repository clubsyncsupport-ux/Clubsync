import type { Metadata } from "next";
import { requireTeacher } from "@/lib/teacher";
import { db } from "@/lib/db";
import { CoverageBoard } from "@/components/coverage/coverage-board";

export const metadata: Metadata = { title: "Staffing Board" };

export default async function TeacherCoveragePage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { days: rawDays } = await searchParams;
  const days = [7, 14, 30].includes(Number(rawDays)) ? Number(rawDays) : 7;
  const user = await requireTeacher();
  const memberships = await db.clubMembership.findMany({
    where: { userId: user.id, status: "ACTIVE", role: { in: ["DIRECTOR", "OFFICER", "SUPER_ADMIN"] } },
    select: { clubId: true },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight text-text-primary">Staffing Board</h1>
      <p className="mt-1 mb-5 text-[15px] text-text-secondary">Every upcoming event across your clubs and who&rsquo;s still missing.</p>
      <CoverageBoard
        clubIds={memberships.map((m) => m.clubId)}
        days={days}
        showClub={memberships.length > 1}
        eventHref={(e) => `/director/${e.clubId}/events/${e.id}`}
        rangeHref={(d) => `/teacher/coverage?days=${d}`}
      />
    </div>
  );
}
