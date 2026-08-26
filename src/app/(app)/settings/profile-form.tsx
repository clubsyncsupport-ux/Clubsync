"use client";

import { useActionState, useState } from "react";
import { updateProfileAction } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, FieldError } from "@/components/ui/input";
import { ImageUploadField } from "@/components/ui/image-upload-field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ProfileForm({
  firstName,
  lastName,
  email,
  bio,
  avatarUrl,
}: {
  firstName: string;
  lastName: string;
  email: string;
  bio: string | null;
  avatarUrl: string | null;
}) {
  const [state, formAction, pending] = useActionState(updateProfileAction, { error: null });
  const [avatarRemoved, setAvatarRemoved] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="flex items-center gap-4">
            <ImageUploadField
              name="avatar"
              currentUrl={avatarUrl}
              shape="circle"
              size={88}
              ariaLabel="Change profile photo"
              fallback={
                <span className="text-2xl font-semibold text-accent-soft-text">
                  {firstName[0]}
                  {lastName[0]}
                </span>
              }
              onRemove={avatarUrl ? () => setAvatarRemoved(true) : undefined}
              onFileSelected={() => setAvatarRemoved(false)}
            />
            <input type="hidden" name="removeAvatar" value={avatarRemoved ? "true" : ""} />
            <div>
              <p className="text-sm font-medium text-text-primary">Profile picture</p>
              <p className="text-xs text-text-muted">Click your photo to change it, or remove it to use your initials instead.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" name="firstName" defaultValue={firstName} required />
            </div>
            <div>
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" name="lastName" defaultValue={lastName} required />
            </div>
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={email} required />
            <p className="mt-1.5 text-xs text-text-muted">Used to log in — change this if you&rsquo;re handing the account off (e.g. to a club&rsquo;s official email).</p>
          </div>
          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" name="bio" rows={2} defaultValue={bio ?? ""} placeholder="Optional" />
          </div>
          <FieldError>{state.error}</FieldError>
          {state.success && <p className="text-sm text-success">Saved.</p>}
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
