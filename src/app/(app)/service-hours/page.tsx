import type { Metadata } from "next";
import Link from "next/link";
import { getViewer, requireStudentViewer } from "@/lib/viewer";
import { db } from "@/lib/db";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, ColorDot } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateShort } from "@/lib/format";
import { ACHIEVEMENT_DEFS } from "@/lib/achievements";
import { ReportHoursForm } from "./report-hours-form";
import { CertificateGoalPicker } from "./certificate-goal-picker";

export const metadata: Metadata = { title: "Service Hours" };

export default async function ServiceHoursPage() {
  const viewer = requireStudentViewer(await getViewer());

  const [verifiedRecords, pendingSelfReported, byClub, achievements] = await Promise.all([
    db.serviceHourRecord.findMany({
      where: { userId: viewer.id, status: "VERIFIED" },
      include: { club: true, event: true, approvedBy: true },
      orderBy: { createdAt: "desc" },
    }),
    db.serviceHourRecord.findMany({
      where: { userId: viewer.id, selfReported: true, status: { in: ["PENDING", "REJECTED"] } },
      orderBy: { createdAt: "desc" },
    }),
    db.serviceHourRecord.groupBy({
      by: ["clubId"],
      where: { userId: viewer.id, status: "VERIFIED", clubId: { not: null } },
      _sum: { hours: true },
    }),
    db.userAchievement.findMany({ where: { userId: viewer.id }, include: { achievement: true }, orderBy: { unlockedAt: "desc" } }),
  ]);

  const totalHours = verifiedRecords.reduce((sum, r) => sum + r.hours, 0);
  const clubIds = byClub.map((b) => b.clubId).filter((id): id is string => id !== null);
  const clubs = await db.club.findMany({ where: { id: { in: clubIds } } });
  const clubMap = new Map(clubs.map((c) => [c.id, c]));

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">My Service Hours</h1>
        <Link href="/service-hours/report" className="text-sm font-medium text-accent">
          Generate Report →
        </Link>
      </div>

      <Card className="mt-5">
        <CardContent className="flex flex-col items-center p-6">
          <ProgressRing value={Math.round(totalHours * 10) / 10} goal={viewer.serviceHourGoal} />
          <div className="mt-4 grid w-full grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-lg font-bold text-text-primary">{viewer.serviceHourGoal}</p>
              <p className="text-xs text-text-muted">Goal</p>
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">{Math.round(totalHours * 10) / 10}</p>
              <p className="text-xs text-text-muted">Completed</p>
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">{Math.max(Math.round((viewer.serviceHourGoal - totalHours) * 10) / 10, 0)}</p>
              <p className="text-xs text-text-muted">Remaining</p>
            </div>
          </div>
          <Link href="/settings#service-hours" className="mt-3 text-xs font-medium text-accent">
            Change goal
          </Link>
        </CardContent>
      </Card>

      <CertificateGoalPicker current={viewer.serviceHourGoal} />

      {byClub.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-text-muted">Hours by Club</h2>
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {byClub
                .sort((a, b) => (b._sum.hours ?? 0) - (a._sum.hours ?? 0))
                .map((b) => {
                  const club = b.clubId ? clubMap.get(b.clubId) : undefined;
                  if (!club) return null;
                  return (
                    <div key={b.clubId ?? club.id} className="flex items-center gap-3 px-4 py-3">
                      <ColorDot color={club.color} />
                      <span className="flex-1 text-sm font-medium text-text-primary">{club.name}</span>
                      <span className="text-sm font-semibold text-text-secondary">{b._sum.hours} hrs</span>
                    </div>
                  );
                })}
            </CardContent>
          </Card>
        </div>
      )}

      {achievements.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-text-muted">Achievements</h2>
          <div className="flex flex-wrap gap-2">
            {achievements.map((a) => (
              <Badge key={a.id} tone="accent" className="py-1.5 text-[13px]">
                {a.achievement.icon} {a.achievement.title}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Report Outside Volunteering</h2>
        <ReportHoursForm />
        {pendingSelfReported.length > 0 && (
          <div className="space-y-2">
            {pendingSelfReported.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                        <ColorDot color="#6b7280" />
                        {r.organizationName} · {r.performedAt ? formatDateShort(r.performedAt) : formatDateShort(r.createdAt)}
                      </div>
                      <p className="mt-0.5 font-semibold text-text-primary">{r.taskDescription ?? "Service Hours"}</p>
                    </div>
                    <Badge tone={r.status === "REJECTED" ? "danger" : "warning"} className="shrink-0">
                      {r.hours} hrs
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-text-muted">
                    {r.status === "REJECTED" ? "✕ Not verified" : "⏳ Pending admin verification"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-text-muted">History</h2>
        {verifiedRecords.length === 0 ? (
          <Card>
            <EmptyState icon="⏱" title="No verified hours yet" description="Attend a volunteer event and your club director will verify your hours here." />
          </Card>
        ) : (
          <div className="space-y-2">
            {verifiedRecords.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                        <ColorDot color={r.club?.color ?? "#6b7280"} />
                        {r.club?.name ?? r.organizationName ?? "Self-reported"} · {formatDateShort(r.createdAt)}
                      </div>
                      <p className="mt-0.5 font-semibold text-text-primary">{r.event?.title ?? r.taskDescription ?? "Service Hours"}</p>
                      {r.taskDescription && r.event && <p className="text-sm text-text-secondary">{r.taskDescription}</p>}
                      {r.eventImpact && <p className="mt-1 text-sm italic text-text-secondary">&ldquo;{r.eventImpact}&rdquo;</p>}
                    </div>
                    <Badge tone="success" className="shrink-0">
                      {r.hours} hrs
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-text-muted">
                    {r.selfReported ? "📝 Self-reported" : `✓ Verified${r.approvedBy ? ` by ${r.approvedBy.firstName} ${r.approvedBy.lastName}` : ""}`}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <p className="mt-8 text-center text-xs text-text-muted">Available milestones: {ACHIEVEMENT_DEFS.map((a) => a.icon).join(" ")}</p>
    </div>
  );
}
