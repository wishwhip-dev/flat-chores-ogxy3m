/**
 * Week arithmetic and labels for the rota.
 *
 * Weeks run Monday to Sunday. Week `n` starts `n - 1` weeks after the rota's start date, which is
 * stored once in the settings row when the database is first seeded.
 */

const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** The Monday at 00:00 local time of the week the given date falls in. */
export function startOfWeek(date: Date): Date {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (day.getDay() + 6) % 7; // Monday is 0.
  return new Date(day.getTime() - offset * MILLIS_PER_DAY);
}

/** The Monday that starts rota week `week`, given the stored start of week 1. */
export function weekStart(startDate: number, week: number): Date {
  return new Date(startDate + (week - 1) * 7 * MILLIS_PER_DAY);
}

/** The date range as people say it: "17–23 Mar", or "30 Mar–5 Apr" across a month boundary. */
export function formatDateRange(start: Date, end: Date): string {
  const from = `${start.getDate()} ${MONTHS[start.getMonth()]}`;
  const to = `${end.getDate()} ${MONTHS[end.getMonth()]}`;
  return start.getMonth() === end.getMonth() ? `${start.getDate()}–${to}` : `${from}–${to}`;
}

/** The header label for a rota week: "Week 3 · 17–23 Mar". */
export function weekLabel(week: number, startDate: number): string {
  const start = weekStart(startDate, week);
  const end = new Date(start.getTime() + 6 * MILLIS_PER_DAY);
  return `Week ${week} · ${formatDateRange(start, end)}`;
}
