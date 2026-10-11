import type { Metadata } from "next";
import { getDirectorContext } from "@/lib/director";
import { BackButton } from "@/components/ui/back-button";
import { CoverageBoard } from "@/components/coverage/coverage-board";

export const metadata: Metadata = { title: "Staffing Board" };

export default async function ClubCoveragePage({ params, searchParams }: { params: Promise<{ clubId: string }>; searchParams: Promise<{ days?: string }> }) {
  const { clubId } = await params;
  const { days: rawDays } = await searchParams;
  const days = [7, 14, 30].includes(Number(rawDays)) ? Number(rawDays) : 7;
  await getDirectorContext(clubId);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 animate-fade-in">
      <BackButton fallbackHref={`/director/${clubId}/events`} />
      <h1 className="mt-3 text-2xl font-bold tracking-tight text-text-primary">Staffing Board</h1>
      <p className="mt-1 mb-5 text-[15px] text-text-secondary">Upcoming events and which roles still need people.</p>
      <CoverageBoard
        clubIds={[clubId]}
        days={days}
        showClub={false}
        eventHref={(e) => `/director/${clubId}/events/${e.id}`}
        rangeHref={(d) => `/director/${clubId}/coverage?days=${d}`}
      />
    </div>
  );
}
