import { cn } from "@/lib/cn";

export function ClubLogo({
  name,
  color,
  logoUrl,
  size = "md",
  className,
}: {
  name: string;
  color: string;
  logoUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClass = { sm: "h-9 w-9 text-sm rounded-lg", md: "h-11 w-11 text-lg rounded-xl", lg: "h-20 w-20 text-2xl rounded-2xl" }[size];
  return (
    <div
      className={cn("flex shrink-0 items-center justify-center overflow-hidden font-bold text-white", sizeClass, className)}
      style={{ backgroundColor: color }}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt={`${name} logo`} className="h-full w-full object-cover" />
      ) : (
        name[0]
      )}
    </div>
  );
}
