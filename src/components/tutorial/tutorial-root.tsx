"use client";

import { Suspense, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Sparkles, X } from "lucide-react";
import { basicTourFor, getTour, settingsHint, toursForRole, type Tour, type TourRole } from "@/lib/tutorial/tours";
import type { TourOutcome, TutorialState } from "@/lib/tutorial/state";
import { markAdvancedOfferedAction, resetTutorialAction, saveTutorialOutcomeAction } from "@/app/actions/tutorial";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type Rect = { top: number; left: number; width: number; height: number };

type TutorialContextValue = {
  role: TourRole;
  state: TutorialState;
  /** The quick tour plus every lesson this person can take. */
  tours: Tour[];
  /** Starts a tour, going to the page it begins on first if needed. */
  launch: (tourId: string) => void;
  reset: () => Promise<void>;
};

const TutorialContext = createContext<TutorialContextValue | null>(null);

/** Null outside a shell that mounts the tutorial (e.g. the platform admin area). */
export function useTutorial() {
  return useContext(TutorialContext);
}

type Active = { tour: Tour; index: number; queue: string[]; replay: boolean };
type Panel = "offer" | "chooser" | "hint" | null;

const SPOTLIGHT_PAD = 6;

// Each area of the app (student, teacher, a club's management screens, school
// admin) is its own layout with its own tour engine, so a lesson can't carry on
// across areas by itself — it has to be handed over through the address.
function areaOf(path: string) {
  const first = path.split("?")[0].split("/")[1] ?? "";
  return ["director", "teacher", "school-admin", "admin"].includes(first) ? first : "app";
}

function findVisible(ids: string[]): HTMLElement | null {
  for (const id of ids) {
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${id}"]`))) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) return el;
    }
  }
  return null;
}

// Fixed and sticky things (the nav bars) are always on screen, so scrolling the
// page for them would only make it jump.
function isPinned(el: HTMLElement) {
  for (let node: HTMLElement | null = el; node && node !== document.body; node = node.parentElement) {
    const position = getComputedStyle(node).position;
    if (position === "fixed" || position === "sticky") return true;
  }
  return false;
}

// Bring the target into the middle of the screen when it's off the top or
// bottom. Only ever scrolls up/down — a sideways nudge would shift the page.
function revealVertically(el: HTMLElement) {
  if (isPinned(el)) return;
  const r = el.getBoundingClientRect();
  if (r.top < 72 || r.bottom > window.innerHeight - 72) window.scrollBy({ top: r.top + r.height / 2 - window.innerHeight / 2 });
}

