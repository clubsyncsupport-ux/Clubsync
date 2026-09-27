import type { Metadata } from "next";
import { getDirectorContext } from "@/lib/director";
import { db } from "@/lib/db";
import { schoolYearFor } from "@/lib/school-year";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RegistrationForm } from "./registration-form";

export const metadata: Metadata = { title: "Registration" };

export default async function ClubRegistrationPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  await getDirectorContext(clubId);

  const schoolYear = schoolYearFor(new Date());
  const [current, prior] = await Promise.all([
    db.clubRegistration.findUnique({ where: { clubId_schoolYear: { clubId, schoolYear } } }),
    db.clubRegistration.findFirst({ where: { clubId, schoolYear: { not: schoolYear } }, orderBy: { schoolYear: "desc" } }),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight text-text-primary">Club Registration</h1>
      <p className="mt-1 text-[15px] text-text-secondary">Resubmitted at the start of every school year — currently {schoolYear}.</p>

      {current ? (
        <Card className="mt-5">
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center gap-2">
              <Badge
                tone={current.status === "APPROVED" ? "success" : current.status === "REJECTED" ? "danger" : "warning"}
              >
                {current.status === "PENDING_SPONSOR"
                  ? "Awaiting sponsor approval"
                  : current.status === "PENDING_ADMIN"
                    ? "Awaiting administrator approval"
                    : current.status === "APPROVED"
                      ? "Approved"
                      : "Not approved"}
              </Badge>
            </div>
            {current.rejectionReason && <p className="text-sm text-text-primary">{current.rejectionReason}</p>}
            {(current.sponsorApprovedAt || current.adminApprovedAt) && (
              <a
                href={`/api/registrations/${current.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-sm font-medium text-accent underline"
              >
                📄 Download signed PDF
              </a>
            )}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Description</p>
              <p className="text-sm text-text-primary">{current.description}</p>
            </div>
            {current.meetingSchedule && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Meeting schedule</p>
                <p className="text-sm text-text-primary">{current.meetingSchedule}</p>
              </div>
            )}
            {current.meetingLocation && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Meeting location</p>
                <p className="text-sm text-text-primary">{current.meetingLocation}</p>
              </div>
            )}
            {current.fundraisingGuidelines && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Fundraising guidelines</p>
                <p className="text-sm text-text-primary">{current.fundraisingGuidelines}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <RegistrationForm
          clubId={clubId}
          prefill={
            prior
              ? {
                  description: prior.description,
                  meetingSchedule: prior.meetingSchedule ?? "",
                  meetingLocation: prior.meetingLocation ?? "",
                  fundraisingGuidelines: prior.fundraisingGuidelines ?? "",
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
