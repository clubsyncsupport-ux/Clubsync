import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { isSchoolAdminTier } from "@/lib/constants";
import { ClubRegistrationPdf } from "@/lib/pdf/club-registration-pdf";

// react-pdf needs real Node APIs (fs, streams) to load the registered font
// file — this route can't run on the Edge runtime.
export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authUser = await getCurrentUser();
  if (!authUser) return new NextResponse("Not authenticated.", { status: 401 });

  const registration = await db.clubRegistration.findUnique({
    where: { id },
    include: {
      club: true,
      sponsorApprovedBy: { select: { firstName: true, lastName: true } },
      adminApprovedBy: { select: { firstName: true, lastName: true } },
    },
  });
  if (!registration) return new NextResponse("Not found.", { status: 404 });

  const [me, membership] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: authUser.id } }),
    db.clubMembership.findUnique({ where: { userId_clubId: { userId: authUser.id, clubId: registration.clubId } } }),
  ]);
  const isClubLeadership = membership && ["OFFICER", "SUPER_ADMIN", "DIRECTOR"].includes(membership.role);
  const isSchoolOversight = me.platformRole === "PLATFORM_ADMIN" || (isSchoolAdminTier(me.platformRole) && me.schoolAdminOfId === registration.club.schoolId);
  if (!isClubLeadership && !isSchoolOversight) return new NextResponse("Not authorized.", { status: 403 });

  const buffer = await renderToBuffer(
    ClubRegistrationPdf({
      clubName: registration.club.name,
      schoolYear: registration.schoolYear,
      description: registration.description,
      meetingSchedule: registration.meetingSchedule,
      meetingLocation: registration.meetingLocation,
      fundraisingGuidelines: registration.fundraisingGuidelines,
      status: registration.status,
      sponsorName: registration.sponsorApprovedBy ? `${registration.sponsorApprovedBy.firstName} ${registration.sponsorApprovedBy.lastName}` : null,
      sponsorSignedAt: registration.sponsorApprovedAt,
      adminName: registration.adminApprovedBy ? `${registration.adminApprovedBy.firstName} ${registration.adminApprovedBy.lastName}` : null,
      adminSignedAt: registration.adminApprovedAt,
      generatedAt: new Date(),
    })
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${registration.club.name.replace(/[^a-z0-9]+/gi, "-")}-${registration.schoolYear}-registration.pdf"`,
    },
  });
}
