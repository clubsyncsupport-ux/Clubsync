// Seeds ClubSync with a realistic starter dataset: one school, a handful of
// clubs with directors and members, past + upcoming events, verified service
// hours, and one Platform Administrator account (public signup can never
// create one, so this is the only way to reach /admin).
//
// Safe to re-run: everything is upserted by its unique key.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, addHours } from "date-fns";

const db = new PrismaClient();

const PASSWORD = "clubsync123";

const ACHIEVEMENT_DEFS = [
  { key: "first_club_joined", title: "First Club Joined", description: "Joined your first club.", icon: "🎉" },
  { key: "first_volunteer_event", title: "First Volunteer Event", description: "Completed your first verified volunteer event.", icon: "🤝" },
  { key: "10_hours", title: "10 Service Hours", description: "Earned 10 verified service hours.", icon: "⭐" },
  { key: "50_hours", title: "50 Service Hours", description: "Earned 50 verified service hours.", icon: "🌱" },
  { key: "100_hours", title: "100 Service Hours", description: "Earned 100 verified service hours.", icon: "💙" },
  { key: "10_events", title: "10 Club Events", description: "Attended 10 club events.", icon: "🏅" },
  { key: "community_impact", title: "Community Impact", description: "Contributed to 5 different clubs' events.", icon: "🌍" },
];

async function upsertUser(input: {
  email: string;
  firstName: string;
  lastName: string;
  grade: string;
  schoolId: string;
  platformRole?: "STUDENT" | "PLATFORM_ADMIN";
  serviceHourGoal?: number;
}) {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  return db.user.upsert({
    where: { email: input.email },
    update: {},
    create: {
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      grade: input.grade,
      schoolId: input.schoolId,
      platformRole: input.platformRole ?? "STUDENT",
      serviceHourGoal: input.serviceHourGoal ?? 50,
    },
  });
}

async function ensureMembership(userId: string, clubId: string, role: "MEMBER" | "OFFICER" | "DIRECTOR" = "MEMBER") {
  await db.clubMembership.upsert({
    where: { userId_clubId: { userId, clubId } },
    update: {},
    create: { userId, clubId, role, status: "ACTIVE" },
  });
}

