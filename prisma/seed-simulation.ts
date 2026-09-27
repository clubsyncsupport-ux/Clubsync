// Seeds a large, realistic SIMULATED school into the shared database for QA
// purposes — entirely separate from the real "Hugh Boyd Secondary School"
// data and from prisma/seed.ts's small example dataset.
//
// Everything created here lives under one brand-new School record and uses
// @test.clubsync.local emails, so it's trivially identifiable and stays
// invisible to real users (the app scopes students/directors/discover by
// school). Safe-guarded against double-running: aborts early if the
// simulation school already exists, since (unlike prisma/seed.ts) most rows
// here are plain creates, not upserts — re-running would duplicate data.
//
// Run with: npx tsx prisma/seed-simulation.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { addDays } from "date-fns";

const db = new PrismaClient();

// Mirrors src/lib/school-year.ts's schoolYearFor — duplicated rather than
// imported since this script runs standalone via `npx tsx`, outside Next's
// path-alias resolution.
function schoolYearFor(date: Date): string {
  const y = date.getFullYear();
  return date.getMonth() >= 7 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

const SCHOOL_NAME = "ClubSync Simulation High School";
const PASSWORD = "TestPass1234";
const EMAIL_DOMAIN = "test.clubsync.local";
const GRADES = ["Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"];
const SERVICE_HOUR_GOALS = [30, 50, 75, 100, 150];

function id() {
  return randomUUID();
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sample<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, Math.min(n, arr.length));
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ---------- Name pools ----------
const STUDENT_FIRST_NAMES = [
  "Aiden", "Amara", "Aria", "Arjun", "Ava", "Beatrice", "Benjamin", "Bianca", "Caleb", "Camila",
  "Carlos", "Charlotte", "Chloe", "Daniel", "Daniela", "David", "Diego", "Elena", "Elias", "Ella",
  "Emily", "Emma", "Ethan", "Fatima", "Gabriel", "Grace", "Hannah", "Harper", "Hassan", "Henry",
  "Isabella", "Ishaan", "Jacob", "Jasmine", "Javier", "Jayden", "Jia", "Joseph", "Julia", "Kai",
  "Karan", "Kayla", "Kevin", "Layla", "Leo", "Liam", "Lily", "Lucas", "Luna", "Madison",
  "Maria", "Mason", "Mateo", "Maya", "Mia", "Mila", "Naomi", "Natalie", "Nathan", "Nicole",
  "Noah", "Nora", "Olivia", "Omar", "Oscar", "Owen", "Priya", "Rachel", "Raj", "Ravi",
  "Ruby", "Ryan", "Sadie", "Samuel", "Sana", "Sara", "Sarah", "Sebastian", "Simran", "Sofia",
  "Sophia", "Tyler", "Victoria", "Vincent", "Wei", "William", "Xin", "Yara", "Zara", "Zoe", "Zoey",
];
const LAST_NAMES = [
  "Anderson", "Bailey", "Baker", "Brown", "Campbell", "Cardenas", "Carter", "Chen", "Choi", "Clark",
  "Cook", "Cooper", "Cruz", "Davies", "Diaz", "Edwards", "Evans", "Fernandez", "Flores", "Garcia",
  "Gill", "Gomez", "Gonzalez", "Gray", "Green", "Gupta", "Hall", "Harris", "Hernandez", "Hill",
  "Ho", "Hussain", "Ibrahim", "Jackson", "James", "Johal", "Johnson", "Jones", "Kaur", "Khan",
  "Kim", "King", "Lam", "Lee", "Lewis", "Li", "Liu", "Lopez", "Martin", "Martinez",
  "Miller", "Mitchell", "Moore", "Morgan", "Nelson", "Nguyen", "Ortiz", "Parker", "Patel", "Perez",
  "Peterson", "Phillips", "Ramirez", "Reed", "Reyes", "Rivera", "Roberts", "Robinson", "Rodriguez", "Rogers",
  "Ross", "Sanchez", "Sandhu", "Scott", "Sharma", "Shaw", "Singh", "Smith", "Stewart", "Sullivan",
  "Taylor", "Thomas", "Thompson", "Torres", "Tran", "Turner", "Vo", "Walker", "Wang", "Ward",
  "Watson", "White", "Williams", "Wilson", "Wong", "Wood", "Wright", "Yang", "Young", "Zhang", "Zhou",
];
const TEACHER_FIRST_NAMES = [
  "Patricia", "Robert", "Linda", "Michael", "Susan", "James", "Barbara", "Richard", "Karen", "Thomas",
  "Deborah", "Charles", "Nancy", "Steven", "Angela", "Mark", "Christine", "Paul", "Diane", "George",
];

async function main() {
  console.log(`Seeding simulation data for "${SCHOOL_NAME}"…`);

  const already = await db.school.findUnique({ where: { name: SCHOOL_NAME } });
  if (already) {
    console.log(`Simulation school already exists (id=${already.id}). Aborting to avoid duplicate data.`);
    console.log("If you really want to reseed, delete that School row (cascades) first.");
    return;
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // ---------- School ----------
  const school = await db.school.create({
    data: {
      id: id(),
      name: SCHOOL_NAME,
      city: "Simtown",
      region: "BC",
      country: "Canada",
    },
  });

  // ---------- Achievements (global, shared with real data — safe upsert) ----------
  const ACHIEVEMENT_DEFS = [
    { key: "first_club_joined", title: "First Club Joined", description: "Joined your first club.", icon: "🎉" },
    { key: "first_volunteer_event", title: "First Volunteer Event", description: "Completed your first verified volunteer event.", icon: "🤝" },
    { key: "10_hours", title: "10 Service Hours", description: "Earned 10 verified service hours.", icon: "⭐" },
    { key: "50_hours", title: "50 Service Hours", description: "Earned 50 verified service hours.", icon: "🌱" },
    { key: "100_hours", title: "100 Service Hours", description: "Earned 100 verified service hours.", icon: "💙" },
    { key: "10_events", title: "10 Club Events", description: "Attended 10 club events.", icon: "🏅" },
    { key: "community_impact", title: "Community Impact", description: "Contributed to 5 different clubs' events.", icon: "🌍" },
  ];
  for (const def of ACHIEVEMENT_DEFS) {
    await db.achievement.upsert({ where: { key: def.key }, update: {}, create: def });
  }

  // ---------- Platform Admin + School Admin test accounts ----------
  const platformAdminId = id();
  await db.user.create({
    data: {
      id: platformAdminId,
      email: `platformadmin@${EMAIL_DOMAIN}`,
      passwordHash,
      firstName: "Test",
      lastName: "PlatformAdmin",
      platformRole: "PLATFORM_ADMIN",
      accountKind: "STUDENT",
      schoolId: school.id,
      grade: null,
    },
  });

  const schoolAdminId = id();
  await db.user.create({
    data: {
      id: schoolAdminId,
      email: `schooladmin@${EMAIL_DOMAIN}`,
      passwordHash,
      firstName: "Test",
      lastName: "SchoolAdmin",
      platformRole: "SCHOOL_ADMIN",
      accountKind: "STUDENT",
      schoolAdminOfId: school.id,
      schoolId: null,
      grade: null,
    },
  });

  const principalId = id();
  await db.user.create({
    data: {
      id: principalId,
      email: `principal@${EMAIL_DOMAIN}`,
      passwordHash,
      firstName: "Test",
      lastName: "Principal",
      platformRole: "PRINCIPAL",
      accountKind: "STUDENT",
      schoolAdminOfId: school.id,
      schoolId: null,
      grade: null,
    },
  });

  const vicePrincipalId = id();
  await db.user.create({
    data: {
      id: vicePrincipalId,
      email: `viceprincipal@${EMAIL_DOMAIN}`,
      passwordHash,
      firstName: "Test",
      lastName: "VicePrincipal",
      platformRole: "VICE_PRINCIPAL",
      accountKind: "STUDENT",
      schoolAdminOfId: school.id,
      schoolId: null,
      grade: null,
    },
  });

  // ---------- Name pool (dedup pairs) ----------
  const allCombos = shuffle(
    STUDENT_FIRST_NAMES.flatMap((f) => LAST_NAMES.map((l) => [f, l] as const))
  );
  const teacherCombos = shuffle(
    TEACHER_FIRST_NAMES.flatMap((f) => LAST_NAMES.map((l) => [f, l] as const))
  ).slice(0, 10);
  const studentCombos = allCombos.slice(0, 100);

  // ---------- Teachers (STAFF accounts) ----------
  const teacherIds: string[] = [];
  const teacherData = teacherCombos.map(([firstName, lastName], i) => {
    const tid = id();
    teacherIds.push(tid);
    return {
      id: tid,
      email: `teacher${String(i + 1).padStart(2, "0")}@${EMAIL_DOMAIN}`,
      passwordHash,
      firstName,
      lastName,
      accountKind: "STAFF",
      platformRole: "STUDENT" as const,
      schoolId: school.id,
      grade: null,
    };
  });
  await db.user.createMany({ data: teacherData });
  console.log(`Created ${teacherIds.length} teacher/director accounts.`);

  // ---------- Students ----------
  const studentIds: string[] = [];
  const studentMeta: { id: string; grade: string; firstName: string; lastName: string }[] = [];
  const studentData = studentCombos.map(([firstName, lastName], i) => {
    const sid = id();
    const grade = GRADES[i % GRADES.length];
    studentIds.push(sid);
    studentMeta.push({ id: sid, grade, firstName, lastName });
    return {
      id: sid,
      email: `student${String(i + 1).padStart(3, "0")}@${EMAIL_DOMAIN}`,
      passwordHash,
      firstName,
      lastName,
      accountKind: "STUDENT" as const,
      platformRole: "STUDENT" as const,
      schoolId: school.id,
      grade,
      serviceHourGoal: pick(SERVICE_HOUR_GOALS),
    };
  });
  await db.user.createMany({ data: studentData });
  console.log(`Created ${studentIds.length} student accounts.`);

  // Reserve 5 "hero" students who get deliberately rich data (multiple
  // clubs, lots of registrations) so there's a guaranteed non-random
  // account to explore during manual UI testing.
  const heroIds = studentIds.slice(0, 5); // student001..student005
  const restIds = studentIds.slice(5);

  // ---------- Clubs ----------
  type ClubSpec = {
    slug: string;
    name: string;
    description: string;
    missionStatement?: string;
    category: string;
    color: string;
    directorId: string;
    meetingSchedule: string;
    meetingLocation?: string;
    contactEmail?: string;
    requiresApproval?: boolean;
    memberCount: number;
  };

  const clubSpecs: ClubSpec[] = [
    {
      slug: "sim-community-outreach-club",
      name: "Community Outreach Club",
      description: "Connecting students with volunteer opportunities across the community — food banks, shelters, cleanups, and more.",
      missionStatement: "Small hands, big impact.",
      category: "Volunteer",
      color: "#0d9488",
      directorId: teacherIds[0],
      meetingSchedule: "Tuesdays, 3:30 PM",
      meetingLocation: "Room 210",
      contactEmail: "outreach@simhigh.example.edu",
      memberCount: 35,
    },
    {
      slug: "sim-green-team",
      name: "Green Team",
      description: "Student-led environmental action — campus recycling, native planting, and sustainability campaigns.",
      category: "Environment",
      color: "#65a30d",
      directorId: teacherIds[1],
      meetingSchedule: "Wednesdays, 3:30 PM",
      meetingLocation: "Room 118",
      memberCount: 18,
    },
    {
      slug: "sim-coding-club",
      name: "Coding Club",
      description: "Build projects, prep for hackathons, and learn new languages together — all skill levels welcome.",
      category: "STEM,Technology",
      color: "#2563eb",
      directorId: teacherIds[2],
      meetingSchedule: "Thursdays, 4:00 PM · Room 140",
      memberCount: 25,
    },
    {
      slug: "sim-debate-society",
      name: "Debate Society",
      description: "Competitive debate training and tournament travel — parliamentary and policy formats.",
      category: "Debate",
      color: "#7c3aed",
      directorId: teacherIds[3],
      meetingSchedule: "Mondays, 3:30 PM",
      meetingLocation: "Room 205",
      requiresApproval: true,
      memberCount: 12,
    },
    {
      slug: "sim-drama-club",
      name: "Drama Club",
      description: "Termly productions from auditions through opening night, plus improv nights for fun.",
      category: "Arts",
      color: "#c026d3",
      directorId: teacherIds[4],
      meetingSchedule: "Wednesdays, 4:00 PM · Auditorium",
      memberCount: 20,
    },
    {
      slug: "sim-a-cappella-club",
      name: "A Cappella Club",
      description: "All-vocal ensemble performing at school assemblies and community events.",
      category: "Music",
      color: "#db2777",
      directorId: teacherIds[5],
      meetingSchedule: "Fridays, 3:30 PM · Music Room",
      memberCount: 8,
    },
    {
      slug: "sim-ultimate-frisbee-club",
      name: "Ultimate Frisbee Club",
      description: "Casual and competitive ultimate — weekly practices and a spring inter-school tournament.",
      category: "Athletics",
      color: "#ea580c",
      directorId: teacherIds[6],
      meetingSchedule: "Tuesdays & Thursdays, 4:00 PM · Field",
      memberCount: 22,
    },
    {
      slug: "sim-cultural-exchange-club",
      name: "Cultural Exchange Club",
      description: "Celebrating the school's cultural diversity through potlucks, festivals, and language exchange nights.",
      category: "Culture",
      color: "#0891b2",
      directorId: teacherIds[7],
      meetingSchedule: "Thursdays, 3:30 PM",
      memberCount: 15,
    },
  ];
  // teacherIds[8] and teacherIds[9] stay idle — one demonstrates the empty
  // Teacher Dashboard, the other is the pending-supervisor target below.

  const clubs: Record<string, { id: string; slug: string; name: string; color: string; directorId: string; memberIds: string[] }> = {};

  for (const spec of clubSpecs) {
    const clubId = id();
    await db.club.create({
      data: {
        id: clubId,
        slug: spec.slug,
        name: spec.name,
        description: spec.description,
        missionStatement: spec.missionStatement,
        category: spec.category,
        color: spec.color,
        schoolId: school.id,
        meetingSchedule: spec.meetingSchedule,
        meetingLocation: spec.meetingLocation,
        contactEmail: spec.contactEmail,
        requiresApproval: spec.requiresApproval ?? false,
        createdById: spec.directorId,
        memberships: { create: { userId: spec.directorId, role: "DIRECTOR", status: "ACTIVE" } },
      },
    });

    // Pick members: always include hero students that make sense to spread
    // across clubs, then fill the rest randomly from the remaining pool.
    const heroShare = sample(heroIds, Math.min(3, heroIds.length));
    const need = Math.max(spec.memberCount - heroShare.length, 0);
    const randomMembers = sample(restIds, need);
    const memberIds = Array.from(new Set([...heroShare, ...randomMembers]));

    const membershipRows = memberIds.map((userId, i) => ({
      id: id(),
      userId,
      clubId,
      role: i < 2 ? "OFFICER" : "MEMBER", // first couple picked become officers
      status: "ACTIVE",
    }));
    await db.clubMembership.createMany({ data: membershipRows, skipDuplicates: true });

    clubs[spec.slug] = { id: clubId, slug: spec.slug, name: spec.name, color: spec.color, directorId: spec.directorId, memberIds };
  }
  console.log(`Created ${Object.keys(clubs).length} clubs with memberships.`);

  // A Debate Society join request queue: 3 more students PENDING approval
  // (requiresApproval club), to exercise the director's approve/deny UI.
  const debate = clubs["sim-debate-society"];
  const pendingApplicants = sample(restIds.filter((sid) => !debate.memberIds.includes(sid)), 3);
  await db.clubMembership.createMany({
    data: pendingApplicants.map((userId) => ({ id: id(), userId, clubId: debate.id, role: "MEMBER", status: "PENDING" })),
    skipDuplicates: true,
  });

  // A student-created club still awaiting supervisor sign-off, targeting the
  // otherwise-idle 10th teacher — exercises /teacher/supervising-requests.
  const pendingClubCreatorId = pick(restIds);
  const pendingClubId = id();
  await db.club.create({
    data: {
      id: pendingClubId,
      slug: "sim-anime-club",
      name: "Anime Club",
      description: "Weekly screenings, art nights, and a booth at the spring culture fair.",
      category: "Culture",
      color: "#a21caf",
      schoolId: school.id,
      createdById: pendingClubCreatorId,
      approvalStatus: "PENDING_SUPERVISOR",
      pendingSupervisorId: teacherIds[9],
      memberships: { create: { userId: pendingClubCreatorId, role: "OFFICER", status: "ACTIVE" } },
    },
  });
  await db.notification.create({
    data: {
      id: id(),
      userId: teacherIds[9],
      type: "CLUB_SUPERVISOR_REQUEST",
      title: "New club needs your approval",
      body: `A student wants you to supervise "Anime Club."`,
      linkUrl: `/teacher/supervising-requests/${pendingClubId}`,
    },
  });
  console.log("Created 1 pending-supervisor club (Anime Club) + Debate Society join queue.");

  // ---------- Events ----------
  type EventSpec = {
    clubSlug: string;
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
    attendanceEnabled?: boolean;
    maxParticipants?: number;
    waitlistEnabled?: boolean;
    allowedGrades?: string;
    visibility?: "PUBLIC" | "PRIVATE";
    roles?: { name: string; capacity: number }[];
    lifecycle: "FINALIZED" | "COMPLETED" | "SCHEDULED";
    impact?: string;
    isFundraiser?: boolean;
    approvalStatus?: "PENDING_SPONSOR" | "PENDING_ADMIN";
  };

  const eventSpecs: EventSpec[] = [
    // ---- Community Outreach Club (busy club — long events list) ----
    { clubSlug: "sim-community-outreach-club", title: "Park Cleanup", description: "Litter pickup and invasive-species removal at Riverside Park.", category: "Volunteer", daysOffset: -21, startHour: 10, durationHours: 3, building: "Riverside Park", awardsServiceHours: true, defaultServiceHours: 3, serviceTaskDescription: "Cleanup Crew", lifecycle: "FINALIZED", impact: "Removed over 80 lbs of litter and invasive ivy." },
    { clubSlug: "sim-community-outreach-club", title: "Soup Kitchen Shift", description: "Serve dinner and help with cleanup at the downtown soup kitchen.", category: "Volunteer", daysOffset: -14, startHour: 16, durationHours: 4, building: "Downtown Community Kitchen", awardsServiceHours: true, defaultServiceHours: 4, serviceTaskDescription: "Serving & Cleanup", lifecycle: "FINALIZED", impact: "Served roughly 150 meals." },
    { clubSlug: "sim-community-outreach-club", title: "Weekly Meeting", description: "Regular club meeting — updates and sign-ups.", category: "Meeting", daysOffset: -14, startHour: 15, durationHours: 1, room: "Room 210", lifecycle: "FINALIZED" },
    { clubSlug: "sim-community-outreach-club", title: "Weekly Meeting", description: "Regular club meeting — updates and sign-ups.", category: "Meeting", daysOffset: -7, startHour: 15, durationHours: 1, room: "Room 210", lifecycle: "FINALIZED" },
    { clubSlug: "sim-community-outreach-club", title: "Food Bank Sorting", description: "Sort and shelve donated food items for the Simtown Food Bank.", category: "Volunteer", daysOffset: -3, startHour: 16, durationHours: 2, building: "Simtown Food Bank", awardsServiceHours: true, defaultServiceHours: 2, serviceTaskDescription: "Food Sorting", lifecycle: "COMPLETED" },
    { clubSlug: "sim-community-outreach-club", title: "Weekly Meeting", description: "Regular club meeting — updates and sign-ups.", category: "Meeting", daysOffset: 0, startHour: 15, durationHours: 1, room: "Room 210", lifecycle: "SCHEDULED" },
    { clubSlug: "sim-community-outreach-club", title: "Bake Sale Fundraiser", description: "Raise money for next term's volunteer trips.", category: "Community Event", isFundraiser: true, daysOffset: 2, startHour: 11, durationHours: 3, building: "Main Foyer", lifecycle: "SCHEDULED" },
    { clubSlug: "sim-community-outreach-club", title: "Weekly Meeting", description: "Regular club meeting — updates and sign-ups.", category: "Meeting", daysOffset: 7, startHour: 15, durationHours: 1, room: "Room 210", lifecycle: "SCHEDULED" },
    { clubSlug: "sim-community-outreach-club", title: "Shoreline Cleanup Day", description: "Help plant native vegetation and remove invasive species along the shoreline trail. Limited spots!", category: "Volunteer", daysOffset: 9, startHour: 10, durationHours: 3, building: "Terra Nova Rural Park", awardsServiceHours: true, defaultServiceHours: 3, serviceTaskDescription: "Planting Crew", maxParticipants: 5, waitlistEnabled: true, lifecycle: "SCHEDULED" },
    { clubSlug: "sim-community-outreach-club", title: "Weekly Meeting", description: "Regular club meeting — updates and sign-ups.", category: "Meeting", daysOffset: 14, startHour: 15, durationHours: 1, room: "Room 210", lifecycle: "SCHEDULED" },
    { clubSlug: "sim-community-outreach-club", title: "Charity Gala Setup", description: "Set up and staff the annual charity gala — senior volunteers only this year.", category: "Volunteer", daysOffset: 20, startHour: 9, durationHours: 5, building: "Convention Centre", awardsServiceHours: true, defaultServiceHours: 5, serviceTaskDescription: "Event Crew", allowedGrades: "Grade 11,Grade 12", roles: [{ name: "Setup Crew", capacity: 4 }, { name: "Registration Table", capacity: 2 }], lifecycle: "SCHEDULED" },
    { clubSlug: "sim-community-outreach-club", title: "Regional Volunteer Summit", description: "Send a delegation to represent the club at the regional volunteer summit.", category: "Community Event", daysOffset: 25, startHour: 9, durationHours: 4, building: "Convention Centre", lifecycle: "SCHEDULED", approvalStatus: "PENDING_SPONSOR" },
    { clubSlug: "sim-green-team", title: "Campus Sustainability Fair", description: "A booth fair showcasing sustainability projects from every club.", category: "Community Event", daysOffset: 18, startHour: 10, durationHours: 4, building: "Campus Grounds", lifecycle: "SCHEDULED", approvalStatus: "PENDING_ADMIN" },

    // ---- Green Team ----
    { clubSlug: "sim-green-team", title: "Tree Planting", description: "Plant native saplings along the campus perimeter.", category: "Volunteer", daysOffset: -10, startHour: 10, durationHours: 3, building: "Campus Grounds", awardsServiceHours: true, defaultServiceHours: 3, serviceTaskDescription: "Planting Crew", lifecycle: "FINALIZED", impact: "Planted 40 native saplings." },
    { clubSlug: "sim-green-team", title: "Weekly Meeting", description: "Planning session for this term's campaigns.", category: "Meeting", daysOffset: -3, startHour: 15, durationHours: 1, room: "Room 118", lifecycle: "FINALIZED" },
    { clubSlug: "sim-green-team", title: "Recycling Audit", description: "Audit classroom recycling bins and report contamination rates.", category: "Volunteer", daysOffset: -1, startHour: 15, durationHours: 2, awardsServiceHours: true, defaultServiceHours: 2, serviceTaskDescription: "Audit Team", lifecycle: "COMPLETED" },
    { clubSlug: "sim-green-team", title: "Composting Workshop", description: "Learn how the new campus composting program works.", category: "Workshop", daysOffset: 0, startHour: 11, durationHours: 1, room: "Room 118", lifecycle: "SCHEDULED" },
    { clubSlug: "sim-green-team", title: "Weekly Meeting", description: "Planning session for this term's campaigns.", category: "Meeting", daysOffset: 6, startHour: 15, durationHours: 1, room: "Room 118", lifecycle: "SCHEDULED" },

    // ---- Coding Club ----
    { clubSlug: "sim-coding-club", title: "Hackathon Prep", description: "Form teams and pick project ideas ahead of the regional hackathon.", category: "Workshop", daysOffset: -12, startHour: 16, durationHours: 2, room: "Room 140", attendanceEnabled: true, lifecycle: "FINALIZED" },
    { clubSlug: "sim-coding-club", title: "Weekly Meeting", description: "Project check-ins and pair programming.", category: "Meeting", daysOffset: -5, startHour: 16, durationHours: 1, room: "Room 140", lifecycle: "FINALIZED" },
    { clubSlug: "sim-coding-club", title: "Weekly Meeting", description: "Project check-ins and pair programming.", category: "Meeting", daysOffset: 0, startHour: 16, durationHours: 1, room: "Room 140", lifecycle: "SCHEDULED" },
    { clubSlug: "sim-coding-club", title: "App Dev Sprint", description: "Invite-only strike team finishing the club's app for the tech fair.", category: "Competition", daysOffset: 8, startHour: 13, durationHours: 6, room: "Room 140", visibility: "PRIVATE", lifecycle: "SCHEDULED" },
    { clubSlug: "sim-coding-club", title: "Weekly Meeting", description: "Project check-ins and pair programming.", category: "Meeting", daysOffset: 15, startHour: 16, durationHours: 1, room: "Room 140", lifecycle: "SCHEDULED" },

    // ---- Debate Society ----
    { clubSlug: "sim-debate-society", title: "Practice Round", description: "Practice parliamentary rounds ahead of the season opener.", category: "Meeting", daysOffset: -9, startHour: 15, durationHours: 1, room: "Room 205", lifecycle: "FINALIZED" },
    { clubSlug: "sim-debate-society", title: "Season Opener Tournament", description: "First tournament of the season, hosted at Central High.", category: "Competition", daysOffset: -4, startHour: 8, durationHours: 8, building: "Central High School", attendanceEnabled: true, lifecycle: "FINALIZED" },
    { clubSlug: "sim-debate-society", title: "Weekly Meeting", description: "Practice rounds and case prep.", category: "Meeting", daysOffset: 0, startHour: 8, durationHours: 1, room: "Room 205", lifecycle: "SCHEDULED" },
    { clubSlug: "sim-debate-society", title: "Regional Tournament", description: "Regional qualifier — carpool sign-up in the meeting thread.", category: "Competition", daysOffset: 11, startHour: 7, durationHours: 9, building: "Regional Convention Centre", maxParticipants: 10, lifecycle: "SCHEDULED" },

    // ---- Drama Club ----
    { clubSlug: "sim-drama-club", title: "Auditions", description: "Open auditions for the spring musical.", category: "Meeting", daysOffset: -15, startHour: 15, durationHours: 2, building: "Auditorium", lifecycle: "FINALIZED" },
    { clubSlug: "sim-drama-club", title: "Rehearsal", description: "Full cast read-through and blocking for Act 1.", category: "Meeting", daysOffset: -6, startHour: 16, durationHours: 2, building: "Auditorium", lifecycle: "COMPLETED" },
    { clubSlug: "sim-drama-club", title: "Rehearsal", description: "Full cast run-through.", category: "Meeting", daysOffset: 0, startHour: 19, durationHours: 2, building: "Auditorium", lifecycle: "SCHEDULED" },
    { clubSlug: "sim-drama-club", title: "Spring Play — Opening Night", description: "Opening night of this year's spring production!", category: "Social", daysOffset: 18, startHour: 19, durationHours: 3, building: "Auditorium", lifecycle: "SCHEDULED" },

    // ---- A Cappella Club ----
    { clubSlug: "sim-a-cappella-club", title: "Weekly Rehearsal", description: "Warm-ups and new arrangement practice.", category: "Meeting", daysOffset: -8, startHour: 15, durationHours: 1, room: "Music Room", lifecycle: "FINALIZED" },
    { clubSlug: "sim-a-cappella-club", title: "Weekly Rehearsal", description: "Warm-ups and new arrangement practice.", category: "Meeting", daysOffset: 0, startHour: 17, durationHours: 1, room: "Music Room", lifecycle: "SCHEDULED" },
    { clubSlug: "sim-a-cappella-club", title: "Winter Concert", description: "Annual winter concert in the auditorium.", category: "Social", daysOffset: 25, startHour: 18, durationHours: 2, building: "Auditorium", lifecycle: "SCHEDULED" },

    // ---- Ultimate Frisbee Club ----
    { clubSlug: "sim-ultimate-frisbee-club", title: "Practice", description: "Drills and scrimmage.", category: "Sports Training", daysOffset: -13, startHour: 16, durationHours: 1, building: "Field", attendanceEnabled: true, lifecycle: "FINALIZED" },
    { clubSlug: "sim-ultimate-frisbee-club", title: "Practice", description: "Drills and scrimmage.", category: "Sports Training", daysOffset: -6, startHour: 16, durationHours: 1, building: "Field", attendanceEnabled: true, lifecycle: "FINALIZED" },
    { clubSlug: "sim-ultimate-frisbee-club", title: "Practice", description: "Drills and scrimmage.", category: "Sports Training", daysOffset: 0, startHour: 16, durationHours: 1, building: "Field", lifecycle: "SCHEDULED" },
    { clubSlug: "sim-ultimate-frisbee-club", title: "Inter-School Tournament", description: "Spring tournament against three neighbouring schools.", category: "Competition", daysOffset: 13, startHour: 9, durationHours: 6, building: "Regional Sports Complex", maxParticipants: 14, lifecycle: "SCHEDULED" },

    // ---- Cultural Exchange Club ----
    { clubSlug: "sim-cultural-exchange-club", title: "Welcome Potluck", description: "Kickoff potluck — bring a dish from home to share!", category: "Social", daysOffset: -11, startHour: 17, durationHours: 2, building: "Cafeteria", lifecycle: "FINALIZED" },
    { clubSlug: "sim-cultural-exchange-club", title: "Weekly Meeting", description: "Planning for the Lunar New Year Festival.", category: "Meeting", daysOffset: -2, startHour: 15, durationHours: 1, room: "Room 130", lifecycle: "COMPLETED" },
    { clubSlug: "sim-cultural-exchange-club", title: "Weekly Meeting", description: "Planning for the Lunar New Year Festival.", category: "Meeting", daysOffset: 0, startHour: 12, durationHours: 1, room: "Room 130", lifecycle: "SCHEDULED" },
    { clubSlug: "sim-cultural-exchange-club", title: "Lunar New Year Festival", description: "School-wide festival with food, performances, and crafts.", category: "Community Event", daysOffset: 16, startHour: 17, durationHours: 3, building: "Main Gym", lifecycle: "SCHEDULED" },
  ];

  let finalizedCount = 0, completedCount = 0, scheduledCount = 0, waitlistedCount = 0;

  for (const spec of eventSpecs) {
    const club = clubs[spec.clubSlug];
    const eventId = id();
    const startAt = addDays(new Date(), spec.daysOffset);
    startAt.setHours(spec.startHour, 0, 0, 0);
    const endAt = new Date(startAt.getTime() + (spec.durationHours ?? 1) * 3600_000);

    // Candidate pool for this event: club members, minus the director.
    let pool = club.memberIds.filter((uid) => uid !== club.directorId);
    if (spec.allowedGrades) {
      const allowed = new Set(spec.allowedGrades.split(","));
      const byId = new Map(studentMeta.map((s) => [s.id, s]));
      pool = pool.filter((uid) => {
        const meta = byId.get(uid);
        return meta && allowed.has(meta.grade);
      });
    }

    const status = spec.lifecycle === "SCHEDULED" ? "SCHEDULED" : spec.lifecycle === "COMPLETED" ? "COMPLETED" : "FINALIZED";

    const roles = spec.roles?.map((r, i) => ({ id: id(), name: r.name, capacity: r.capacity, order: i })) ?? [];

    await db.event.create({
      data: {
        id: eventId,
        clubId: club.id,
        createdById: club.directorId,
        title: spec.title,
        description: spec.description,
        category: spec.category,
        startAt,
        endAt,
        building: spec.building,
        room: spec.room,
        visibility: spec.visibility ?? "PUBLIC",
        allowedGrades: spec.allowedGrades,
        maxParticipants: spec.maxParticipants,
        waitlistEnabled: spec.waitlistEnabled ?? false,
        awardsServiceHours: spec.awardsServiceHours ?? false,
        defaultServiceHours: spec.awardsServiceHours ? spec.defaultServiceHours ?? 0 : 0,
        serviceTaskDescription: spec.serviceTaskDescription,
        attendanceEnabled: spec.attendanceEnabled ?? false,
        isFundraiser: spec.isFundraiser ?? false,
        approvalStatus: spec.approvalStatus ?? "APPROVED",
        sponsorApprovedById: spec.approvalStatus === "PENDING_ADMIN" ? club.directorId : null,
        sponsorApprovedAt: spec.approvalStatus === "PENDING_ADMIN" ? new Date() : null,
        status,
        eventImpact: spec.lifecycle === "FINALIZED" ? spec.impact ?? null : null,
        roles: roles.length ? { create: roles } : undefined,
      },
    });

    // Registration + attendance / hours simulation.
    const regFraction = 0.4 + Math.random() * 0.35; // 40–75% of eligible members
    let registrants = sample(pool, Math.round(pool.length * regFraction));

    if (spec.visibility === "PRIVATE") {
      // Invite a handful, only some of whom actually register.
      const invited = sample(pool, Math.min(6, pool.length));
      await db.eventInvite.createMany({ data: invited.map((userId) => ({ id: id(), eventId, userId })), skipDuplicates: true });
      registrants = sample(invited, Math.min(4, invited.length));
    }

    if (registrants.length === 0) continue;

    if (spec.maxParticipants && spec.waitlistEnabled && registrants.length > spec.maxParticipants) {
      const registered = registrants.slice(0, spec.maxParticipants);
      const waitlisted = registrants.slice(spec.maxParticipants);
      await db.eventRegistration.createMany({
        data: [
          ...registered.map((userId) => ({ id: id(), eventId, userId, status: "REGISTERED" as const, roleId: null })),
          ...waitlisted.map((userId) => ({ id: id(), eventId, userId, status: "WAITLISTED" as const, roleId: null })),
        ],
        skipDuplicates: true,
      });
      waitlistedCount += waitlisted.length;
    } else if (roles.length > 0) {
      // Distribute registrants across roles up to each role's capacity.
      const rows: { id: string; eventId: string; userId: string; status: "REGISTERED"; roleId: string }[] = [];
      const capacityLeft = new Map(roles.map((r) => [r.id, r.capacity]));
      for (const userId of registrants) {
        const role = roles.find((r) => (capacityLeft.get(r.id) ?? 0) > 0);
        if (!role) break;
        capacityLeft.set(role.id, (capacityLeft.get(role.id) ?? 0) - 1);
        rows.push({ id: id(), eventId, userId, status: "REGISTERED", roleId: role.id });
      }
      await db.eventRegistration.createMany({ data: rows, skipDuplicates: true });
    } else if (spec.lifecycle === "FINALIZED") {
      // Mark ATTENDED (with one NO_SHOW for realism if the group is big enough).
      const noShow = registrants.length >= 4 ? registrants[registrants.length - 1] : null;
      const attended = noShow ? registrants.slice(0, -1) : registrants;
      await db.eventRegistration.createMany({
        data: [
          ...attended.map((userId) => ({ id: id(), eventId, userId, status: "ATTENDED" as const, roleId: null })),
          ...(noShow ? [{ id: id(), eventId, userId: noShow, status: "NO_SHOW" as const, roleId: null }] : []),
        ],
        skipDuplicates: true,
      });

      if (spec.awardsServiceHours) {
        await db.serviceHourRecord.createMany({
          data: attended.map((userId) => ({
            id: id(),
            userId,
            clubId: club.id,
            eventId,
            hours: spec.defaultServiceHours ?? 1,
            status: "VERIFIED" as const,
            approvedById: club.directorId,
            approvedAt: new Date(),
            taskDescription: spec.serviceTaskDescription,
            eventImpact: spec.impact,
          })),
        });
      } else if (spec.attendanceEnabled) {
        // Attendance-only event: no service hours, just an attended roster.
      }
      finalizedCount++;
    } else {
      // COMPLETED (not yet finalized) or SCHEDULED — plain REGISTERED rows.
      await db.eventRegistration.createMany({
        data: registrants.map((userId) => ({ id: id(), eventId, userId, status: "REGISTERED" as const, roleId: null })),
        skipDuplicates: true,
      });
      if (spec.lifecycle === "COMPLETED") completedCount++;
      else scheduledCount++;
    }
  }
  console.log(`Created ${eventSpecs.length} events (${finalizedCount} finalized, ${completedCount} completed/needs-finalizing, ${scheduledCount} scheduled, ${waitlistedCount} waitlisted registrants).`);

  // A couple of checklist items on the upcoming Shoreline Cleanup Day event.
  const shoreline = await db.event.findFirst({ where: { clubId: clubs["sim-community-outreach-club"].id, title: "Shoreline Cleanup Day" } });
  if (shoreline) {
    await db.eventChecklistItem.createMany({
      data: [
        { id: id(), eventId: shoreline.id, task: "Order gloves and bags", order: 0, completed: true },
        { id: id(), eventId: shoreline.id, task: "Confirm parking passes", order: 1, completed: false },
        { id: id(), eventId: shoreline.id, task: "Print sign-in sheet", order: 2, completed: false },
      ],
    });
  }

  // ---------- Announcements ----------
  const announcementRows = [
    { clubSlug: "sim-community-outreach-club", title: "Shoreline Cleanup Sign-Ups Open", body: "Only 5 spots — sign up now before the waitlist fills!" },
    { clubSlug: "sim-community-outreach-club", title: "Thank You, Volunteers!", body: "Huge thanks to everyone who came out to the Food Bank Sorting event." },
    { clubSlug: "sim-green-team", title: "Composting Workshop This Week", body: "Learn how the new campus composting bins work — free snacks!" },
    { clubSlug: "sim-coding-club", title: "Hackathon Team Sign-Ups", body: "Reply in the group chat if you want in on the regional hackathon team." },
    { clubSlug: "sim-debate-society", title: "Regional Tournament Carpool", body: "We need 2 more drivers for the Regional Tournament — see Mr. Debate Director." },
    { clubSlug: "sim-drama-club", title: "Spring Musical Cast List Posted", body: "Check the callboard outside the auditorium for the final cast list." },
    { clubSlug: "sim-a-cappella-club", title: "New Arrangement Practice Tracks", body: "Practice tracks for the winter concert are up in the shared folder." },
    { clubSlug: "sim-ultimate-frisbee-club", title: "Tournament Roster Finalized", body: "Check the roster — practice attendance is mandatory this week." },
    { clubSlug: "sim-cultural-exchange-club", title: "Lunar New Year Festival Volunteers Needed", body: "Sign up to help run a booth at this year's festival!" },
  ];
  for (const a of announcementRows) {
    const club = clubs[a.clubSlug];
    await db.announcement.create({ data: { id: id(), clubId: club.id, title: a.title, body: a.body, createdById: club.directorId } });
  }
  console.log(`Created ${announcementRows.length} announcements.`);

  // ---------- Club contacts (saved student-contact phone numbers) ----------
  const contactRows = [
    { clubSlug: "sim-community-outreach-club", name: "Jordan Lee", phone: "(604) 555-0101" },
    { clubSlug: "sim-community-outreach-club", name: "Avery Chen", phone: "(604) 555-0102" },
    { clubSlug: "sim-green-team", name: "Riley Park", phone: "(604) 555-0110" },
  ];
  for (const c of contactRows) {
    await db.clubContact.create({ data: { id: id(), clubId: clubs[c.clubSlug].id, name: c.name, phone: c.phone } });
  }
  console.log(`Created ${contactRows.length} club contacts.`);

  // ---------- Club registrations (annual form, exercises carry-forward + the missing-year banner) ----------
  const currentSchoolYear = schoolYearFor(new Date());
  const priorSchoolYear = schoolYearFor(addDays(new Date(), -365));
  // Community Outreach Club: an APPROVED prior-year registration, none yet for
  // the current year — exercises both the director-dashboard reminder banner
  // and the carry-forward prefill once they start this year's.
  await db.clubRegistration.create({
    data: {
      id: id(),
      clubId: clubs["sim-community-outreach-club"].id,
      schoolYear: priorSchoolYear,
      description: "A club focused on organizing volunteer opportunities across Simtown.",
      meetingSchedule: "Tuesdays 3:30 PM",
      meetingLocation: "Room 210",
      fundraisingGuidelines: "All fundraising proceeds go directly to partner organizations.",
      status: "APPROVED",
      submittedById: clubs["sim-community-outreach-club"].directorId,
      sponsorApprovedById: clubs["sim-community-outreach-club"].directorId,
      sponsorApprovedAt: addDays(new Date(), -350),
      adminApprovedById: schoolAdminId,
      adminApprovedAt: addDays(new Date(), -348),
    },
  });
  // Green Team: a current-year registration already awaiting administrator
  // approval — exercises the shared Approvals queue.
  await db.clubRegistration.create({
    data: {
      id: id(),
      clubId: clubs["sim-green-team"].id,
      schoolYear: currentSchoolYear,
      description: "A student-led sustainability and environmental-action club.",
      meetingSchedule: "Wednesdays 3:15 PM",
      meetingLocation: "Room 118",
      status: "PENDING_ADMIN",
      submittedById: clubs["sim-green-team"].directorId,
      sponsorApprovedById: clubs["sim-green-team"].directorId,
      sponsorApprovedAt: addDays(new Date(), -2),
    },
  });
  console.log("Created 2 club registrations (1 approved prior-year, 1 pending-admin current-year).");

  // ---------- Self-reported service hours (pending / rejected / verified) ----------
  const selfReportSubjects = sample(restIds, 7);
  const selfReportRows = [
    { userId: selfReportSubjects[0], org: "Simtown Public Library", task: "Shelving & reading buddy program", hours: 5, status: "PENDING" as const, daysAgo: 4 },
    { userId: selfReportSubjects[1], org: "Simtown Animal Shelter", task: "Dog walking and kennel cleaning", hours: 3, status: "PENDING" as const, daysAgo: 2 },
    { userId: selfReportSubjects[2], org: "Neighbourhood Food Pantry", task: "Weekend food sorting", hours: 4, status: "PENDING" as const, daysAgo: 1 },
    { userId: selfReportSubjects[3], org: "Simtown Seniors Centre", task: "Tech support for residents", hours: 6, status: "REJECTED" as const, daysAgo: 10 },
    { userId: selfReportSubjects[4], org: "Local youth soccer league", task: "Assistant coaching", hours: 8, status: "REJECTED" as const, daysAgo: 15 },
    { userId: selfReportSubjects[5], org: "Habitat for Humanity Simtown", task: "Build-day volunteer", hours: 6, status: "VERIFIED" as const, daysAgo: 20 },
    { userId: selfReportSubjects[6], org: "Simtown Hospital Gift Shop", task: "Gift shop volunteer shift", hours: 3, status: "VERIFIED" as const, daysAgo: 25 },
  ];
  for (const r of selfReportRows) {
    await db.serviceHourRecord.create({
      data: {
        id: id(),
        userId: r.userId,
        clubId: null,
        hours: r.hours,
        taskDescription: r.task,
        organizationName: r.org,
        supervisorName: "Program Supervisor",
        performedAt: addDays(new Date(), -r.daysAgo),
        selfReported: true,
        status: r.status,
        approvedById: r.status !== "PENDING" ? platformAdminId : null,
        approvedAt: r.status !== "PENDING" ? new Date() : null,
      },
    });
  }
  console.log(`Created ${selfReportRows.length} self-reported service hour records (PENDING/REJECTED seeded directly — see report re: reportSelfServiceHoursAction bug).`);

  // ---------- Notifications (assorted types for a few students) ----------
  const notifSubjects = sample(restIds, 5);
  const notifTypes: { type: string; title: string; body: string; linkUrl?: string }[] = [
    { type: "EVENT_REMINDER", title: "Reminder: Weekly Meeting tomorrow", body: "Don't forget your club meeting tomorrow at 3:30 PM.", linkUrl: "/calendar" },
    { type: "ANNOUNCEMENT", title: "New announcement", body: "Check the latest announcement from your club.", linkUrl: "/notifications" },
    { type: "REGISTRATION", title: "You're registered!", body: "Shoreline Cleanup Day", linkUrl: "/my-events" },
    { type: "SERVICE_HOURS", title: "Service hours verified", body: "Park Cleanup — 3 hours", linkUrl: "/service-hours" },
    { type: "ACHIEVEMENT", title: "Achievement unlocked: First Club Joined", body: "Joined your first club.", linkUrl: "/service-hours" },
    { type: "PLATFORM", title: "Welcome to ClubSync", body: "Complete your profile to get personalized club recommendations.", linkUrl: "/settings" },
  ];
  for (let i = 0; i < notifSubjects.length; i++) {
    const n = notifTypes[i % notifTypes.length];
    await db.notification.create({ data: { id: id(), userId: notifSubjects[i], type: n.type, title: n.title, body: n.body, linkUrl: n.linkUrl, read: Math.random() > 0.5 } });
  }
  console.log(`Created ${notifSubjects.length} assorted notifications.`);

  // ---------- Achievements pass for all simulated students ----------
  let unlocked = 0;
  for (const sid of studentIds) {
    const [membershipCount, hoursAgg, distinctClubs] = await Promise.all([
      db.clubMembership.count({ where: { userId: sid, status: "ACTIVE" } }),
      db.serviceHourRecord.aggregate({ where: { userId: sid, status: "VERIFIED" }, _sum: { hours: true }, _count: true }),
      db.serviceHourRecord.findMany({ where: { userId: sid, status: "VERIFIED" }, distinct: ["clubId"], select: { clubId: true } }),
    ]);
    const totalHours = hoursAgg._sum.hours ?? 0;
    const earned: string[] = [];
    if (membershipCount >= 1) earned.push("first_club_joined");
    if (hoursAgg._count >= 1) earned.push("first_volunteer_event");
    if (totalHours >= 10) earned.push("10_hours");
    if (totalHours >= 50) earned.push("50_hours");
    if (totalHours >= 100) earned.push("100_hours");
    if (distinctClubs.length >= 5) earned.push("community_impact");
    if (earned.length === 0) continue;

    const defs = await db.achievement.findMany({ where: { key: { in: earned } } });
    for (const def of defs) {
      await db.userAchievement.upsert({
        where: { userId_achievementId: { userId: sid, achievementId: def.id } },
        update: {},
        create: { id: id(), userId: sid, achievementId: def.id },
      });
      unlocked++;
    }
  }
  console.log(`Unlocked ${unlocked} achievement rows across simulated students.`);

  // ---------- Summary ----------
  console.log("");
  console.log("=== Simulation seed complete ===");
  console.log(`School: ${SCHOOL_NAME} (id=${school.id})`);
  console.log(`Password for every test account: ${PASSWORD}`);
  console.log("");
  console.log(`Platform Admin (test) → platformadmin@${EMAIL_DOMAIN}`);
  console.log(`School Admin (test)   → schooladmin@${EMAIL_DOMAIN}`);
  console.log(`Principal (test)      → principal@${EMAIL_DOMAIN}`);
  console.log(`Vice Principal (test) → viceprincipal@${EMAIL_DOMAIN}`);
  console.log("");
  console.log("Directors:");
  clubSpecs.forEach((c, i) => console.log(`  teacher${String(i + 1).padStart(2, "0")}@${EMAIL_DOMAIN} → directs ${c.name}`));
  console.log(`  teacher09@${EMAIL_DOMAIN} → no club yet (empty Teacher Dashboard)`);
  console.log(`  teacher10@${EMAIL_DOMAIN} → pending supervisor request for "Anime Club"`);
  console.log("");
  console.log("Hero students (deliberately in several clubs, lots of activity):");
  heroIds.forEach((hid, i) => {
    const meta = studentMeta.find((m) => m.id === hid)!;
    console.log(`  student${String(i + 1).padStart(3, "0")}@${EMAIL_DOMAIN} — ${meta.firstName} ${meta.lastName} (${meta.grade})`);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
