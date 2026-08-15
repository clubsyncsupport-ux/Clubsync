import "server-only";
import { db } from "@/lib/db";

// Colors already claimed by another active club at the same school —
// callers grey these out in the color picker so two clubs at one school
// never end up sharing a color on the calendar.
export async function getTakenColors(schoolId: string, excludeClubId?: string): Promise<string[]> {
  const clubs = await db.club.findMany({
    where: { schoolId, status: "ACTIVE", ...(excludeClubId ? { id: { not: excludeClubId } } : {}) },
    select: { color: true },
  });
  return clubs.map((c) => c.color);
}
