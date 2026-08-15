"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

// A styled, obviously-clickable stand-in for a bare <input type="file">,
// which reads as inert text to a lot of people. Shows the chosen file
// name(s) once picked. The real <input> stays in the DOM under `name` for
// normal server-action form submission.
export function FileUploadButton({
  name,
  multiple = false,
  accept,
  label = "Choose File",
}: {
  name: string;
  multiple?: boolean;
  accept?: string;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileNames, setFileNames] = useState<string[]>([]);

  return (
    <div>
      <Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
        📎 {label}
      </Button>
      <input
        ref={inputRef}
        type="file"
        name={name}
        multiple={multiple}
        accept={accept}
        className="hidden"
        onChange={(e) => setFileNames(Array.from(e.target.files ?? []).map((f) => f.name))}
      />
      {fileNames.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-sm text-text-secondary">
          {fileNames.map((n) => (
            <li key={n}>✓ {n}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
