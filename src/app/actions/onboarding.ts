"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { slugify } from "@/lib/slugify";
import { CLUB_COLOR_PALETTE, GRADES } from "@/lib/constants";
import { schoolGradeLevels } from "@/lib/grades";

async function resolveSchoolId(schoolName: string): Promise<string> {
  const name = schoolName.trim();
  const existing = await db.school.findUnique({ where: { name } });
  if (existing) return existing.id;
  const created = await db.school.create({ data: { name } });
  return created.id;
}

export type OnboardingState = { error: string | null };

// Falls back to the standard grade list if the school doesn't exist yet
// (brand-new school being entered for the first time during onboarding).
export async function getGradeLevelsForSchoolAction(schoolName: string): Promise<string[]> {
  const school = await db.school.findUnique({ where: { name: schoolName.trim() }, select: { gradeLevels: true } });
  return school ? schoolGradeLevels(school) : [...GRADES];
}

export async function getClubsForSchoolAction(schoolName: string) {
  const school = await db.school.findUnique({ where: { name: schoolName.trim() } });
  if (!school) return [];
  const clubs = await db.club.findMany({
    where: { schoolId: school.id, status: "ACTIVE" },
    select: { id: true, name: true, category: true, color: true, description: true },
    orderBy: { name: "asc" },
  });
  return clubs;
}

export async function completeStudentOnboardingAction(_prev: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const user = await requireUser();

  const grade = String(formData.get("grade") ?? "");
  const schoolName = String(formData.get("schoolName") ?? "").trim();
  const serviceHourGoal = Number(formData.get("serviceHourGoal") ?? 50);
  const clubIds = formData.getAll("clubIds").map(String);

  if (!schoolName) return { error: "Select or enter your school." };

  const schoolId = await resolveSchoolId(schoolName);

  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: { grade: grade || null, schoolId, serviceHourGoal: Number.isFinite(serviceHourGoal) ? serviceHourGoal : 50 },
    }),
    ...clubIds.map((clubId) =>
      db.clubMembership.upsert({
        where: { userId_clubId: { userId: user.id, clubId } },
        update: {},
        create: { userId: user.id, clubId, role: "MEMBER", status: "ACTIVE" },
      })
    ),
  ]);

  redirect("/home");
}

export async function checkClubNameAction(name: string, schoolName: string): Promise<{ similar: { id: string; name: string }[] }> {
  const trimmed = name.trim();
  if (trimmed.length < 3 || !schoolName.trim()) return { similar: [] };

  const school = await db.school.findUnique({ where: { name: schoolName.trim() } });
  if (!school) return { similar: [] };

  const clubs = await db.club.findMany({
    where: { schoolId: school.id, status: "ACTIVE" },
    select: { id: true, name: true },
  });

  const normalized = trimmed.toLowerCase().replace(/[^a-z0-9]/g, "");
  const similar = clubs.filter((c) => {
    const other = c.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    return other === normalized || other.includes(normalized) || normalized.includes(other);
  });

  return { similar };
}

export async function getTakenColorsForSchoolAction(schoolName: string): Promise<string[]> {
  const school = await db.school.findUnique({ where: { name: schoolName.trim() } });
  if (!school) return [];
  const clubs = await db.club.findMany({ where: { schoolId: school.id, status: "ACTIVE" }, select: { color: true } });
  return clubs.map((c) => c.color);
}

export async function completeDirectorOnboardingAction(_prev: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const user = await requireUser();

  const schoolName = String(formData.get("schoolName") ?? "").trim();
  const clubName = String(formData.get("clubName") ?? "").trim();
  const clubDescription = String(formData.get("clubDescription") ?? "").trim();
  const category = String(formData.get("category") ?? "Other");
  const color = String(formData.get("color") ?? CLUB_COLOR_PALETTE[0].value);
  const meetingSchedule = String(formData.get("meetingSchedule") ?? "").trim();

  if (!schoolName) return { error: "Select or enter your school." };
  if (!clubName || !clubDescription) return { error: "Club name and description are required." };

  const schoolId = await resolveSchoolId(schoolName);

  const baseSlug = slugify(clubName);
  let slug = baseSlug;
  let n = 1;
  while (await db.club.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${++n}`;
  }

  const club = await db.club.create({
    data: {
      name: clubName,
      slug,
      description: clubDescription,
      category,
      color,
      schoolId,
      meetingSchedule: meetingSchedule || null,
      createdById: user.id,
      memberships: {
        create: { userId: user.id, role: "DIRECTOR", status: "ACTIVE" },
      },
    },
  });

  await db.user.update({
    where: { id: user.id },
    data: { schoolId, accountKind: "STAFF" },
  });

  redirect(`/director/${club.id}`);
}
