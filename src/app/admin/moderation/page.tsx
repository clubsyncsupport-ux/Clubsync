import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { timeAgo } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Moderation & Audit Log" };

export default async function AdminModerationPage() {
  await requireAdmin();

  const logs = await db.auditLog.findMany({
    include: { actor: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-text-primary">Moderation & Audit Log</h1>
      <p className="mt-1 text-sm text-text-secondary">Every administrative action is recorded here for accountability.</p>

      <div className="mt-5 space-y-2">
        {logs.length === 0 && (
          <Card>
            <EmptyState icon="🛡️" title="No administrative actions yet" description="Every admin action gets logged here for accountability." />
          </Card>
        )}
        {logs.map((log) => (
          <Card key={log.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-text-primary">
                  {log.actor.firstName} {log.actor.lastName} · <span className="font-mono text-xs text-text-secondary">{log.action}</span>
                </p>
                <p className="text-xs text-text-muted">{timeAgo(log.createdAt)}</p>
              </div>
              <p className="mt-1 text-xs text-text-secondary">
                {log.targetType} #{log.targetId.slice(-8)}
                {log.reason && ` · Reason: ${log.reason}`}
              </p>
              {(log.previousValue || log.newValue) && (
                <p className="mt-1 font-mono text-[11px] text-text-muted">
                  {log.previousValue && `before: ${log.previousValue}`} {log.newValue && `after: ${log.newValue}`}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
