import type { Metadata } from "next";
import { getViewer } from "@/lib/viewer";
import { SchoolFeedView } from "@/components/school-feed/school-feed-view";

export const metadata: Metadata = { title: "School Announcements" };

export default async function SchoolFeedPage() {
  const viewer = await getViewer();
  return <SchoolFeedView schoolId={viewer.schoolId!} viewer={viewer} />;
}
