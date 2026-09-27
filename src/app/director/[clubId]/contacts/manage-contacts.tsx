"use client";

import { useActionState, useTransition } from "react";
import { createClubContactAction, deleteClubContactAction, type ActionState } from "@/app/actions/club-contacts";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

type Contact = { id: string; name: string; phone: string };

export function ManageContacts({ clubId, contacts }: { clubId: string; contacts: Contact[] }) {
  return (
    <div className="mt-6 space-y-4">
      {contacts.length === 0 ? (
        <Card>
          <EmptyState icon="📇" title="No contacts yet" description="Add a saved contact below to reuse across event proposals." />
        </Card>
      ) : (
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {contacts.map((c) => (
              <ContactRow key={c.id} contact={c} />
            ))}
          </CardContent>
        </Card>
      )}

      <NewContactForm clubId={clubId} />
    </div>
  );
}

function ContactRow({ contact }: { contact: Contact }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-text-primary">{contact.name}</p>
        <p className="text-xs text-text-muted">{contact.phone}</p>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => deleteClubContactAction(contact.id))}
        className="shrink-0 text-xs font-medium text-danger disabled:opacity-50"
      >
        Delete
      </button>
    </div>
  );
}

function NewContactForm({ clubId }: { clubId: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createClubContactAction.bind(null, clubId), { error: null });

  return (
    <form action={formAction} className="space-y-3 rounded-2xl border border-dashed border-border-strong p-4">
      <p className="text-sm font-semibold text-text-primary">Add a contact</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="contact-name">Name</Label>
          <Input id="contact-name" name="name" placeholder="e.g. Jordan Lee" required />
        </div>
        <div>
          <Label htmlFor="contact-phone">Phone</Label>
          <Input id="contact-phone" name="phone" type="tel" placeholder="(604) 555-0100" required />
        </div>
      </div>
      <FieldError>{state.error}</FieldError>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Adding…" : "Add Contact"}
      </Button>
    </form>
  );
}
