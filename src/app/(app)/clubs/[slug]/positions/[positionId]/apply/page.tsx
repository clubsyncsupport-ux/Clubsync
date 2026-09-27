import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getViewer } from "@/lib/viewer";
import { db } from "@/lib/db";
import { BackButton } from "@/components/ui/back-button";
import { ApplicationForm } from "./application-form";

export const metadata: Metadata = { title: "Apply" };

export default async function ApplyPage({ params }: { params: Promise<{ slug: string; positionId: string }> }) {
  const { slug, positionId } = await params;
  const viewer = await getViewer();

  const position = await db.clubPosition.findUnique({
    where: { id: positionId },
    include: { club: true, questions: { orderBy: { order: "asc" } } },
  });
  if (!position || position.club.slug !== slug) notFound();
  if (position.status !== "OPEN") notFound();

  const membership = await db.clubMembership.findUnique({ where: { userId_clubId: { userId: viewer.id, clubId: position.clubId } } });
  if (!membership || membership.status !== "ACTIVE") notFound();

  const existing = await db.positionApplication.findUnique({ where: { positionId_userId: { positionId, userId: viewer.id } } });
  if (existing) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 animate-fade-in">
      <BackButton fallbackHref={`/clubs/${slug}`} />
      <h1 className="mt-3 text-2xl font-bold tracking-tight text-text-primary">Apply — {position.title}</h1>
      {position.description && <p className="mt-1 text-[15px] text-text-secondary">{position.description}</p>}
      <ApplicationForm
        positionId={position.id}
        allowFileUpload={position.allowFileUpload}
        questions={position.questions.map((q) => ({ id: q.id, prompt: q.prompt, wordLimit: q.wordLimit }))}
      />
    </div>
  );
}
