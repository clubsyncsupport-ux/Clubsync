"use client";

import { useState } from "react";
import { useActionState } from "react";
import { updateClubSettingsAction, type ActionState } from "@/app/actions/director-club";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, FieldError } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ImageUploadField } from "@/components/ui/image-upload-field";
import { ClubColorPicker } from "@/components/ui/club-color-picker";
import { CategoryMultiSelect } from "@/components/ui/category-multi-select";
import { parseCategories } from "@/lib/categories";
import { cn } from "@/lib/cn";
import type { Club } from "@prisma/client";

export function ClubSettingsForm({ club, takenColors }: { club: Club; takenColors: string[] }) {
  const boundAction = async (_prev: ActionState, formData: FormData) => updateClubSettingsAction(club.id, formData);
  const [state, formAction, pending] = useActionState(boundAction, { error: null });
  const [color, setColor] = useState(club.color);
  const [isPrivate, setIsPrivate] = useState(club.requiresApproval);
  const [categories, setCategories] = useState<string[]>(parseCategories(club.category));

  return (
    <form action={formAction} className="mt-6 space-y-5">
      <Card>
        <CardContent className="space-y-4 p-5">
          <p className="text-sm font-semibold text-text-primary">Club Information</p>

          <div className="flex items-start gap-4">
            <ImageUploadField
              name="logo"
              currentUrl={club.logoUrl}
              shape="circle"
              size={80}
              fallback={<span className="text-xl font-bold">{club.name[0]}</span>}
              ariaLabel="Change club logo"
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-text-primary">Club logo</p>
              <p className="text-xs text-text-muted">Click to change. Square images work best.</p>
            </div>
          </div>

          <ImageUploadField
            name="banner"
            currentUrl={club.bannerUrl}
            shape="rectangle"
            aspectClassName="aspect-[3/1]"
            fallback={<span className="text-sm">Click to add a banner</span>}
            helperText="Recommended: landscape / wide, around 1200×400px — not a square image."
            ariaLabel="Change club banner"
          />

          <div>
            <Label htmlFor="name">Club name</Label>
            <Input id="name" name="name" defaultValue={club.name} required />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={3} defaultValue={club.description} required />
          </div>
          <div>
            <Label htmlFor="missionStatement">Mission statement (optional)</Label>
            <Input id="missionStatement" name="missionStatement" defaultValue={club.missionStatement ?? ""} />
          </div>
          <div>
            <Label>Category</Label>
            <CategoryMultiSelect value={categories} onChange={setCategories} />
          </div>
          <div>
            <Label>Club color</Label>
            <input type="hidden" name="color" value={color} />
            <ClubColorPicker value={color} onChange={setColor} takenColors={takenColors} />
          </div>

          <div>
            <Label>Club privacy</Label>
            <input type="hidden" name="requiresApproval" value={isPrivate ? "on" : ""} />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsPrivate(false)}
                className={cn(
                  "flex-1 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-colors",
                  !isPrivate ? "border-accent bg-accent-soft text-accent-soft-text" : "border-border text-text-secondary"
                )}
              >
                Public
                <span className="mt-0.5 block text-xs font-normal opacity-80">Anyone can join instantly.</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPrivate(true)}
                className={cn(
                  "flex-1 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-colors",
                  isPrivate ? "border-accent bg-accent-soft text-accent-soft-text" : "border-border text-text-secondary"
                )}
              >
                Private
                <span className="mt-0.5 block text-xs font-normal opacity-80">Requests need approval to join.</span>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-5">
          <p className="text-sm font-semibold text-text-primary">Meeting Details</p>
          <div>
            <Label htmlFor="meetingSchedule">Meeting schedule</Label>
            <Input id="meetingSchedule" name="meetingSchedule" defaultValue={club.meetingSchedule ?? ""} />
          </div>
          <div>
            <Label htmlFor="meetingLocation">Meeting location</Label>
            <Input id="meetingLocation" name="meetingLocation" defaultValue={club.meetingLocation ?? ""} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-5">
          <p className="text-sm font-semibold text-text-primary">Contact</p>
          <div>
            <Label htmlFor="contactEmail">Contact email</Label>
            <Input id="contactEmail" name="contactEmail" type="email" defaultValue={club.contactEmail ?? ""} />
          </div>
          <div>
            <Label htmlFor="instagramUrl">Instagram (optional)</Label>
            <Input id="instagramUrl" name="instagramUrl" defaultValue={club.instagramUrl ?? ""} />
          </div>
          <div>
            <Label htmlFor="websiteUrl">Website (optional)</Label>
            <Input id="websiteUrl" name="websiteUrl" defaultValue={club.websiteUrl ?? ""} />
          </div>
        </CardContent>
      </Card>

      <FieldError>{state.error}</FieldError>
      {state.success && <p className="text-sm text-success">Saved.</p>}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Saving…" : "Save Changes"}
      </Button>
    </form>
  );
}
