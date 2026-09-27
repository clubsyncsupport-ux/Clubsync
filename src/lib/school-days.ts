// Powers the non-blocking "10 school days' notice" reminder on the event
// proposal form. Mon-Fri only — no holiday calendar, deliberately out of
// scope (that's a real, separate data source, not something to fake).
export function isSchoolDay(d: Date): boolean {
  const day = d.getDay();
  return day !== 0 && day !== 6;
}

export function schoolDaysBetween(from: Date, to: Date): number {
  let count = 0;
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  while (cursor < end) {
    if (isSchoolDay(cursor)) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}
