import "server-only";
import { db } from "@/lib/db";
import type { SavedRole } from "@/app/actions/role-templates";

// The roles a club has saved for reuse. Only ever called from pages that have
// already confirmed the viewer runs the club (it's deliberately not exported
// from the "use server" actions file, where it'd be callable from a browser).
export async function getSavedRoles(clubId: string): Promise<SavedRole[]> {
  return db.clubRoleTemplate.findMany({
    where: { clubId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, capacity: true, allowedGrades: true, waitlistCapacity: true, payCents: true, payNote: true },
  });
}
