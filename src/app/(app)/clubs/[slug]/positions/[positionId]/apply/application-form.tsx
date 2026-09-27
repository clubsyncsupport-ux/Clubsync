"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { submitApplicationAction } from "@/app/actions/positions";
import { Button } from "@/components/ui/button";
import { Label, FieldError } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { FileUploadButton } from "@/components/ui/file-upload-button";

type Question = { id: string; prompt: string; wordLimit: number };

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function ApplicationForm({ positionId, allowFileUpload, questions }: { positionId: string; allowFileUpload: boolean; questions: Question[] }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    for (const q of questions) {
      const count = wordCount(answers[q.id] ?? "");
      if (count === 0) {
        setError(`Answer "${q.prompt}" before submitting.`);
        return;
      }
      if (count > q.wordLimit) {
        setError(`Your answer to "${q.prompt}" is over the ${q.wordLimit}-word limit (${count} words).`);
        return;
      }
    }
    startTransition(async () => {
      const res = await submitApplicationAction(positionId, formData);
      if (res?.error) setError(res.error);
      else router.back();
    });
  }

  return (
    <form action={handleSubmit} className="mt-5 space-y-4">
      {questions.map((q) => {
        const value = answers[q.id] ?? "";
        const count = wordCount(value);
        return (
          <Card key={q.id}>
            <CardContent className="space-y-2 p-5">
              <Label htmlFor={`answer-${q.id}`}>{q.prompt}</Label>
              <textarea
                id={`answer-${q.id}`}
                name={`answer-${q.id}`}
                rows={4}
                value={value}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                className="w-full rounded-xl border border-border bg-surface-1 px-3 py-2 text-sm outline-none focus:border-accent"
              />
              <p className={`text-xs ${count > q.wordLimit ? "text-danger" : "text-text-muted"}`}>
                {count} / {q.wordLimit} words
              </p>
            </CardContent>
          </Card>
        );
      })}

      {allowFileUpload && (
        <Card>
          <CardContent className="space-y-2 p-5">
            <Label>Attach a file (optional)</Label>
            <FileUploadButton name="file" accept="image/*,.pdf,.doc,.docx" label="Choose File" />
          </CardContent>
        </Card>
      )}

      <FieldError>{error}</FieldError>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Submitting…" : "Submit Application"}
      </Button>
    </form>
  );
}
