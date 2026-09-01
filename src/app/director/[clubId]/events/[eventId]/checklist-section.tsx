"use client";

import { useRef, useState, useTransition } from "react";
import {
  addChecklistItemAction,
  toggleChecklistItemAction,
  deleteChecklistItemAction,
  toggleChecklistVisibilityAction,
} from "@/app/actions/director-events";
import { Card, CardContent } from "@/components/ui/card";
import type { EventChecklistItem } from "@prisma/client";

export function ChecklistSection({
  eventId,
  items,
  visibleToStudents,
}: {
  eventId: string;
  items: EventChecklistItem[];
  visibleToStudents: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const [newTask, setNewTask] = useState("");

  function addItem() {
    if (!newTask.trim()) return;
    const task = newTask.trim();
    setNewTask("");
    startTransition(() => addChecklistItemAction(eventId, task));
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Event Planning Checklist</h2>
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => toggleChecklistVisibilityAction(eventId))}
          title={visibleToStudents ? "Students can currently see this checklist" : "Students can't currently see this checklist"}
          className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
            visibleToStudents ? "border-accent bg-accent-soft text-accent-soft-text" : "border-border text-text-secondary hover:bg-surface-2"
          }`}
        >
          {visibleToStudents ? "👁 Visible to Students" : "🔒 Visible to Students"}
        </button>
      </div>
      <Card>
        <CardContent className="p-4 space-y-2">
          {items.length === 0 && <p className="text-sm text-text-muted">No tasks yet — add one below.</p>}
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => startTransition(() => toggleChecklistItemAction(item.id))}
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs ${item.completed ? "border-accent bg-accent text-on-accent" : "border-border-strong"}`}
              >
                {item.completed && "✓"}
              </button>
              <span className={`flex-1 text-sm ${item.completed ? "text-text-muted line-through" : "text-text-primary"}`}>{item.task}</span>
              <button
                type="button"
                onClick={() => startTransition(() => deleteChecklistItemAction(item.id))}
                className="text-xs text-text-muted hover:text-danger"
              >
                ✕
              </button>
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <input
              ref={inputRef}
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addItem())}
              placeholder="Add a task…"
              className="flex-1 rounded-lg border border-border bg-surface-1 px-3 py-1.5 text-sm outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={addItem}
              disabled={pending}
              className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-on-accent"
            >
              Add
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
