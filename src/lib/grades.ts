// A school's configured grade levels — a subset + reorder of the standard
// GRADES constant, stored as an ordered low→high CSV on School.gradeLevels.
export function schoolGradeLevels(school: { gradeLevels: string }): string[] {
  return school.gradeLevels
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean);
}
