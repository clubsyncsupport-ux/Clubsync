import type { Metadata } from "next";
import { getSchoolAdminContext } from "@/lib/school-admin";
import { db } from "@/lib/db";
import { SchoolFeedView } from "@/components/school-feed/school-feed-view";

export const metadata: Metadata = { title: "School Announcements" };

export default async function SchoolAdminSchoolFeedPage({ params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params;
  const { user } = await getSchoolAdminContext(schoolId);
  const me = await db.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { id: true, accountKind: true, platformRole: true, schoolId: true, schoolAdminOfId: true, staffApprovalStatus: true },
  });
  return <SchoolFeedView schoolId={schoolId} viewer={me} />;
}
