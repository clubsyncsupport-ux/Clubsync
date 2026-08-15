import { db } from "@/lib/db";

export async function getVisibleEvents(userId: string, clubIds: string[], start: Date, end: Date) {
  return db.event.findMany({
    where: {
      status: { not: "CANCELLED" },
      startAt: { gte: start, lte: end },
      club: { id: { in: clubIds } },
      OR: [{ visibility: "PUBLIC" }, { visibility: "PRIVATE", invites: { some: { userId } } }],
    },
    include: {
      club: true,
      _count: { select: { registrations: { where: { status: "REGISTERED" } } } },
    },
    orderBy: { startAt: "asc" },
  });
}
