"use client";

import { useActionState, useState } from "react";
import { createPositionAction, type ActionState } from "@/app/actions/positions";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, FieldError } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export function NewPositionForm({ clubId }: { clubId: string }) {
  const boundAction = async (_prev: ActionState, formData: FormData) => createPositionAction(clubId, _prev, formData);
  const [state, formAction, pending] = useActionState(boundAction, { error: null });
  // A fixed initial key, not crypto.randomUUID() — that would generate a
  // different value during SSR than during client hydration (each call
  // returns something new), causing a hydration mismatch on this row's
  // htmlFor/id attributes. Rows added later via addQuestion() are safe to
  // key randomly since that only ever runs client-side, after a click.
  const [questions, setQuestions] = useState<{ key: string; prompt: string; wordLimit: string }[]>([
    { key: "q-initial", prompt: "", wordLimit: "200" },
  ]);

  function addQuestion() {
    setQuestions((prev) => [...prev, { key: crypto.randomUUID(), prompt: "", wordLimit: "200" }]);
  }
  function removeQuestion(key: string) {
    setQuestions((prev) => (prev.length > 1 ? prev.filter((q) => q.key !== key) : prev));
  }
  function updateQuestion(key: string, field: "prompt" | "wordLimit", value: string) {
    setQuestions((prev) => prev.map((q) => (q.key === key ? { ...q, [field]: value } : q)));
  }

  return (
    <Card className="mt-6">
      <CardContent className="space-y-4 p-5">
        <p className="text-sm font-semibold text-text-primary">New Position</p>
        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" placeholder="e.g. Vice President" required />
          </div>
          <div>
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea id="description" name="description" rows={2} placeholder="What does this role involve?" />
          </div>
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input type="checkbox" name="allowFileUpload" className="h-4 w-4 accent-accent" />
            Allow an uploaded file/PDF instead of (or alongside) written answers
          </label>

          <div className="space-y-3">
            <Label>Application questions</Label>
            {questions.map((q, i) => (
              <div key={q.key} className="space-y-2 rounded-xl border border-border p-3">
                <div className="flex items-center gap-2">
                  <Input
                    name="questionPrompt"
                    value={q.prompt}
                    onChange={(e) => updateQuestion(q.key, "prompt", e.target.value)}
                    placeholder={`Question ${i + 1}`}
                    className="flex-1"
                  />
                  {questions.length > 1 && (
                    <button type="button" onClick={() => removeQuestion(q.key)} className="shrink-0 text-xs font-medium text-danger">
                      Remove
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`wordlimit-${q.key}`} className="mb-0 shrink-0 text-xs text-text-muted">
                    Word limit
                  </Label>
                  <Input
                    id={`wordlimit-${q.key}`}
                    name="questionWordLimit"
                    type="number"
                    min={10}
                    value={q.wordLimit}
                    onChange={(e) => updateQuestion(q.key, "wordLimit", e.target.value)}
                    className="w-24"
                  />
                </div>
              </div>
            ))}
            <Button type="button" variant="secondary" size="sm" onClick={addQuestion}>
              + Add question
            </Button>
          </div>

          <FieldError>{state.error}</FieldError>
          {state.success && <p className="text-sm text-success">Position created.</p>}
          <Button type="submit" disabled={pending}>
            {pending ? "Creating…" : "Create Position"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
