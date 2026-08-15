"use client";

import { useActionState, useState, useTransition } from "react";
import { createPersonalCategoryAction, deletePersonalCategoryAction } from "@/app/actions/personal-events";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ClubColorPicker } from "@/components/ui/club-color-picker";
import { ColorDot } from "@/components/ui/badge";

type Category = { id: string; name: string; color: string };

export function ColorIndex({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        🎨 Color Index
      </Button>
    );
  }

  return (
    <Card className="mt-3 w-full">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-text-primary">Your color index</p>
          <button type="button" onClick={() => setOpen(false)} className="text-xs text-text-muted hover:text-danger">
            Close
          </button>
        </div>
        <p className="mt-1 text-xs text-text-muted">
          Build your own legend — e.g. purple for volunteering, blue for school clubs — then pick one when adding a personal event.
        </p>

        {categories.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {categories.map((c) => (
              <CategoryRow key={c.id} category={c} />
            ))}
          </div>
        )}

        <AddCategoryForm takenColors={categories.map((c) => c.color)} />
      </CardContent>
    </Card>
  );
}

function CategoryRow({ category }: { category: Category }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5">
      <ColorDot color={category.color} />
      <span className="flex-1 text-sm text-text-primary">{category.name}</span>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => deletePersonalCategoryAction(category.id))}
        className="text-xs text-text-muted hover:text-danger disabled:opacity-50"
      >
        ✕
      </button>
    </div>
  );
}

function AddCategoryForm({ takenColors }: { takenColors: string[] }) {
  const [state, formAction, pending] = useActionState(createPersonalCategoryAction, { error: null });
  const [processedState, setProcessedState] = useState(state);
  const [color, setColor] = useState("");
  const [formKey, setFormKey] = useState(0);

  if (state !== processedState) {
    setProcessedState(state);
    if (state.success) {
      setColor("");
      setFormKey((k) => k + 1);
    }
  }

  return (
    <form key={formKey} action={formAction} className="mt-3 space-y-2 border-t border-border pt-3">
      <Label htmlFor="cat-name">New category</Label>
      <Input id="cat-name" name="name" placeholder="e.g. Volunteering" required />
      <input type="hidden" name="color" value={color} />
      <ClubColorPicker
        value={color}
        onChange={setColor}
        takenColors={takenColors}
        helperText="Greyed-out colors are already used by one of your other categories."
      />
      <FieldError>{state.error}</FieldError>
      <Button type="submit" size="sm" disabled={pending || !color}>
        {pending ? "Adding…" : "Add Category"}
      </Button>
    </form>
  );
}
