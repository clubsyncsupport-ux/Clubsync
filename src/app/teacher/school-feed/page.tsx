import type { Metadata } from "next";
import { requireTeacher } from "@/lib/teacher";
import { SchoolFeedView } from "@/components/school-feed/school-feed-view";

export const metadata: Metadata = { title: "School Announcements" };

export default async function TeacherSchoolFeedPage() {
  const user = await requireTeacher();
  return <SchoolFeedView schoolId={user.schoolId!} viewer={user} />;
}
