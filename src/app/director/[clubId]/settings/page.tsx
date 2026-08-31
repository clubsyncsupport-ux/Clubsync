import type { Metadata } from "next";
import { getDirectorContext } from "@/lib/director";
import { db } from "@/lib/db";
import { getTakenColors } from "@/lib/data/club-colors";
import { ClubSettingsForm } from "./club-settings-form";
import { DangerZone } from "./danger-zone";

export const metadata: Metadata = { title: "Club Settings" };

export default async function DirectorSettingsPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  const { isDirector } = await getDirectorContext(clubId);
  const club = await db.club.findUniqueOrThrow({ where: { id: clubId } });
  const takenColors = await getTakenColors(club.schoolId, club.id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight text-text-primary">Club Settings</h1>
      <ClubSettingsForm club={club} takenColors={takenColors} />
      {isDirector && <DangerZone clubId={club.id} clubName={club.name} isArchived={club.status === "ARCHIVED"} />}
    </div>
  );
}
