export type TourOutcome = "done" | "skipped";

// Everything we remember about someone's tutorial, stored as JSON text on the
// user. A tour with no entry has never been run (so the quick tour starts
// itself the first time). Outcomes are kept per tour so a teacher who also
// uses the student app gets each quick tour once.
export type TutorialState = {
  tours?: Record<string, TourOutcome>;
  /** Roles that have already been asked "want the in-depth lessons?" */
  offered?: string[];
};

export function parseTutorialState(raw: string | null | undefined): TutorialState {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as TutorialState;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function serializeTutorialState(state: TutorialState): string {
  return JSON.stringify(state);
}
