// One-off: give every existing club its General and Announcements channels and
// put its active members in them. Safe to re-run — it only fills gaps.
//
//   npx tsx prisma/backfill-default-channels.ts          # preview
//   npx tsx prisma/backfill-default-channels.ts --apply  # do it
import { PrismaClient } from "@prisma/client";
import { ensureDefaultChannels } from "../src/lib/default-channels";

const db = new PrismaClient();

async function main() {
  const apply = process.argv.includes("--apply");
  const clubs = await db.club.findMany({
    where: { status: { not: "MERGED" } },
    select: { id: true, name: true, school: { select: { name: true } }, channels: { where: { name: { in: ["General", "Announcements"] } }, select: { name: true } } },
  });

  const needing = clubs.filter((c) => c.channels.length < 2);
  console.log(`${clubs.length} clubs; ${needing.length} missing at least one default channel.`);
  for (const c of clubs) console.log(`  ${c.school.name} — ${c.name}: has ${c.channels.map((x) => x.name).join(", ") || "neither"}`);
  if (!apply) {
    console.log("\nPreview only. Re-run with --apply to create them.");
    return;
  }

  for (const c of clubs) await ensureDefaultChannels(c.id);
  console.log("\nDone.");
}

main().finally(() => db.$disconnect());
