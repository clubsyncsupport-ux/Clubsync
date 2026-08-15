import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge, ColorDot } from "@/components/ui/badge";
import { JoinClubButton } from "@/components/join-club-button";
import { parseCategories } from "@/lib/categories";

export type ClubCardData = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  color: string;
  logoUrl: string | null;
  _count: { memberships: number };
};

export function ClubCard({ club, membershipStatus }: { club: ClubCardData; membershipStatus: "NONE" | "ACTIVE" | "PENDING" }) {
  return (
    <Card className="flex flex-col overflow-hidden">
      <Link href={`/clubs/${club.slug}`} className="flex-1 p-5">
        <div className="flex items-start gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl text-lg font-bold text-white"
            style={{ backgroundColor: club.color }}
          >
            {club.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={club.logoUrl} alt={`${club.name} logo`} className="h-full w-full object-cover" />
            ) : (
              club.name[0]
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-text-primary">{club.name}</p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <ColorDot color={club.color} />
              <span className="text-xs text-text-secondary">{parseCategories(club.category).join(", ")}</span>
            </div>
          </div>
        </div>
        <p className="mt-3 line-clamp-2 text-sm text-text-secondary">{club.description}</p>
        <div className="mt-3">
          <Badge>{club._count.memberships} members</Badge>
        </div>
      </Link>
      <div className="border-t border-border p-3">
        <JoinClubButton clubId={club.id} status={membershipStatus} size="sm" className="w-full" />
      </div>
    </Card>
  );
}
