// One-off backfill: "Fundraiser" used to be an Event category; it's now the
// independent Event.isFundraiser flag instead (a bake sale can be a Social
// event too). Run once with `npx tsx prisma/backfill-fundraiser-category.ts`
// against whatever database still has old "Fundraiser"-category rows.
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const result = await db.event.updateMany({
    where: { category: "Fundraiser" },
    data: { isFundraiser: true, category: "Community Event" },
  });
  console.log(`Backfilled ${result.count} event(s): category "Fundraiser" -> "Community Event", isFundraiser = true.`);
}

main().finally(() => db.$disconnect());
