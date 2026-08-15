"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { checkAndUnlockAchievements } from "@/lib/achievements";
import { slugify } from "@/lib/slugify";
import { CLUB_COLOR_PALETTE } from "@/lib/constants";

export type CreateClubState = { error: string | null };

export async function createClubAction(_prev: CreateClubState, formData: FormData): Promise<CreateClubState> {
  const authUser = await requireUser();
  const user = await db.user.findUniqueOrThrow({ where: { id: authUser.id } });
  if (!user.schoolId) return { error: "Finish onboarding before creating a club." };

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
      schoolId: user.schoolId,
      meetingSchedule: meetingSchedule || null,
      createdById: user.id,
      memberships: { create: { userId: user.id, role: "DIRECTOR", status: "ACTIVE" } },
    },
  });

  revalidatePath("/discover");
  redirect(`/director/${club.id}`);
}

export async function checkClubNameForSchoolAction(name: string) {
  const authUser = await requireUser();
  const user = await db.user.findUniqueOrThrow({ where: { id: authUser.id } });
  const trimmed = name.trim();
  if (trimmed.length < 3 || !user.schoolId) return { similar: [] as { id: string; name: string }[] };

  const clubs = await db.club.findMany({
    where: { schoolId: user.schoolId, status: "ACTIVE" },
    select: { id: true, name: true },
  });

  const normalized = trimmed.toLowerCase().replace(/[^a-z0-9]/g, "");
  const similar = clubs.filter((c) => {
    const other = c.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    return other === normalized || other.includes(normalized) || normalized.includes(other);
  });

  return { similar };
}

export async function joinClubAction(clubId: string) {
  const user = await requireUser();
  const club = await db.club.findUniqueOrThrow({ where: { id: clubId } });

  await db.clubMembership.upsert({
    where: { userId_clubId: { userId: user.id, clubId } },
    update: { status: club.requiresApproval ? "PENDING" : "ACTIVE" },
    create: { userId: user.id, clubId, role: "MEMBER", status: club.requiresApproval ? "PENDING" : "ACTIVE" },
  });

  await checkAndUnlockAchievements(user.id);

  revalidatePath("/discover");
  revalidatePath(`/clubs/${club.slug}`);
  revalidatePath("/my-clubs");
  revalidatePath("/home");
}

export async function leaveClubAction(clubId: string) {
  const user = await requireUser();
  const club = await db.club.findUniqueOrThrow({ where: { id: clubId } });

  await db.clubMembership.deleteMany({ where: { userId: user.id, clubId } });

  revalidatePath("/discover");
  revalidatePath(`/clubs/${club.slug}`);
  revalidatePath("/my-clubs");
  revalidatePath("/home");
}
