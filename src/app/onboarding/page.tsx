import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { OnboardingWizard } from "./onboarding-wizard";

export const metadata: Metadata = { title: "Get Started" };

export default async function OnboardingPage() {
  const authUser = await requireUser();
  const user = await db.user.findUniqueOrThrow({ where: { id: authUser.id } });
  if (user.schoolId) redirect("/home");

  const schools = await db.school.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="min-h-dvh bg-surface-0 px-6 py-10">
      <div className="mx-auto w-full max-w-lg">
        <OnboardingWizard firstName={user.firstName} schoolNames={schools.map((s) => s.name)} />
      </div>
    </div>
  );
}
