import type { Metadata } from "next";
import { LinkButton } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { resolveLandingPath } from "@/lib/viewer";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Welcome" };

export default async function WelcomePage() {
  const authUser = await getCurrentUser();
  if (authUser) {
    redirect(await resolveLandingPath(authUser.id));
  }

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-between overflow-hidden bg-surface-0 px-6 py-12">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-accent/25 blur-[90px]" />
        <div className="absolute -right-28 top-1/3 h-96 w-96 rounded-full bg-[#7c3aed]/20 blur-[110px]" />
        <div className="absolute -bottom-32 left-1/4 h-72 w-72 rounded-full bg-accent-hover/20 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm flex-1 flex flex-col items-center justify-center text-center animate-fade-in">
        <h1 className="text-4xl font-bold tracking-tight text-text-primary">ClubSync</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-text-secondary">
          One place for every meeting, volunteer opportunity, and club you care about.
        </p>
      </div>

      <div className="relative z-10 w-full max-w-sm space-y-3">
        <LinkButton href="/signup" size="lg" className="w-full">
          Sign Up
        </LinkButton>
        <LinkButton href="/login" variant="secondary" size="lg" className="w-full">
          Log In
        </LinkButton>
      </div>
    </div>
  );
}
