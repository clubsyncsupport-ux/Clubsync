import { LinkButton } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 py-12 text-center animate-fade-in">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[26px] bg-gradient-to-br from-accent-hover to-accent shadow-lg">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="7" stroke="white" strokeWidth="1.8" />
          <path d="M20 20l-3.8-3.8" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M8.5 11h5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </div>
      <h1 className="text-[28px] font-bold tracking-tight text-text-primary">Page not found</h1>
      <p className="mt-2 max-w-xs text-[15px] leading-relaxed text-text-secondary">
        This page doesn&apos;t exist, or it may have moved. Let&apos;s get you back on track.
      </p>
      <div className="mt-8 w-full max-w-xs space-y-3">
        <LinkButton href="/" size="lg" className="w-full">
          Go Home
        </LinkButton>
      </div>
    </div>
  );
}
