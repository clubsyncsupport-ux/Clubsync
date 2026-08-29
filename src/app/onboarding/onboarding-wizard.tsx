"use client";

import { useEffect, useState, useTransition } from "react";
import {
  completeDirectorOnboardingAction,
  completeStudentOnboardingAction,
  getClubsForSchoolAction,
  getGradeLevelsForSchoolAction,
} from "@/app/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { parseCategories } from "@/lib/categories";
import { ColorDot } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { SERVICE_HOUR_GOALS } from "@/lib/constants";

type AccountType = "student" | "director";
type Step = "type" | "basics" | "clubs" | "goal";

const FALLBACK_GRADES = ["Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"];
const DEFAULT_SCHOOL = "Hugh Boyd Secondary School";

export function OnboardingWizard({ firstName, schoolNames }: { firstName: string; schoolNames: string[] }) {
  const [step, setStep] = useState<Step>("type");
  const [accountType, setAccountType] = useState<AccountType>("student");
  const [grade, setGrade] = useState("Grade 10");
  const [schoolName, setSchoolName] = useState("");
  const [serviceHourGoal, setServiceHourGoal] = useState("50");

  const [clubs, setClubs] = useState<{ id: string; name: string; category: string; color: string; description: string }[]>([]);
  const [selectedClubIds, setSelectedClubIds] = useState<string[]>([]);
  const [gradeLevels, setGradeLevels] = useState<string[]>(FALLBACK_GRADES);

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (step !== "basics" || accountType !== "student") return;
    const t = setTimeout(() => {
      getGradeLevelsForSchoolAction(schoolName).then(setGradeLevels);
    }, 300);
    return () => clearTimeout(t);
  }, [step, accountType, schoolName]);

  useEffect(() => {
    if (step !== "clubs") return;
    getClubsForSchoolAction(schoolName).then(setClubs);
  }, [step, schoolName]);

  function toggleClub(id: string) {
    setSelectedClubIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  function submitStudent() {
    setError(null);
    const fd = new FormData();
    fd.set("grade", grade);
    fd.set("schoolName", schoolName);
    fd.set("serviceHourGoal", String(Number(serviceHourGoal) || 1));
    selectedClubIds.forEach((id) => fd.append("clubIds", id));
    startTransition(async () => {
      const res = await completeStudentOnboardingAction({ error: null }, fd);
      if (res.error) setError(res.error);
    });
  }

  function submitDirector() {
    setError(null);
    const fd = new FormData();
    fd.set("schoolName", schoolName);
    startTransition(async () => {
      const res = await completeDirectorOnboardingAction({ error: null }, fd);
      if (res.error) setError(res.error);
    });
  }

  const stepIndex = { type: 0, basics: 1, clubs: 2, goal: 3 }[step];
  const totalSteps = accountType === "student" ? 4 : 2;

  return (
    <div className="animate-fade-in">
      <div className="mb-8 flex gap-1.5">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} className={cn("h-1.5 flex-1 rounded-full", i <= stepIndex ? "bg-accent" : "bg-border")} />
        ))}
      </div>

      {step === "type" && (
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Hi {firstName} 👋</h1>
          <p className="mt-1 text-[15px] text-text-secondary">How will you be using ClubSync?</p>

          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={() => setAccountType("student")}
              className={cn(
                "w-full rounded-2xl border p-5 text-left transition-colors",
                accountType === "student" ? "border-accent bg-accent-soft" : "border-border bg-surface-1 hover:border-border-strong"
              )}
            >
              <p className="font-semibold text-text-primary">Student</p>
              <p className="mt-1 text-sm text-text-secondary">Join clubs, track your calendar, and log verified service hours.</p>
            </button>
            <button
              type="button"
              onClick={() => setAccountType("director")}
              className={cn(
                "w-full rounded-2xl border p-5 text-left transition-colors",
                accountType === "director" ? "border-accent bg-accent-soft" : "border-border bg-surface-1 hover:border-border-strong"
              )}
            >
              <p className="font-semibold text-text-primary">Teacher</p>
              <p className="mt-1 text-sm text-text-secondary">Run and supervise a club — events, members, announcements, and more.</p>
            </button>
          </div>

          <Button size="lg" className="mt-8 w-full" onClick={() => setStep("basics")}>
            Continue
          </Button>
        </div>
      )}

      {step === "basics" && (
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            {accountType === "director" ? "A bit about your club" : "A bit about you"}
          </h1>
          <p className="mt-1 text-[15px] text-text-secondary">
            {accountType === "director"
              ? "This account is for running the club — no personal student profile needed."
              : "This helps personalize your ClubSync experience."}
          </p>

          <div className="mt-6 space-y-4">
            {accountType === "student" && (
              <div>
                <Label>Grade</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[...gradeLevels, "University / Other"].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGrade(g)}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                        grade === g ? "border-accent bg-accent-soft text-accent-soft-text" : "border-border bg-surface-1 text-text-secondary hover:border-border-strong"
                      )}
                    >
                      {g.replace("Grade ", "")}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="school">School / Organization</Label>
              <Combobox
                id="school"
                value={schoolName}
                onChange={setSchoolName}
                options={[DEFAULT_SCHOOL, ...schoolNames].filter((v, i, a) => a.indexOf(v) === i)}
                placeholder={DEFAULT_SCHOOL}
              />
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            <Button variant="secondary" size="lg" onClick={() => setStep("type")}>
              Back
            </Button>
            <Button
              size="lg"
              className="flex-1"
              disabled={!schoolName.trim() || pending}
              onClick={() => (accountType === "student" ? setStep("clubs") : submitDirector())}
            >
              {accountType === "director" && pending ? "Setting up…" : "Continue"}
            </Button>
          </div>
          {accountType === "director" && <FieldError>{error}</FieldError>}
        </div>
      )}

      {step === "clubs" && accountType === "student" && (
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Join some clubs</h1>
          <p className="mt-1 text-[15px] text-text-secondary">Optional — you can always join more later from Discover.</p>

          <div className="mt-6 max-h-80 space-y-2 overflow-y-auto">
            {clubs.length === 0 && (
              <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-text-muted">
                No clubs at this school yet. You can join clubs anytime from Discover.
              </p>
            )}
            {clubs.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleClub(c.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
                  selectedClubIds.includes(c.id) ? "border-accent bg-accent-soft" : "border-border bg-surface-1 hover:border-border-strong"
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    selectedClubIds.includes(c.id) ? "border-accent bg-accent" : "border-border-strong"
                  )}
                >
                  {selectedClubIds.includes(c.id) && <span className="h-2 w-2 rounded-full bg-on-accent" />}
                </span>
                <ColorDot color={c.color} />
                <span className="flex-1 text-sm font-medium text-text-primary">{c.name}</span>
                <span className="text-xs text-text-muted">{parseCategories(c.category).join(", ")}</span>
              </button>
            ))}
          </div>

          <div className="mt-8 flex gap-3">
            <Button variant="secondary" size="lg" onClick={() => setStep("basics")}>
              Back
            </Button>
            <Button size="lg" className="flex-1" onClick={() => setStep("goal")}>
              Continue
            </Button>
          </div>
        </div>
      )}

      {step === "goal" && accountType === "student" && (
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Set a service hour goal</h1>
          <p className="mt-1 text-[15px] text-text-secondary">You can change this anytime in Settings.</p>

          <div className="mt-6 grid grid-cols-3 gap-2">
            {SERVICE_HOUR_GOALS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setServiceHourGoal(String(g))}
                className={cn(
                  "rounded-xl border px-3 py-3 text-sm font-semibold transition-colors",
                  Number(serviceHourGoal) === g ? "border-accent bg-accent-soft text-accent-soft-text" : "border-border bg-surface-1 text-text-secondary hover:border-border-strong"
                )}
              >
                {g} hrs
              </button>
            ))}
          </div>
          <div className="mt-3">
            <Label htmlFor="customGoal">Custom goal</Label>
            <Input
              id="customGoal"
              type="number"
              min={1}
              value={serviceHourGoal}
              onChange={(e) => setServiceHourGoal(e.target.value)}
            />
          </div>

          <FieldError>{error}</FieldError>

          <div className="mt-8 flex gap-3">
            <Button variant="secondary" size="lg" onClick={() => setStep("clubs")}>
              Back
            </Button>
            <Button size="lg" className="flex-1" onClick={submitStudent} disabled={pending}>
              {pending ? "Setting up…" : "Complete Registration"}
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}
