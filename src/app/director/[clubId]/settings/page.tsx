import type { Metadata } from "next";
import { getDirectorContext } from "@/lib/director";
import { db } from "@/lib/db";
import { getTakenColors } from "@/lib/data/club-colors";
import { ClubSettingsForm } from "./club-settings-form";
import { DangerZone } from "./danger-zone";
import { schoolGradeLevels } from "@/lib/grades";

export const metadata: Metadata = { title: "Club Settings" };

export default async function DirectorSettingsPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  const { isDirector } = await getDirectorContext(clubId);
  const club = await db.club.findUniqueOrThrow({ where: { id: clubId }, include: { school: true } });
  const takenColors = await getTakenColors(club.schoolId, club.id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight text-text-primary">Club Settings</h1>
      <ClubSettingsForm club={club} takenColors={takenColors} gradeLevels={schoolGradeLevels(club.school)} />
      {isDirector && <DangerZone clubId={club.id} clubName={club.name} isArchived={club.status === "ARCHIVED"} />}
    </div>
  );
}
