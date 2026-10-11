import type { Metadata } from "next";
import { getSchoolAdminContext } from "@/lib/school-admin";
import { db } from "@/lib/db";
import { CoverageBoard } from "@/components/coverage/coverage-board";

export const metadata: Metadata = { title: "Staffing Board" };

export default async function SchoolCoveragePage({ params, searchParams }: { params: Promise<{ schoolId: string }>; searchParams: Promise<{ days?: string }> }) {
  const { schoolId } = await params;
  const { days: rawDays } = await searchParams;
  const days = [7, 14, 30].includes(Number(rawDays)) ? Number(rawDays) : 7;
  await getSchoolAdminContext(schoolId);
  const clubs = await db.club.findMany({ where: { schoolId, status: "ACTIVE" }, select: { id: true } });

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight text-text-primary">Staffing Board</h1>
      <p className="mt-1 mb-5 text-[15px] text-text-secondary">Every upcoming event at the school and who&rsquo;s still missing.</p>
      <CoverageBoard
        clubIds={clubs.map((c) => c.id)}
        days={days}
        showClub
        eventHref={(e) => `/events/${e.id}`}
        rangeHref={(d) => `/school-admin/${schoolId}/coverage?days=${d}`}
      />
    </div>
  );
}
