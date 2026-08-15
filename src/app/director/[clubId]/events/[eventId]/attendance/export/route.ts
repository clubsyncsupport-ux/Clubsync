import { getDirectorContext } from "@/lib/director";
import { db } from "@/lib/db";
import { format } from "date-fns";

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export async function GET(_req: Request, { params }: { params: Promise<{ clubId: string; eventId: string }> }) {
  const { clubId, eventId } = await params;
  await getDirectorContext(clubId);

  const event = await db.event.findUnique({
    where: { id: eventId },
    include: {
      registrations: {
        where: { status: { in: ["REGISTERED", "WAITLISTED", "ATTENDED", "NO_SHOW"] } },
        include: { user: true },
        orderBy: { user: { firstName: "asc" } },
      },
    },
  });
  if (!event || event.clubId !== clubId) return new Response("Not found", { status: 404 });

  const hoursRecords = await db.serviceHourRecord.findMany({ where: { eventId } });
  const hoursByUserId = new Map(hoursRecords.map((h) => [h.userId, h.hours]));

  const header = ["Student", "Grade", "Attended", "Hours", "Notes"];
  const rows = event.registrations.map((r) => [
    `${r.user.firstName} ${r.user.lastName}`,
    r.user.grade ?? "",
    r.status === "ATTENDED" ? "Yes" : r.status === "NO_SHOW" ? "No" : "—",
    r.status === "ATTENDED" ? String(hoursByUserId.get(r.userId) ?? "") : "",
    r.attendanceNote ?? "",
  ]);

  const csv = [header, ...rows].map((row) => row.map((cell) => csvEscape(String(cell))).join(",")).join("\n");
  const filename = `${event.title.replace(/[^a-z0-9]+/gi, "-")}-attendance-${format(event.startAt, "yyyy-MM-dd")}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
