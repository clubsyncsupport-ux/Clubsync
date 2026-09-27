import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDirectorContext } from "@/lib/director";
import { db } from "@/lib/db";
import { BackButton } from "@/components/ui/back-button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { ApplicationReviewActions } from "./application-review-actions";

export const metadata: Metadata = { title: "Position Applications" };

export default async function PositionDetailPage({ params }: { params: Promise<{ clubId: string; positionId: string }> }) {
  const { clubId, positionId } = await params;
  await getDirectorContext(clubId);

  const position = await db.clubPosition.findUnique({
    where: { id: positionId },
    include: {
      questions: { orderBy: { order: "asc" } },
      applications: {
        include: {
          user: { select: { firstName: true, lastName: true, avatarUrl: true } },
          answers: { include: { question: true } },
        },
        orderBy: { submittedAt: "asc" },
      },
    },
  });
  if (!position || position.clubId !== clubId) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 animate-fade-in">
      <BackButton fallbackHref={`/director/${clubId}/positions`} />
      <h1 className="mt-3 text-2xl font-bold tracking-tight text-text-primary">{position.title}</h1>
      {position.description && <p className="mt-1 text-[15px] text-text-secondary">{position.description}</p>}

      <h2 className="mt-6 mb-3 text-lg font-semibold text-text-primary">
        Applications ({position.applications.length})
      </h2>
      {position.applications.length === 0 ? (
        <Card>
          <CardContent className="p-5 text-sm text-text-muted">No applications yet.</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {position.applications.map((app) => (
            <Card key={app.id}>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Avatar firstName={app.user.firstName} lastName={app.user.lastName} src={app.user.avatarUrl} size="sm" />
                    <span className="font-medium text-text-primary">
                      {app.user.firstName} {app.user.lastName}
                    </span>
                  </div>
                  <Badge tone={app.status === "ACCEPTED" ? "success" : app.status === "REJECTED" ? "danger" : "warning"}>
                    {app.status === "PENDING" ? "Pending" : app.status === "ACCEPTED" ? "Accepted" : "Rejected"}
                  </Badge>
                </div>
                {app.answers.map((a) => (
                  <div key={a.id}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{a.question.prompt}</p>
                    <p className="mt-0.5 whitespace-pre-wrap text-sm text-text-primary">{a.body}</p>
                  </div>
                ))}
                {app.fileUrl && (
                  <a href={app.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-block text-xs font-medium text-accent underline">
                    📎 View uploaded file
                  </a>
                )}
                {app.status === "PENDING" && <ApplicationReviewActions applicationId={app.id} />}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
