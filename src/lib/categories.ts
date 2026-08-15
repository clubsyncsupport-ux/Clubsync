/** Parses a club's stored CSV category string back into a list. Tolerates
 * legacy single-category rows (no comma) with no data migration needed.
 * Plain, server-safe utility — deliberately not in category-multi-select.tsx
 * since that file is "use client" and its exports aren't callable from
 * Server Components. */
export function parseCategories(category: string): string[] {
  return category.split(",").map((c) => c.trim()).filter(Boolean);
}
