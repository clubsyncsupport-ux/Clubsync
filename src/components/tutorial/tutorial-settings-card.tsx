"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTutorial } from "./tutorial-root";

const STATUS_LABEL = { done: "Done", skipped: "Skipped" } as const;

// Lives in Settings, under Service Hours: replay the quick tour, take any
// in-depth lesson on its own, or start the whole thing over.
export function TutorialSettingsCard() {
  const tutorial = useTutorial();
  const [resetNote, setResetNote] = useState(false);
  if (!tutorial) return null;

  const { tours, state, launch, reset } = tutorial;
  const quick = tours.find((t) => t.kind === "basic");
  const lessons = tours.filter((t) => t.kind === "chapter");

  return (
    <Card id="tutorial">
      <CardHeader>
        <CardTitle>Tutorial</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {quick && (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary">{quick.title}</p>
              <p className="text-xs text-text-secondary">{quick.blurb}</p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => launch(quick.id)}>
              Replay
            </Button>
          </div>
        )}

        {lessons.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">In-depth lessons</p>
            {lessons.map((lesson) => {
              const outcome = state.tours?.[lesson.id];
              return (
                <div key={lesson.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-primary">{lesson.title}</p>
                    <p className="text-xs text-text-secondary">{lesson.blurb}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {outcome && (
                      <span className={outcome === "done" ? "text-xs font-medium text-success" : "text-xs text-text-muted"}>{STATUS_LABEL[outcome]}</span>
                    )}
                    <Button size="sm" variant="secondary" onClick={() => launch(lesson.id)}>
                      {outcome ? "Replay" : "Start"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-3 border-t border-border pt-3">
          <Button
            size="sm"
            variant="ghost"
            onClick={async () => {
              await reset();
              setResetNote(true);
            }}
          >
            Start over
          </Button>
          <p className="text-xs text-text-muted">
            {resetNote ? "Done — the quick tour will play again the next time you open your home page." : "Resets your progress so the quick tour plays again."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
