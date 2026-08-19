import "server-only";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

// Every /teacher/* page should call this first — mirrors the shape of
// getDirectorContext/getSchoolAdminContext, but there's no resource to scope
// to here (a teacher's account-level dashboard, not one specific club).
export async function requireTeacher() {
  const authUser = await requireUser();
  const user = await db.user.findUniqueOrThrow({ where: { id: authUser.id } });
  if (user.accountKind !== "STAFF") redirect("/home");
  return user;
}
