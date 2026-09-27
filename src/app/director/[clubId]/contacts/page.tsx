import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDirectorContext } from "@/lib/director";
import { db } from "@/lib/db";
import { ManageContacts } from "./manage-contacts";

export const metadata: Metadata = { title: "Contacts" };

export default async function DirectorContactsPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  const { isDirector } = await getDirectorContext(clubId);
  if (!isDirector) notFound();

  const contacts = await db.clubContact.findMany({
    where: { clubId },
    select: { id: true, name: true, phone: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight text-text-primary">Contacts</h1>
      <p className="mt-1 text-[15px] text-text-secondary">
        Saved student-contact phone numbers for event proposals. As the Sponsor Teacher, you can see every number here — anyone
        else filling out a proposal only sees names, and can reveal one selected contact&rsquo;s number at a time.
      </p>
      <ManageContacts clubId={clubId} contacts={contacts} />
    </div>
  );
}
