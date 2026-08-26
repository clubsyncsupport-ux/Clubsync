"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/cn";

// A click-to-upload image control: shows the current image (or a placeholder),
// a small pencil badge signals it's editable, and picking a new file previews
// it immediately (before the form is even saved) so it's obvious the click
// registered. The actual <input type="file"> stays in the form under `name`
// for normal server-action submission — this is purely a nicer face on it.
export function ImageUploadField({
  name,
  currentUrl,
  shape = "circle",
  size = 96,
  aspectClassName,
  fallback,
  helperText,
  ariaLabel = "Change photo",
  onRemove,
  onFileSelected,
}: {
  name: string;
  currentUrl?: string | null;
  shape?: "circle" | "rectangle";
  size?: number;
  /** For shape="rectangle": a Tailwind class controlling width/aspect, e.g. "w-full aspect-[3/1]". */
  aspectClassName?: string;
  fallback?: React.ReactNode;
  helperText?: string;
  ariaLabel?: string;
  /** Pass to allow clearing back to `fallback` — omit to keep this field upload-only. */
  onRemove?: () => void;
  onFileSelected?: () => void;
}) {
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setPreview(URL.createObjectURL(file));
      onFileSelected?.();
    }
  }

  function handleRemove(e: React.MouseEvent) {
    e.stopPropagation();
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
    onRemove?.();
  }

  return (
    <div className={shape === "circle" ? "inline-block" : "w-full"}>
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "group relative block overflow-hidden border border-border bg-surface-2 transition-opacity hover:opacity-90",
          shape === "circle" ? "rounded-full" : "w-full rounded-2xl",
          shape === "rectangle" && (aspectClassName ?? "aspect-[3/1]")
        )}
        style={shape === "circle" ? { width: size, height: size } : undefined}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-text-muted">{fallback ?? "📷"}</div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
          <span className="opacity-0 transition-opacity group-hover:opacity-100">
            <EditBadge inline />
          </span>
        </div>
        {shape === "circle" && (
          <span className="absolute -bottom-0.5 -right-0.5">
            <EditBadge />
          </span>
        )}
      </button>
      <input ref={inputRef} type="file" name={name} accept="image/*" className="hidden" onChange={handleChange} />
      {onRemove && preview && (
        <button type="button" onClick={handleRemove} className="mt-1.5 block text-xs text-text-muted underline hover:text-text-primary">
          Remove photo
        </button>
      )}
      {helperText && <p className="mt-1.5 text-xs text-text-muted">{helperText}</p>}
    </div>
  );
}

function EditBadge({ inline = false }: { inline?: boolean }) {
  return (
    <span
      className={cn(
        "flex items-center justify-center rounded-full bg-accent text-on-accent shadow-md",
        inline ? "h-8 w-8 text-sm" : "h-6 w-6 border-2 border-surface-0 text-xs"
      )}
    >
      ✏️
    </span>
  );
}
