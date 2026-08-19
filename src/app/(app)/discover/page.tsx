import type { Metadata } from "next";
import Link from "next/link";
import { getViewer, getPendingMembershipClubIds } from "@/lib/viewer";
import { db } from "@/lib/db";
import { ClubCard } from "@/components/club-card";
import { parseCategories } from "@/lib/categories";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";
import { CLUB_CATEGORIES } from "@/lib/constants";

export const metadata: Metadata = { title: "Discover Clubs" };

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { q, category } = await searchParams;
  const viewer = await getViewer();
  const pendingClubIds = await getPendingMembershipClubIds(viewer.id);

  const allClubs = await db.club.findMany({
    where: {
      schoolId: viewer.schoolId!,
      status: "ACTIVE",
      approvalStatus: "APPROVED",
      ...(q ? { OR: [{ name: { contains: q } }, { description: { contains: q } }] } : {}),
    },
    include: { _count: { select: { memberships: { where: { status: "ACTIVE" } } } } },
    orderBy: { name: "asc" },
  });
  // Category is a comma-joined multi-value field, so filter in-memory rather than
  // an exact-match SQL where — a club can match more than one category chip.
  const clubs = category ? allClubs.filter((c) => parseCategories(c.category).includes(category)) : allClubs;

  const membershipByClub = new Map<string, "ACTIVE" | "PENDING">(viewer.memberships.map((m) => [m.clubId, m.status as "ACTIVE" | "PENDING"]));
  for (const clubId of pendingClubIds) if (!membershipByClub.has(clubId)) membershipByClub.set(clubId, "PENDING");

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight text-text-primary">Discover Clubs</h1>
      <p className="mt-1 text-[15px] text-text-secondary">Find clubs at {viewer.school?.name}.</p>

      <form action="/discover" method="get" className="mt-5">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search clubs by name or keyword…"
          className="w-full rounded-xl border border-border bg-surface-1 px-4 py-2.5 text-[15px] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
        {category && <input type="hidden" name="category" value={category} />}
      </form>

      <div className="mt-4 flex flex-wrap gap-2 overflow-x-auto">
        <FilterChip href={buildHref(q, undefined)} active={!category}>
          All
        </FilterChip>
        {CLUB_CATEGORIES.map((c) => (
          <FilterChip key={c} href={buildHref(q, c)} active={category === c}>
            {c}
          </FilterChip>
        ))}
      </div>

      {clubs.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="No clubs found"
          description="Try a different search or check back soon — new clubs are added all the time."
        />
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {clubs.map((club) => (
            <ClubCard key={club.id} club={club} membershipStatus={(membershipByClub.get(club.id) as "ACTIVE" | "PENDING") ?? "NONE"} />
          ))}
        </div>
      )}
    </div>
  );
}

function buildHref(q: string | undefined, category: string | undefined) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (category) params.set("category", category);
  const qs = params.toString();
  return `/discover${qs ? `?${qs}` : ""}`;
}

function FilterChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active ? "border-accent bg-accent-soft text-accent-soft-text" : "border-border text-text-secondary hover:border-border-strong"
      )}
    >
      {children}
    </Link>
  );
}
