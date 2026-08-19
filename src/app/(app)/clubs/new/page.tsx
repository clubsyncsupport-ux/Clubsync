import type { Metadata } from "next";
import { getViewer } from "@/lib/viewer";
import { getTakenColors } from "@/lib/data/club-colors";
import { db } from "@/lib/db";
import { BackButton } from "@/components/ui/back-button";
import { CreateClubForm } from "./create-club-form";

export const metadata: Metadata = { title: "Create a Club" };

export default async function NewClubPage() {
  const viewer = await getViewer();
  const isStudentCreator = viewer.accountKind !== "STAFF";
  const [takenColors, teachers] = await Promise.all([
    viewer.schoolId ? getTakenColors(viewer.schoolId) : Promise.resolve([]),
    isStudentCreator && viewer.schoolId
      ? db.user.findMany({
          where: { schoolId: viewer.schoolId, accountKind: "STAFF" },
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
          orderBy: { firstName: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto max-w-lg px-4 py-6 animate-fade-in">
      <BackButton fallbackHref="/home" />
      <h1 className="mt-3 text-2xl font-bold tracking-tight text-text-primary">Create a Club</h1>
      <p className="mt-1 text-[15px] text-text-secondary">
        {isStudentCreator
          ? "Pick a teacher to supervise it — your club goes live once they approve."
          : "No approval needed — you'll be the club owner immediately."}
      </p>
      <CreateClubForm takenColors={takenColors} teachers={teachers} />
    </div>
  );
}
