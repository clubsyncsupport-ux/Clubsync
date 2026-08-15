import type { Metadata } from "next";
import { getViewer } from "@/lib/viewer";
import { getTakenColors } from "@/lib/data/club-colors";
import { BackButton } from "@/components/ui/back-button";
import { CreateClubForm } from "./create-club-form";

export const metadata: Metadata = { title: "Create a Club" };

export default async function NewClubPage() {
  const viewer = await getViewer();
  const takenColors = viewer.schoolId ? await getTakenColors(viewer.schoolId) : [];

  return (
    <div className="mx-auto max-w-lg px-4 py-6 animate-fade-in">
      <BackButton fallbackHref="/home" />
      <h1 className="mt-3 text-2xl font-bold tracking-tight text-text-primary">Create a Club</h1>
      <p className="mt-1 text-[15px] text-text-secondary">No approval needed — you&rsquo;ll be the club owner immediately.</p>
      <CreateClubForm takenColors={takenColors} />
    </div>
  );
}