function measure(el: HTMLElement): Rect {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function sameRect(a: Rect | null, b: Rect) {
  return !!a && Math.abs(a.top - b.top) < 1 && Math.abs(a.left - b.left) < 1 && Math.abs(a.width - b.width) < 1 && Math.abs(a.height - b.height) < 1;
}

export function TutorialRoot({
  role,
  initialState,
  isClubLeader,
  autoStartPath,
  ids,
  children,
}: {
  role: TourRole;
  initialState: TutorialState;
  /** Only people who run a club get the "Running a club" lesson. */
  isClubLeader: boolean;
  /** The page the quick tour starts itself on, the first time they land there. */
  autoStartPath: string | null;
  /** Fills `{clubId}` / `{schoolId}` in lesson routes. */
  ids: { clubId?: string; schoolId?: string };
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<TutorialState>(initialState);
  const [active, setActive] = useState<Active | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  // Where the spotlight target was last measured. Between steps the old
  // position stays until the new one is found, so the spotlight slides from one
  // target to the next instead of blinking out.
  const [measured, setMeasured] = useState<{ key: string; rect: Rect | null } | null>(null);
  const autoStarted = useRef(false);
  const navigatedFor = useRef<string | null>(null);

  const tours = useMemo(() => toursForRole(role, { isClubLeader }), [role, isClubLeader]);
  const basic = useMemo(() => basicTourFor(role), [role]);
  const chapters = useMemo(() => tours.filter((t) => t.kind === "chapter"), [tours]);

  const fillRoute = useCallback(
    (route: string) => route.replace("{clubId}", ids.clubId ?? "").replace("{schoolId}", ids.schoolId ?? ""),
    [ids.clubId, ids.schoolId],
  );

  // Opens a tour's start page with the tour (and any lessons queued behind it)
  // in the address; the engine on that page picks it up from there.
  const handOver = useCallback(
    (tourId: string, queue: string[], replay: boolean) => {
      const tour = getTour(tourId);
      if (!tour) return;
      const route = fillRoute(tour.startRoute);
      const params = new URLSearchParams({ tour: tourId });
      if (queue.length) params.set("queue", queue.join(","));
      if (replay) params.set("replay", "1");
      router.push(`${route}${route.includes("?") ? "&" : "?"}${params}`);
    },
    [fillRoute, router],
  );

  const begin = useCallback(
    (tourId: string, queue: string[] = [], replay = false) => {
      const tour = getTour(tourId);
      if (!tour) return;
      if (tour.kind === "chapter" && areaOf(fillRoute(tour.startRoute)) !== areaOf(pathname)) {
        setPanel(null);
        setActive(null);
        handOver(tourId, queue, replay);
        return;
      }
      navigatedFor.current = null;
      setPanel(null);
      setMeasured(null);
      setActive({ tour, index: 0, queue, replay });
    },
    [fillRoute, pathname, handOver],
  );

  // Starting a tour from Settings: it begins on the page it belongs to.
  const launch = useCallback((tourId: string) => handOver(tourId, [], true), [handOver]);

  // The quick tour starts by itself, once, the first time someone lands on
  // their home page.
  useEffect(() => {
    if (autoStarted.current || !basic || !autoStartPath) return;
    if (state.tours?.[basic.id] || pathname !== fillRoute(autoStartPath)) return;
    if (new URLSearchParams(window.location.search).has("tour")) return;
    autoStarted.current = true;
    const timer = window.setTimeout(() => begin(basic.id), 1200);
    return () => {
      window.clearTimeout(timer);
      autoStarted.current = false;
    };
  }, [basic, autoStartPath, pathname, state.tours, begin, fillRoute]);

  const step = active ? active.tour.steps[active.index] : null;
  const hint = panel === "hint" ? settingsHint(role) : null;
  const shown = step ?? hint;
  const shownKey = active ? `${active.tour.id}:${active.index}` : hint ? "hint" : "";
  const targetKey = shown?.target ? (Array.isArray(shown.target) ? shown.target : [shown.target]).join(",") : "";
  const rect = measured?.rect ?? null;

  // Take people to the page a step lives on (once per lesson page, so a page
  // that redirects can't leave us pushing forever).
  let stepRoute: string | null = null;
  if (active) {
    for (let i = active.index; i >= 0 && !stepRoute; i--) {
      const r = active.tour.steps[i].route;
      if (r) stepRoute = fillRoute(r);
    }
    if (!stepRoute && active.tour.kind === "chapter") stepRoute = fillRoute(active.tour.startRoute);
  }
  const activeTourId = active?.tour.id;
  useEffect(() => {
    if (!activeTourId || !stepRoute) return;
    const key = `${activeTourId}:${stepRoute}`;
    if (navigatedFor.current === key) return;
    navigatedFor.current = key;
    if (pathname !== stepRoute.split("?")[0]) router.push(stepRoute);
  }, [activeTourId, stepRoute, pathname, router]);

  // Find the spotlight target (waiting briefly for it to appear after a page
  // change) and keep its position fresh while the step is on screen.
  useEffect(() => {
    if (!shownKey) return;
    const wanted = targetKey ? targetKey.split(",") : [];
    let cancelled = false;
    let el: HTMLElement | null = null;
    let poll: number | undefined;
    let track: number | undefined;
    const started = performance.now();

    const locate = () => {
      if (cancelled) return;
      el = wanted.length ? findVisible(wanted) : null;
      if (el) {
        revealVertically(el);
        setMeasured({ key: shownKey, rect: measure(el) });
        track = window.setInterval(() => {
          if (!el || !el.isConnected) el = findVisible(wanted);
          if (el) {
            const next = measure(el);
            setMeasured((prev) => (prev && prev.key === shownKey && sameRect(prev.rect, next) ? prev : { key: shownKey, rect: next }));
          }
        }, 250);
      } else if (wanted.length && performance.now() - started < 12000) {
        poll = window.setTimeout(locate, 200);
      } else {
        setMeasured({ key: shownKey, rect: null });
      }
    };
    poll = window.setTimeout(locate, 60);
    return () => {
      cancelled = true;
      window.clearTimeout(poll);
      window.clearInterval(track);
    };
  }, [shownKey, targetKey, pathname]);

  // While a tour is up the page behind it shouldn't scroll or be clickable.
  const overlayOpen = !!shown || panel === "offer" || panel === "chooser";
  useEffect(() => {
    if (!overlayOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [overlayOpen]);

  const persist = useCallback(async (tourId: string, outcome: TourOutcome) => {
    setState((prev) => ({
      ...prev,
      tours: { ...prev.tours, [tourId]: outcome },
    }));
    try {
      setState(await saveTutorialOutcomeAction(tourId, outcome));
    } catch {
      // The tour itself already ended; failing to save only means it may show
      // itself once more.
    }
  }, []);

  const finish = useCallback(
    (outcome: TourOutcome, stopAll = false) => {
      if (!active) return;
      const { tour, queue, replay } = active;
      setActive(null);
      setMeasured(null);
      void persist(tour.id, outcome);
      if (tour.kind === "basic") {
        if (replay) return;
        // Finished it the first time: offer the in-depth lessons once. Skipped
        // it: no pitch, just a pointer to where the lessons live.
        if (outcome === "done" && !state.offered?.includes(role) && chapters.length > 0) {
          setState((prev) => ({
            ...prev,
            offered: [...(prev.offered ?? []), role],
          }));
          void markAdvancedOfferedAction(role);
          setPanel("offer");
        } else if (outcome === "skipped") {
          setPanel("hint");
        }
        return;
      }
      if (!stopAll && queue.length > 0) begin(queue[0], queue.slice(1), replay);
    },
    [active, state.offered, role, chapters.length, persist, begin],
  );

  const next = useCallback(() => {
    if (!active) return;
    if (active.index >= active.tour.steps.length - 1) finish("done");
    else setActive({ ...active, index: active.index + 1 });
  }, [active, finish]);

  const back = useCallback(() => {
    if (active && active.index > 0) setActive({ ...active, index: active.index - 1 });
  }, [active]);

  const close = useCallback(() => {
    if (active) finish("skipped", true);
    else {
      setPanel(null);
      setMeasured(null);
    }
  }, [active, finish]);

  useEffect(() => {
    if (!overlayOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      else if (active && e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") back();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [overlayOpen, active, close, next, back]);

  const reset = useCallback(async () => {
    setState({});
    try {
      setState(await resetTutorialAction());
    } catch {
      // Settings shows the real state on the next load.
    }
  }, []);

  const ctx = useMemo<TutorialContextValue>(() => ({ role, state, tours, launch, reset }), [role, state, tours, launch, reset]);

  // Put the card on the opposite half of the screen from what it points at.
  const targetInLowerHalf = rect ? rect.top + rect.height / 2 > window.innerHeight * 0.5 : false;
  const cardPosition = !rect ? "top-1/2 -translate-y-1/2" : targetInLowerHalf ? "top-16" : "bottom-4";
  // The skip button lives top-right; if the spotlight is up there (the profile
  // menu on a phone) it moves to the top-left so it never covers the target.
  const skipOnLeft = !!rect && rect.top < 64 && rect.left + rect.width > window.innerWidth - 170;
  const isChapter = active?.tour.kind === "chapter";
  const moreLessons = (active?.queue.length ?? 0) > 0;

  return (
    <TutorialContext.Provider value={ctx}>
      {children}
      <Suspense fallback={null}>
        <TourParamListener onStart={begin} />
      </Suspense>

      {shown && (
        <>
          <div className="fixed inset-0 z-[100]" aria-hidden />
          {rect ? (
            <div
              key="spotlight"
              className="pointer-events-none fixed z-[101] rounded-xl ring-2 ring-accent transition-all duration-200"
              style={{
                top: rect.top - SPOTLIGHT_PAD,
                left: rect.left - SPOTLIGHT_PAD,
                width: rect.width + SPOTLIGHT_PAD * 2,
                height: rect.height + SPOTLIGHT_PAD * 2,
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.72)",
              }}
            />
          ) : (
            <div key="dim" className="pointer-events-none fixed inset-0 z-[101] bg-black/70" />
          )}

          <button
            type="button"
            onClick={close}
            className={cn(
              "fixed top-3 z-[103] flex items-center gap-1.5 rounded-full bg-surface-1 px-3.5 py-2 text-sm font-semibold text-text-primary shadow-[var(--shadow-lg)] hover:bg-surface-2",
              skipOnLeft ? "left-3" : "right-3",
            )}
          >
            <X className="h-4 w-4" strokeWidth={2.25} />
            {hint ? "Got it" : isChapter ? "Skip lesson" : "Skip tour"}
          </button>

          <div
            className={cn(
              "fixed inset-x-3 z-[102] mx-auto w-auto max-w-md rounded-2xl border border-border bg-surface-1 p-4 shadow-[var(--shadow-lg)]",
              cardPosition,
            )}
            role="dialog"
            aria-live="polite"
          >
            <div className="flex items-center gap-2 text-xs font-medium text-accent">
              <Sparkles className="h-3.5 w-3.5" strokeWidth={2.25} />
              {active ? `${active.tour.title} · ${active.index + 1} of ${active.tour.steps.length}` : "Tip"}
            </div>
            <p className="mt-1.5 text-base font-semibold text-text-primary">{shown.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-text-secondary">{shown.body}</p>
            {active ? (
              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="flex gap-1">
                  {active.tour.steps.map((_, i) => (
                    <span key={i} className={cn("h-1.5 rounded-full transition-all", i === active.index ? "w-4 bg-accent" : "w-1.5 bg-border-strong")} />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  {moreLessons && (
                    <button type="button" onClick={() => finish("skipped", true)} className="text-xs font-medium text-text-muted hover:text-text-primary">
                      Skip all lessons
                    </button>
                  )}
                  {active.index > 0 && (
                    <Button type="button" size="sm" variant="secondary" onClick={back} aria-label="Previous step">
                      <ChevronLeft className="h-4 w-4" strokeWidth={2.25} />
                    </Button>
                  )}
                  <Button type="button" size="sm" onClick={next}>
                    {active.index >= active.tour.steps.length - 1 ? "Done" : "Next"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex justify-end">
                <Button type="button" size="sm" onClick={close}>
                  Got it
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      {(panel === "offer" || panel === "chooser") && (
        <>
          <div className="fixed inset-0 z-[100] bg-black/70" onClick={close} />
          <div className="fixed inset-x-0 bottom-0 z-[102] mx-auto max-h-[60vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-border bg-surface-1 p-5 shadow-[var(--shadow-lg)]">
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute right-4 top-4 rounded-full p-1 text-text-muted hover:bg-surface-2 hover:text-text-primary"
            >
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
            {panel === "offer" ? (
              <>
                <div className="flex items-center gap-2 text-xs font-medium text-accent">
                  <Sparkles className="h-3.5 w-3.5" strokeWidth={2.25} />
                  Nice work
                </div>
                <p className="mt-1.5 text-lg font-semibold text-text-primary">Want the in-depth tour?</p>
                <p className="mt-1 pr-6 text-sm leading-relaxed text-text-secondary">
                  Short lessons on how everything works. You can skip any of them, and take them one at a time later in Settings.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    onClick={() =>
                      begin(
                        chapters[0].id,
                        chapters.slice(1).map((c) => c.id),
                      )
                    }
                  >
                    Show me everything
                  </Button>
                  <Button variant="secondary" onClick={() => setPanel("chooser")}>
                    Let me pick
                  </Button>
                  <Button variant="ghost" onClick={() => setPanel("hint")}>
                    Not now
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-lg font-semibold text-text-primary">Pick a lesson</p>
                <div className="mt-3 space-y-2">
                  {chapters.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => begin(c.id)}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-border p-3 text-left hover:border-border-strong"
                    >
                      <span>
                        <span className="block text-sm font-semibold text-text-primary">{c.title}</span>
                        <span className="block text-xs text-text-secondary">{c.blurb}</span>
                      </span>
                      {state.tours?.[c.id] === "done" && <span className="text-xs font-medium text-success">Done</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </TutorialContext.Provider>
  );
}

// `?tour=<id>` in the address starts that tour (this is how Settings sends
// someone to the page a lesson begins on), then tidies the address.
function TourParamListener({ onStart }: { onStart: (tourId: string, queue: string[], replay: boolean) => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tourId = params.get("tour");
  const queueParam = params.get("queue");
  const replay = params.get("replay") === "1";
  useEffect(() => {
    if (!tourId) return;
    const timer = window.setTimeout(() => {
      if (getTour(tourId)) onStart(tourId, queueParam ? queueParam.split(",").filter((id) => getTour(id)) : [], replay);
      router.replace(pathname, { scroll: false });
    }, 400);
    return () => window.clearTimeout(timer);
    // onStart is a fresh closure each render; only the param should re-arm this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourId, queueParam, replay, pathname, router]);
  return null;
}