async function main() {
  console.log("Seeding ClubSync…");

  const school = await db.school.upsert({
    where: { name: "Hugh Boyd Secondary School" },
    update: {},
    create: { name: "Hugh Boyd Secondary School", city: "Richmond", region: "BC", country: "Canada" },
  });

  for (const def of ACHIEVEMENT_DEFS) {
    await db.achievement.upsert({ where: { key: def.key }, update: def, create: def });
  }

  const admin = await upsertUser({
    email: "admin@clubsync.dev",
    firstName: "Platform",
    lastName: "Admin",
    grade: "University / Other",
    schoolId: school.id,
    platformRole: "PLATFORM_ADMIN",
  });

  const maya = await upsertUser({ email: "maya.chen@clubsync.dev", firstName: "Maya", lastName: "Chen", grade: "Grade 11", schoolId: school.id, serviceHourGoal: 100 });
  const liam = await upsertUser({ email: "liam.patel@clubsync.dev", firstName: "Liam", lastName: "Patel", grade: "Grade 10", schoolId: school.id });
  const sophia = await upsertUser({ email: "sophia.nguyen@clubsync.dev", firstName: "Sophia", lastName: "Nguyen", grade: "Grade 12", schoolId: school.id, serviceHourGoal: 150 });
  const noah = await upsertUser({ email: "noah.kim@clubsync.dev", firstName: "Noah", lastName: "Kim", grade: "Grade 9", schoolId: school.id, serviceHourGoal: 30 });
  const olivia = await upsertUser({ email: "olivia.brown@clubsync.dev", firstName: "Olivia", lastName: "Brown", grade: "Grade 11", schoolId: school.id });

  const students = [maya, liam, sophia, noah, olivia];

  async function upsertClub(input: {
    slug: string;
    name: string;
    description: string;
    missionStatement?: string;
    category: string;
    color: string;
    directorId: string;
    meetingSchedule?: string;
    contactEmail?: string;
  }) {
    const club = await db.club.upsert({
      where: { slug: input.slug },
      update: {},
      create: {
        slug: input.slug,
        name: input.name,
        description: input.description,
        missionStatement: input.missionStatement,
        category: input.category,
        color: input.color,
        schoolId: school.id,
        meetingSchedule: input.meetingSchedule,
        contactEmail: input.contactEmail,
        createdById: input.directorId,
        memberships: { create: { userId: input.directorId, role: "DIRECTOR", status: "ACTIVE" } },
      },
    });
    return club;
  }

  const interact = await upsertClub({
    slug: "interact-club",
    name: "Interact Club",
    description: "A student-led service club focused on local and global volunteer projects, sponsored by Rotary International.",
    missionStatement: "Service above self.",
    category: "Volunteer",
    color: "#0d9488",
    directorId: maya.id,
    meetingSchedule: "Tuesdays, 3:30 PM",
    contactEmail: "interact@hughboyd.example.edu",
  });

  const mindMatters = await upsertClub({
    slug: "mind-matters",
    name: "Mind Matters",
    description: "Promoting mental health awareness and peer support through workshops, campaigns, and community events.",
    missionStatement: "Every mind matters.",
    category: "Health & Wellness",
    color: "#7c3aed",
    directorId: sophia.id,
    meetingSchedule: "Thursdays, 3:30 PM",
  });

  const modelUN = await upsertClub({
    slug: "model-un",
    name: "Model UN",
    description: "Debate global issues, draft resolutions, and compete at conferences representing countries from around the world.",
    category: "Debate",
    color: "#2563eb",
    directorId: liam.id,
    meetingSchedule: "Mondays, 3:30 PM",
  });

  const robotics = await upsertClub({
    slug: "robotics-club",
    name: "Robotics Club",
    description: "Design, build, and program competitive robots for regional and provincial FIRST Robotics events.",
    category: "STEM",
    color: "#ea580c",
    directorId: noah.id,
    meetingSchedule: "Wednesdays, 4:00 PM · Room 108",
  });

  const volleyball = await upsertClub({
    slug: "volleyball-club",
    name: "Volleyball Club",
    description: "Casual and competitive volleyball for all skill levels — open gym every week plus a spring tournament.",
    category: "Athletics",
    color: "#e11d48",
    directorId: olivia.id,
    meetingSchedule: "Fridays, 3:30 PM · Main Gym",
  });

  const basketball = await upsertClub({
    slug: "basketball-club",
    name: "Basketball Club",
    description: "Pickup games, skills training, and friendly inter-school scrimmages.",
    category: "Athletics",
    color: "#d97706",
    directorId: maya.id,
    meetingSchedule: "Mondays & Thursdays, 4:00 PM",
  });

  // Cross-join memberships so clubs have realistic member counts.
  await ensureMembership(liam.id, interact.id);
  await ensureMembership(sophia.id, interact.id);
  await ensureMembership(noah.id, interact.id);
  await ensureMembership(olivia.id, interact.id);
  await ensureMembership(maya.id, mindMatters.id);
  await ensureMembership(noah.id, mindMatters.id);
  await ensureMembership(olivia.id, mindMatters.id);
  await ensureMembership(maya.id, modelUN.id);
  await ensureMembership(sophia.id, modelUN.id);
  await ensureMembership(liam.id, robotics.id);
  await ensureMembership(olivia.id, robotics.id);
  await ensureMembership(sophia.id, volleyball.id);
  await ensureMembership(noah.id, volleyball.id);
  await ensureMembership(liam.id, basketball.id);
  await ensureMembership(olivia.id, basketball.id);

  // ---- Events ----
  async function createEvent(input: {
    clubId: string;
    creatorId: string;
    title: string;
    description: string;
    category: string;
    daysOffset: number;
    startHour: number;
    durationHours?: number;
    building?: string;
    room?: string;
    awardsServiceHours?: boolean;
    defaultServiceHours?: number;
    serviceTaskDescription?: string;
    maxParticipants?: number;
    waitlistEnabled?: boolean;
    status?: "SCHEDULED" | "COMPLETED" | "FINALIZED";
  }) {
    const startAt = addDays(new Date(), input.daysOffset);
    startAt.setHours(input.startHour, 0, 0, 0);
    const endAt = addHours(startAt, input.durationHours ?? 1);

    return db.event.create({
      data: {
        clubId: input.clubId,
        createdById: input.creatorId,
        title: input.title,
        description: input.description,
        category: input.category,
        startAt,
        endAt,
        building: input.building,
        room: input.room,
        awardsServiceHours: input.awardsServiceHours ?? false,
        defaultServiceHours: input.defaultServiceHours ?? 0,
        serviceTaskDescription: input.serviceTaskDescription,
        maxParticipants: input.maxParticipants,
        waitlistEnabled: input.waitlistEnabled ?? false,
        status: input.status ?? "SCHEDULED",
      },
    });
  }

  async function registerAndMaybeFinalize(eventId: string, userIds: string[], opts: { finalize?: boolean; hours?: number; impact?: string; approverId?: string; clubId?: string }) {
    for (const userId of userIds) {
      await db.eventRegistration.upsert({
        where: { eventId_userId: { eventId, userId } },
        update: {},
        create: { eventId, userId, status: opts.finalize ? "ATTENDED" : "REGISTERED" },
      });
    }
    if (opts.finalize && opts.hours && opts.clubId && opts.approverId) {
      for (const userId of userIds) {
        await db.serviceHourRecord.create({
          data: {
            userId,
            clubId: opts.clubId,
            eventId,
            hours: opts.hours,
            status: "VERIFIED",
            approvedById: opts.approverId,
            approvedAt: new Date(),
            taskDescription: undefined,
            eventImpact: opts.impact,
          },
        });
      }
    }
  }

  // Past, finalized events with verified service hours (populate portfolios).
  const beachCleanup = await createEvent({
    clubId: interact.id,
    creatorId: maya.id,
    title: "Beach Cleanup",
    description: "Community beach cleanup along the waterfront — gloves and bags provided.",
    category: "Volunteer",
    daysOffset: -14,
    startHour: 10,
    durationHours: 3,
    building: "Garry Point Park",
    awardsServiceHours: true,
    defaultServiceHours: 3,
    serviceTaskDescription: "Cleanup Crew",
    status: "FINALIZED",
  });
  await registerAndMaybeFinalize(beachCleanup.id, [liam.id, sophia.id, noah.id], {
    finalize: true,
    hours: 3,
    impact: "Collected over 60 lbs of litter from the shoreline.",
    approverId: maya.id,
    clubId: interact.id,
  });

  const foodDrive = await createEvent({
    clubId: interact.id,
    creatorId: maya.id,
    title: "Food Drive Sorting",
    description: "Sort and pack donated food items for the local food bank.",
    category: "Volunteer",
    daysOffset: -7,
    startHour: 16,
    durationHours: 2,
    building: "Community Centre",
    awardsServiceHours: true,
    defaultServiceHours: 2,
    serviceTaskDescription: "Food Sorting",
    status: "FINALIZED",
  });
  await registerAndMaybeFinalize(foodDrive.id, [olivia.id, sophia.id], {
    finalize: true,
    hours: 2,
    impact: "Sorted 450 lbs of donated food.",
    approverId: maya.id,
    clubId: interact.id,
  });

  const wellnessFair = await createEvent({
    clubId: mindMatters.id,
    creatorId: sophia.id,
    title: "Wellness Fair",
    description: "Booths, activities, and resources promoting student mental health.",
    category: "Community Event",
    daysOffset: -10,
    startHour: 12,
    durationHours: 4,
    building: "Main Gym",
    awardsServiceHours: true,
    defaultServiceHours: 3,
    serviceTaskDescription: "Booth Volunteer",
    status: "FINALIZED",
  });
  await registerAndMaybeFinalize(wellnessFair.id, [maya.id, noah.id, olivia.id], {
    finalize: true,
    hours: 3,
    impact: "Over 200 students visited the wellness booths.",
    approverId: sophia.id,
    clubId: mindMatters.id,
  });

  // Completed but not yet finalized — gives the director dashboard something to act on.
  const conferenceSetup = await createEvent({
    clubId: modelUN.id,
    creatorId: liam.id,
    title: "Conference Setup",
    description: "Set up the auditorium ahead of Saturday's regional Model UN conference.",
    category: "Volunteer",
    daysOffset: -2,
    startHour: 9,
    durationHours: 3,
    building: "Auditorium",
    awardsServiceHours: true,
    defaultServiceHours: 3,
    serviceTaskDescription: "Event Setup Crew",
    status: "COMPLETED",
  });
  await registerAndMaybeFinalize(conferenceSetup.id, [maya.id, sophia.id], { finalize: false });

  // Regular weekly meetings (mix of past + upcoming, no service hours).
  for (const offset of [-21, -14, -7, 7, 14, 21]) {
    await createEvent({
      clubId: interact.id,
      creatorId: maya.id,
      title: "Weekly Meeting",
      description: "Regular Interact Club meeting — updates, planning, and sign-ups for upcoming events.",
      category: "Meeting",
      daysOffset: offset,
      startHour: 15,
      durationHours: 1,
      room: "Room 204",
      status: offset < 0 ? "FINALIZED" : "SCHEDULED",
    });
  }

  // Upcoming events across every club, for calendar/discover testing.
  const upcomingBeach = await createEvent({
    clubId: interact.id,
    creatorId: maya.id,
    title: "Shoreline Restoration Day",
    description: "Help plant native vegetation and remove invasive species along the shoreline trail.",
    category: "Volunteer",
    daysOffset: 5,
    startHour: 10,
    durationHours: 3,
    building: "Terra Nova Rural Park",
    awardsServiceHours: true,
    defaultServiceHours: 3,
    serviceTaskDescription: "Planting Crew",
    maxParticipants: 4,
    waitlistEnabled: true,
    status: "SCHEDULED",
  });
  await registerAndMaybeFinalize(upcomingBeach.id, [liam.id, noah.id, olivia.id, sophia.id], {});

  await createEvent({
    clubId: mindMatters.id,
    creatorId: sophia.id,
    title: "Peer Support Training",
    description: "Training session for new peer support volunteers.",
    category: "Workshop",
    daysOffset: 3,
    startHour: 15,
    durationHours: 2,
    room: "Room 112",
    status: "SCHEDULED",
  });

  await createEvent({
    clubId: modelUN.id,
    creatorId: liam.id,
    title: "Regional Conference",
    description: "Represent Hugh Boyd at the regional Model UN conference — assigned country packets available now.",
    category: "Competition",
    daysOffset: 10,
    startHour: 8,
    durationHours: 8,
    building: "Convention Centre",
    status: "SCHEDULED",
  });

  await createEvent({
    clubId: robotics.id,
    creatorId: noah.id,
    title: "Build Season Kickoff",
    description: "Kickoff meeting for this season's robot build — team assignments and challenge reveal.",
    category: "Meeting",
    daysOffset: 2,
    startHour: 16,
    durationHours: 2,
    room: "Room 108",
    status: "SCHEDULED",
  });

  await createEvent({
    clubId: volleyball.id,
    creatorId: olivia.id,
    title: "Open Gym",
    description: "Casual open gym — all skill levels welcome, just show up!",
    category: "Sports Training",
    daysOffset: 4,
    startHour: 15,
    durationHours: 1,
    building: "Main Gym",
    status: "SCHEDULED",
  });

  await createEvent({
    clubId: basketball.id,
    creatorId: maya.id,
    title: "Inter-School Scrimmage",
    description: "Friendly scrimmage against Steveston-London Secondary.",
    category: "Competition",
    daysOffset: 12,
    startHour: 17,
    durationHours: 2,
    building: "Main Gym",
    status: "SCHEDULED",
  });

  // ---- Announcements ----
  await db.announcement.create({
    data: { clubId: interact.id, createdById: maya.id, title: "Volunteer Sign-Ups Open", body: "Sign up for Shoreline Restoration Day — limited spots, first come first served!" },
  });
  await db.announcement.create({
    data: { clubId: mindMatters.id, createdById: sophia.id, title: "Peer Support Applications Open", body: "Apply to become a peer support volunteer — training session next week." },
  });
  await db.announcement.create({
    data: { clubId: modelUN.id, createdById: liam.id, title: "Country Assignments Posted", body: "Check your email for your assigned country ahead of the regional conference." },
  });

  // ---- Achievements: unlock what each seeded student has actually earned ----
  for (const student of students) {
    const [membershipCount, hoursAgg, distinctClubs] = await Promise.all([
      db.clubMembership.count({ where: { userId: student.id, status: "ACTIVE" } }),
      db.serviceHourRecord.aggregate({ where: { userId: student.id, status: "VERIFIED" }, _sum: { hours: true }, _count: true }),
      db.serviceHourRecord.findMany({ where: { userId: student.id, status: "VERIFIED" }, distinct: ["clubId"], select: { clubId: true } }),
    ]);
    const totalHours = hoursAgg._sum.hours ?? 0;
    const earned: string[] = [];
    if (membershipCount >= 1) earned.push("first_club_joined");
    if (hoursAgg._count >= 1) earned.push("first_volunteer_event");
    if (totalHours >= 10) earned.push("10_hours");
    if (totalHours >= 50) earned.push("50_hours");
    if (distinctClubs.length >= 5) earned.push("community_impact");

    if (earned.length === 0) continue;
    const defs = await db.achievement.findMany({ where: { key: { in: earned } } });
    for (const def of defs) {
      await db.userAchievement.upsert({
        where: { userId_achievementId: { userId: student.id, achievementId: def.id } },
        update: {},
        create: { userId: student.id, achievementId: def.id },
      });
    }
  }

  console.log("Seed complete.");
  console.log("");
  console.log("Test accounts (all use password: clubsync123):");
  console.log(`  Platform Admin  → ${admin.email}`);
  console.log(`  Student/Director → ${maya.email} — directs Interact Club & Basketball Club`);
  console.log(`  Student/Director → ${sophia.email} — directs Mind Matters`);
  console.log(`  Student/Director → ${liam.email} — directs Model UN & Basketball member`);
  console.log(`  Student/Director → ${noah.email} — directs Robotics Club`);
  console.log(`  Student/Director → ${olivia.email} — directs Volleyball Club`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
