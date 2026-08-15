"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

export function BackButton({ fallbackHref = "/home", className }: { fallbackHref?: string; className?: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push(fallbackHref);
      }}
      className={cn("flex items-center gap-1 text-sm font-medium text-text-secondary hover:text-text-primary", className)}
    >
      ← Back
    </button>
  );
}
