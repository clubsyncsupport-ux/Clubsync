import { db } from "@/lib/db";

export const ACHIEVEMENT_DEFS = [
  { key: "first_club_joined", title: "First Club Joined", description: "Joined your first club.", icon: "🎉" },
  { key: "first_volunteer_event", title: "First Volunteer Event", description: "Completed your first verified volunteer event.", icon: "🤝" },
  { key: "10_hours", title: "10 Service Hours", description: "Earned 10 verified service hours.", icon: "⭐" },
  { key: "50_hours", title: "50 Service Hours", description: "Earned 50 verified service hours.", icon: "🌱" },
  { key: "100_hours", title: "100 Service Hours", description: "Earned 100 verified service hours.", icon: "💙" },
  { key: "10_events", title: "10 Club Events", description: "Attended 10 club events.", icon: "🏅" },
  { key: "community_impact", title: "Community Impact", description: "Contributed to 5 different clubs' events.", icon: "🌍" },
] as const;

// Re-evaluates milestone achievements for a user after a state change
// (joining a club, having service hours verified, attending an event) and
// unlocks any newly-earned ones. Cheap enough to call inline after mutations
// rather than running on a schedule.
export async function checkAndUnlockAchievements(userId: string) {
  const [membershipCount, hoursAgg, attendedCount, distinctClubs] = await Promise.all([
    db.clubMembership.count({ where: { userId, status: "ACTIVE" } }),
    db.serviceHourRecord.aggregate({ where: { userId, status: "VERIFIED" }, _sum: { hours: true }, _count: true }),
    db.eventRegistration.count({ where: { userId, status: "ATTENDED" } }),
    db.serviceHourRecord.findMany({ where: { userId, status: "VERIFIED" }, distinct: ["clubId"], select: { clubId: true } }),
  ]);

  const totalHours = hoursAgg._sum.hours ?? 0;
  const toUnlock: string[] = [];

  if (membershipCount >= 1) toUnlock.push("first_club_joined");
  if (hoursAgg._count >= 1) toUnlock.push("first_volunteer_event");
  if (totalHours >= 10) toUnlock.push("10_hours");
  if (totalHours >= 50) toUnlock.push("50_hours");
  if (totalHours >= 100) toUnlock.push("100_hours");
  if (attendedCount >= 10) toUnlock.push("10_events");
  if (distinctClubs.length >= 5) toUnlock.push("community_impact");

  if (toUnlock.length === 0) return;

  const defs = await db.achievement.findMany({ where: { key: { in: toUnlock } } });
  const already = await db.userAchievement.findMany({ where: { userId, achievementId: { in: defs.map((d) => d.id) } } });
  const alreadyIds = new Set(already.map((a) => a.achievementId));

  const newOnes = defs.filter((d) => !alreadyIds.has(d.id));
  if (newOnes.length === 0) return;

  await db.userAchievement.createMany({
    data: newOnes.map((d) => ({ userId, achievementId: d.id })),
  });
  await db.notification.createMany({
    data: newOnes.map((d) => ({
      userId,
      type: "ACHIEVEMENT" as const,
      title: `Achievement unlocked: ${d.title}`,
      body: d.description,
      linkUrl: "/service-hours",
    })),
  });
}
