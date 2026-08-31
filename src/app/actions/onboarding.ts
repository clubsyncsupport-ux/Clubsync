"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { GRADES } from "@/lib/constants";
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

// A teacher no longer creates a club as part of onboarding — they land on
// their (possibly empty) Teacher Dashboard and create/get assigned a club
// from there. This just finishes their profile setup.
export async function completeDirectorOnboardingAction(_prev: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const user = await requireUser();

  const schoolName = String(formData.get("schoolName") ?? "").trim();
  if (!schoolName) return { error: "Select or enter your school." };

  const schoolId = await resolveSchoolId(schoolName);
  await db.user.update({
    where: { id: user.id },
    data: { schoolId, accountKind: "STAFF", staffApprovalStatus: "PENDING" },
  });

  redirect("/teacher");
}
