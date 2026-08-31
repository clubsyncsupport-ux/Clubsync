"use client";

import { useActionState, useState } from "react";
import { deleteMyAccountAction } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DeleteAccountForm() {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction, pending] = useActionState(deleteMyAccountAction, { error: null });

  return (
    <Card className="border-danger/30">
      <CardHeader>
        <CardTitle className="text-danger">Delete My Account</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-text-secondary">
          Permanently deletes your account, club memberships, event registrations, and logged service hours. This can&rsquo;t
          be undone. If you run a club, delete or transfer it first from that club&rsquo;s Settings page.
        </p>
        {!confirming ? (
          <Button type="button" variant="danger" className="mt-4" onClick={() => setConfirming(true)}>
            Delete My Account…
          </Button>
        ) : (
          <form action={formAction} className="mt-4 space-y-3">
            <div>
              <Label htmlFor="delete-account-password">Enter your password to confirm</Label>
              <Input id="delete-account-password" name="password" type="password" autoComplete="current-password" required />
            </div>
            <FieldError>{state.error}</FieldError>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setConfirming(false)} disabled={pending}>
                Cancel
              </Button>
              <Button type="submit" variant="danger" disabled={pending}>
                {pending ? "Deleting…" : "Permanently Delete My Account"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
