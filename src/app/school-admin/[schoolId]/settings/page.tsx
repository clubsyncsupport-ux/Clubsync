import type { Metadata } from "next";
import { getSchoolAdminContext } from "@/lib/school-admin";
import { schoolGradeLevels } from "@/lib/grades";
import { Card, CardContent } from "@/components/ui/card";
import { GradeLevelsForm } from "./grade-levels-form";

export const metadata: Metadata = { title: "School Settings" };

export default async function SchoolAdminSettingsPage({ params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params;
  const { school } = await getSchoolAdminContext(schoolId);

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-text-primary">School Settings</h1>

      <Card className="mt-5">
        <CardContent className="space-y-3 p-5">
          <p className="text-sm font-semibold text-text-primary">Grade Levels</p>
          <GradeLevelsForm schoolId={school.id} current={schoolGradeLevels(school)} />
        </CardContent>
      </Card>
    </div>
  );
}
