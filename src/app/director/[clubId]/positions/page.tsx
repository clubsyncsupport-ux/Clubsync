import type { Metadata } from "next";
import Link from "next/link";
import { getDirectorContext } from "@/lib/director";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { NewPositionForm } from "./new-position-form";
import { PositionRowActions } from "./position-row-actions";

export const metadata: Metadata = { title: "Positions" };

export default async function DirectorPositionsPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  await getDirectorContext(clubId);

  const positions = await db.clubPosition.findMany({
    where: { clubId },
    include: { _count: { select: { applications: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight text-text-primary">Positions</h1>
      <p className="mt-1 text-[15px] text-text-secondary">
        Open positions like Vice President or Treasurer for members to apply to — separate from event registration.
      </p>

      {positions.length === 0 ? (
        <Card className="mt-5">
          <EmptyState icon="🗳️" title="No positions yet" description="Create one below to start collecting applications." />
        </Card>
      ) : (
        <div className="mt-5 space-y-2">
          {positions.map((p) => (
            <Card key={p.id}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <Link href={`/director/${clubId}/positions/${p.id}`} className="truncate font-medium text-text-primary hover:underline">
                    {p.title}
                  </Link>
                  <p className="text-xs text-text-muted">
                    {p._count.applications} application{p._count.applications === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={p.status === "OPEN" ? "success" : "neutral"}>{p.status === "OPEN" ? "Open" : "Closed"}</Badge>
                  <PositionRowActions positionId={p.id} status={p.status as "OPEN" | "CLOSED"} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <NewPositionForm clubId={clubId} />
    </div>
  );
}
