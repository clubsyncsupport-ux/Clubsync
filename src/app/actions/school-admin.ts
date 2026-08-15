"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSchoolAdminContext, requireSchoolAccessForUser } from "@/lib/school-admin";
import { logAudit } from "@/lib/admin";
import { slugify } from "@/lib/slugify";
import { CLUB_COLOR_PALETTE, GRADES } from "@/lib/constants";
import { schoolGradeLevels } from "@/lib/grades";

export type SchoolAdminFormState = { error: string | null };

// Lets a School Admin (or Platform Admin) create a club directly at their
// school without needing to be its director themselves — e.g. standing up a
// club before a sponsor teacher has a ClubSync account yet. The school comes
// from getSchoolAdminContext (already verified server-side), never from the
// form, so a club can never be created at a school the caller doesn't manage.
export async function createClubAsSchoolAdminAction(
  schoolId: string,
  _prev: SchoolAdminFormState,
  formData: FormData
): Promise<SchoolAdminFormState> {
  const { school, user } = await getSchoolAdminContext(schoolId);

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "Other");
  const color = String(formData.get("color") ?? CLUB_COLOR_PALETTE[0].value);
  const meetingSchedule = String(formData.get("meetingSchedule") ?? "").trim();
  if (!name || !description) return { error: "Club name and description are required." };

  const baseSlug = slugify(name);
  let slug = baseSlug;
  let n = 1;
  while (await db.club.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${++n}`;
  }

  const club = await db.club.create({
    data: {
      name,
      slug,
      description,
      category,
      color,
      schoolId: school.id,
      meetingSchedule: meetingSchedule || null,
      createdById: user.id,
    },
  });

  await logAudit(user.id, "CREATE_CLUB", "Club", club.id, undefined, { schoolId: school.id, name });
  revalidatePath(`/school-admin/${school.id}/clubs`);
  redirect(`/school-admin/${school.id}/clubs/${club.id}`);
}

export type UpdateGradeLevelsState = { error: string | null; success?: boolean };

// A school's grade levels are always an ordered subset of the standard GRADES
// list (not free-text) — this is what keeps every place that compares/sorts
// grades (event eligibility, member grouping, advancement) safe.
export async function updateGradeLevelsAction(
  schoolId: string,
  _prev: UpdateGradeLevelsState,
  formData: FormData
): Promise<UpdateGradeLevelsState> {
  const { school, user } = await getSchoolAdminContext(schoolId);

  const selected = formData.getAll("gradeLevels").map(String);
  const ordered = GRADES.filter((g) => selected.includes(g));
  if (ordered.length === 0) return { error: "Select at least one grade level." };

  const before = school.gradeLevels;
  const newValue = ordered.join(",");
  await db.school.update({ where: { id: schoolId }, data: { gradeLevels: newValue } });
  await logAudit(user.id, "UPDATE_GRADE_LEVELS", "School", schoolId, { gradeLevels: before }, { gradeLevels: newValue });
  revalidatePath(`/school-admin/${schoolId}/settings`);
  revalidatePath(`/admin/schools/${schoolId}`);
  return { error: null, success: true };
}

export type UpdateStudentGradeState = { error: string | null; success?: boolean };

// Grade is editable for the first time anywhere in the app via this action —
// deliberately restricted to one of the target student's own school's
// configured levels, and scoped through requireSchoolAccessForUser so a
// School Admin can only ever do this to a STUDENT at their own school.
export async function updateStudentGradeAction(
  userId: string,
  _prev: UpdateStudentGradeState,
  formData: FormData
): Promise<UpdateStudentGradeState> {
  const { me, targetUser } = await requireSchoolAccessForUser(userId);

  const newGrade = String(formData.get("grade") ?? "");
  if (!targetUser.schoolId) return { error: "This student has no school on file." };
  const school = await db.school.findUniqueOrThrow({ where: { id: targetUser.schoolId } });
  const allowed = schoolGradeLevels(school);
  if (!allowed.includes(newGrade)) return { error: "Not a valid grade level for this student's school." };

  await db.user.update({ where: { id: userId }, data: { grade: newGrade } });
  await logAudit(me.id, "UPDATE_STUDENT_GRADE", "User", userId, { grade: targetUser.grade }, { grade: newGrade });
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath(`/school-admin/${targetUser.schoolId}/students/${userId}`);
  return { error: null, success: true };
}
