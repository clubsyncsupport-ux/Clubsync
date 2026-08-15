"use server";

import { redirect } from "next/navigation";
import { setActiveProfile, type ActiveProfile } from "@/lib/auth/session";

export async function switchProfileAction(profile: ActiveProfile) {
  await setActiveProfile(profile);
  if (profile.kind === "student") redirect("/home");
  if (profile.kind === "director") redirect(`/director/${profile.clubId}`);
  if (profile.kind === "school-admin") redirect(`/school-admin/${profile.schoolId}`);
  redirect("/admin");
}
