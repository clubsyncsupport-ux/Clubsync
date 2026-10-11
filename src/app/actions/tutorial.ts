"use server";

import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getTour } from "@/lib/tutorial/tours";
import { parseTutorialState, serializeTutorialState, type TourOutcome, type TutorialState } from "@/lib/tutorial/state";

async function update(mutate: (state: TutorialState) => TutorialState): Promise<TutorialState> {
  const authUser = await requireUser();
  const me = await db.user.findUniqueOrThrow({ where: { id: authUser.id }, select: { tutorialState: true } });
  const next = mutate(parseTutorialState(me.tutorialState));
  await db.user.update({ where: { id: authUser.id }, data: { tutorialState: serializeTutorialState(next) } });
  return next;
}

// Remembers that a tour was finished or skipped, so it doesn't start itself
// again. A lesson can be replayed any time from Settings.
export async function saveTutorialOutcomeAction(tourId: string, outcome: TourOutcome): Promise<TutorialState> {
  if (!getTour(tourId) || (outcome !== "done" && outcome !== "skipped")) return {};
  return update((s) => ({ ...s, tours: { ...s.tours, [tourId]: outcome } }));
}

// The "want the in-depth lessons?" pop-up is only shown once per role.
export async function markAdvancedOfferedAction(role: string): Promise<TutorialState> {
  if (role !== "student" && role !== "teacher" && role !== "admin") return {};
  return update((s) => ({ ...s, offered: Array.from(new Set([...(s.offered ?? []), role])) }));
}

// "Start over" in Settings — the quick tour will show itself again next time.
export async function resetTutorialAction(): Promise<TutorialState> {
  return update(() => ({}));
}
