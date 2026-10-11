"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";

// The floating "jump to my chats" button. It hides itself on the chat screens
// themselves — there it's redundant, and on a phone it sat right on top of the
// composer's Send button.
export function ChatFab() {
  const pathname = usePathname();
  if (pathname === "/chats" || /^\/clubs\/[^/]+\/chat/.test(pathname)) return null;

  return (
    <div data-tour="chat-fab" className="group fixed bottom-20 right-4 z-40 md:bottom-6 md:right-6 print:hidden">
      <span className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-accent/50 blur-xl transition-opacity duration-300 group-hover:opacity-80" />
      <Link
        href="/chats"
        aria-label="Chats"
        className="relative flex h-16 w-16 items-center justify-center rounded-full bg-accent text-on-accent shadow-[var(--shadow-lg)] transition-transform duration-200 hover:scale-110 active:scale-95"
      >
        <MessageCircle className="h-7 w-7" strokeWidth={2} />
      </Link>
      <span className="pointer-events-none absolute right-full top-1/2 mr-3 -translate-y-1/2 translate-x-1 whitespace-nowrap rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs font-medium text-text-primary opacity-0 shadow-[var(--shadow-sm)] transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
        Chats
      </span>
    </div>
  );
}
