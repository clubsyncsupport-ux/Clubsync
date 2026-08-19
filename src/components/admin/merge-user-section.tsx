"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { previewMergeCandidateAction, mergeUserAccountsAction, type MergePreview } from "@/app/actions/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, FieldError } from "@/components/ui/input";

export function MergeUserSection({ userId, name }: { userId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [candidate, setCandidate] = useState<MergePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (!open) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Merge Another Account Into This One
      </Button>
    );
  }

  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm font-semibold text-text-primary">Merge Duplicate Account</p>
        <p className="mt-1 text-sm text-text-secondary">
          Find the duplicate account by email. Its club memberships, service hours, and event history move into{" "}
          <span className="font-medium text-text-primary">{name}</span>&rsquo;s account, and it&rsquo;s locked from logging in again.
        </p>

        {!candidate ? (
          <div className="mt-3 flex items-start gap-2">
            <div className="flex-1">
              <Input
                type="email"
                placeholder="duplicate-account@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <FieldError>{error}</FieldError>
            </div>
            <Button
              size="md"
              disabled={pending || !email.trim()}
              onClick={() =>
                startTransition(async () => {
                  setError(null);
                  const res = await previewMergeCandidateAction(userId, email);
                  if (res.error) setError(res.error);
                  else setCandidate(res.candidate ?? null);
                })
              }
            >
              Find
            </Button>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <div className="rounded-xl border border-border bg-surface-2 p-4 text-sm">
              <p className="font-medium text-text-primary">
                {candidate.firstName} {candidate.lastName}
              </p>
              <p className="text-text-secondary">{candidate.email}</p>
              <div className="mt-2 flex gap-4 text-xs text-text-muted">
                <span>{candidate.clubCount} clubs</span>
                <span>{candidate.verifiedHours} verified hours</span>
                <span>{candidate.eventCount} events attended</span>
              </div>
            </div>
            <FieldError>{error}</FieldError>
            <div className="flex items-center gap-3">
              <Button
                variant="danger"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    setError(null);
                    const res = await mergeUserAccountsAction(userId, candidate.id);
                    if (res.error) {
                      setError(res.error);
                    } else {
                      setCandidate(null);
                      setEmail("");
                      setOpen(false);
                      router.refresh();
                    }
                  })
                }
              >
                Confirm Merge
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setCandidate(null);
                  setEmail("");
                  setError(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {!candidate && (
          <button onClick={() => setOpen(false)} className="mt-3 text-xs text-text-muted">
            Cancel
          </button>
        )}
      </CardContent>
    </Card>
  );
}
