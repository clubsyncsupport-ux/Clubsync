import type { Metadata } from "next";
import { getViewer } from "@/lib/viewer";
import { db } from "@/lib/db";
import { format } from "date-fns";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "Service Hour Report" };

export default async function ServiceHourReportPage() {
  const viewer = await getViewer();
  const records = await db.serviceHourRecord.findMany({
    where: { userId: viewer.id, status: "VERIFIED" },
    include: { club: true, event: true, approvedBy: true },
    orderBy: { createdAt: "asc" },
  });
  const achievements = await db.userAchievement.findMany({ where: { userId: viewer.id }, include: { achievement: true } });

  const totalHours = records.reduce((sum, r) => sum + r.hours, 0);
  const byClub = new Map<string, number>();
  for (const r of records) {
    const name = r.club?.name ?? r.organizationName ?? "Self-reported";
    byClub.set(name, (byClub.get(name) ?? 0) + r.hours);
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 print:px-0 print:py-0">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <a href="/service-hours" className="text-sm text-text-secondary hover:text-text-primary">
          ← Back
        </a>
        <PrintButton />
      </div>

      <div className="rounded-2xl border border-border bg-surface-1 p-10 font-serif print:border-none print:p-0">
        <div className="border-b-2 border-text-primary/80 pb-5 text-center">
          <h1 className="text-2xl font-bold tracking-wide text-text-primary">Verified Service Hour Report</h1>
          <p className="mt-1 text-sm text-text-secondary">{viewer.school?.name}</p>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-text-muted">Student</p>
            <p className="text-text-primary">
              {viewer.firstName} {viewer.lastName}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-text-muted">Grade</p>
            <p className="text-text-primary">{viewer.grade ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-text-muted">Service Hour Goal</p>
            <p className="text-text-primary">{viewer.serviceHourGoal} hours</p>
          </div>
        </div>

        <div className="mt-7 rounded-xl bg-accent-soft p-5 text-center print:border print:border-border print:bg-transparent">
          <p className="text-3xl font-bold text-accent-soft-text print:text-text-primary">{totalHours}</p>
          <p className="text-sm text-accent-soft-text print:text-text-secondary">
            Total Verified Hours · {Math.min(Math.round((totalHours / viewer.serviceHourGoal) * 100), 100)}% of goal
          </p>
        </div>

        <div className="mt-7">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Hours by Club / Organization</h2>
          <table className="mt-2 w-full text-sm">
            <tbody>
              {Array.from(byClub.entries()).map(([name, hours]) => (
                <tr key={name} className="border-b border-border">
                  <td className="py-1.5 text-text-primary">{name}</td>
                  <td className="py-1.5 text-right font-medium text-text-primary">{hours} hrs</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-7">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Verified Event History</h2>
          <table className="mt-2 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-text-muted">
                <th className="py-1.5 font-medium">Date</th>
                <th className="py-1.5 font-medium">Club / Org</th>
                <th className="py-1.5 font-medium">Event / Task</th>
                <th className="py-1.5 text-right font-medium">Hours</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className="border-b border-border align-top">
                  <td className="py-1.5 text-text-secondary">{format(r.createdAt, "MMM d, yyyy")}</td>
                  <td className="py-1.5 text-text-primary">{r.club?.name ?? r.organizationName ?? "Self-reported"}</td>
                  <td className="py-1.5 text-text-primary">
                    {r.event?.title ?? r.taskDescription}
                    {r.eventImpact && <div className="text-xs italic text-text-secondary">{r.eventImpact}</div>}
                  </td>
                  <td className="py-1.5 text-right font-medium text-text-primary">{r.hours}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {achievements.length > 0 && (
          <div className="mt-7">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Achievements</h2>
            <p className="mt-2 text-sm text-text-primary">
              {achievements.map((a) => `${a.achievement.icon} ${a.achievement.title}`).join("   ")}
            </p>
          </div>
        )}

        <div className="mt-9 border-t border-border pt-4 text-xs leading-relaxed text-text-secondary">
          The volunteer and service hours contained within this report have been verified and approved by the respective club
          directors through the ClubSync platform.
        </div>
        <p className="mt-3 text-center text-[11px] text-text-muted">Generated on {format(new Date(), "MMMM d, yyyy")}</p>
      </div>
    </div>
  );
}
