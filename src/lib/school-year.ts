// BC school years run September-June. Cutover at August 1 so a club can
// start next year's registration before the year technically begins.
export function schoolYearFor(date: Date): string {
  const y = date.getFullYear();
  return date.getMonth() >= 7 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}
