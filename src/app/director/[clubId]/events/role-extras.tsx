"use client";

import { useState } from "react";
import { saveRoleTemplateAction, deleteRoleTemplateAction, type SavedRole, type SaveRoleInput } from "@/app/actions/role-templates";
import { Input, Label } from "@/components/ui/input";
import { formatRolePay } from "@/lib/role-pay";
import { cn } from "@/lib/cn";

// The club's saved roles, kept in local state so a role you just saved shows
// up on the shelf immediately without reloading the form you're filling in.
export function useSavedRoles(clubId: string, initial: SavedRole[]) {
  const [saved, setSaved] = useState(initial);

  async function save(input: SaveRoleInput): Promise<string | null> {
    const res = await saveRoleTemplateAction(clubId, input);
    if (res.error || !res.role) return res.error ?? "Couldn't save that role.";
    const role = res.role;
    setSaved((prev) => [...prev.filter((r) => r.id !== role.id), role].sort((a, b) => a.name.localeCompare(b.name)));
    return null;
  }

  async function remove(id: string) {
    setSaved((prev) => prev.filter((r) => r.id !== id));
    await deleteRoleTemplateAction(clubId, id);
  }

  return { saved, save, remove };
}

// Tap a saved role to drop it into this event (name, headcount, grades and pay
// all come along). The × forgets it.
export function SavedRolesBar({
  saved,
  usedNames,
  onUse,
  onDelete,
}: {
  saved: SavedRole[];
  usedNames: string[];
  onUse: (role: SavedRole) => void;
  onDelete: (id: string) => void;
}) {
  if (saved.length === 0) return null;
  const used = new Set(usedNames.map((n) => n.toLowerCase()));
  return (
    <div>
      <p className="mb-1 text-xs text-text-muted">Your saved roles — tap one to add it:</p>
      <div className="flex flex-wrap gap-1.5">
        {saved.map((t) => {
          const pay = formatRolePay(t.payCents, t.payNote);
          return (
            <span key={t.id} className="inline-flex items-center overflow-hidden rounded-full border border-border text-xs">
              <button
                type="button"
                disabled={used.has(t.name.toLowerCase())}
                onClick={() => onUse(t)}
                className="px-2.5 py-1 font-medium text-text-primary hover:bg-surface-2 disabled:opacity-40"
              >
                + {t.name} ×{t.capacity}
                {pay ? ` · ${pay}` : ""}
              </button>
              <button
                type="button"
                aria-label={`Forget saved role ${t.name}`}
                title="Forget this saved role"
                onClick={() => onDelete(t.id)}
                className="border-l border-border px-1.5 py-1 text-text-muted hover:text-danger"
              >
                ×
              </button>
            </span>
          );
        })}
      </div>
    </div>
  );
}

// Optional pay for one role, plus a button that saves the whole role
// (name, headcount, grades, pay) for next time.
export function RolePayFields({
  idPrefix,
  pay,
  payNote,
  onPayChange,
  onPayNoteChange,
  onSave,
}: {
  idPrefix: string;
  pay: string;
  payNote: string;
  onPayChange: (v: string) => void;
  onPayNoteChange: (v: string) => void;
  onSave: () => Promise<string | null>;
}) {
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setState("saving");
    setError(null);
    const err = await onSave();
    if (err) {
      setError(err);
      setState("idle");
    } else {
      setState("saved");
      setTimeout(() => setState("idle"), 2000);
    }
  }

  return (
    <div className="space-y-1 pl-0.5">
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor={`${idPrefix}-pay`} className="mb-0 shrink-0 text-xs text-text-muted">
          Pay (optional)
        </Label>
        <div className="flex w-24 shrink-0 items-center gap-1">
          <span className="text-sm text-text-muted">$</span>
          <Input id={`${idPrefix}-pay`} inputMode="decimal" placeholder="none" value={pay} onChange={(e) => onPayChange(e.target.value)} />
        </div>
        <div className="w-32 shrink-0">
          <Input aria-label="Pay note" placeholder="per game" maxLength={40} value={payNote} onChange={(e) => onPayNoteChange(e.target.value)} />
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={state === "saving"}
          className={cn(
            "ml-auto shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
            state === "saved" ? "border-success text-success" : "border-border text-text-secondary hover:bg-surface-2"
          )}
        >
          {state === "saving" ? "Saving…" : state === "saved" ? "Saved ✓" : "Save role for reuse"}
        </button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
