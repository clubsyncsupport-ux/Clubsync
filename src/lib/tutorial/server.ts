import "server-only";
import { parseTutorialState, type TutorialState } from "./state";
import type { TourRole } from "./tours";

/** What a layout hands <TutorialRoot>: who this is, what they've already seen,
 * and the ids lesson routes need. */
export function tutorialPropsFor(
  viewer: { tutorialState: string | null },
  opts: {
    role: TourRole;
    isClubLeader: boolean;
    autoStartPath: string | null;
    ids: { clubId?: string; schoolId?: string };
  },
): {
  role: TourRole;
  initialState: TutorialState;
  isClubLeader: boolean;
  autoStartPath: string | null;
  ids: { clubId?: string; schoolId?: string };
} {
  return { ...opts, initialState: parseTutorialState(viewer.tutorialState) };
}
