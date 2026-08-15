import { cn } from "@/lib/cn";

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

const sizeMap = {
  sm: "h-8 w-8 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-16 w-16 text-lg",
  xl: "h-24 w-24 text-2xl",
};

export function Avatar({
  firstName,
  lastName,
  src,
  size = "md",
  className,
}: {
  firstName: string;
  lastName: string;
  src?: string | null;
  size?: keyof typeof sizeMap;
  className?: string;
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={`${firstName} ${lastName}`} className={cn("rounded-full object-cover shrink-0", sizeMap[size], className)} />;
  }
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-accent-soft text-accent-soft-text font-semibold shrink-0",
        sizeMap[size],
        className
      )}
    >
      {initials(firstName, lastName)}
    </div>
  );
}
