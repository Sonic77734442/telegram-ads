// Matches get_reports_for_month: sum each row's views * its historical net CPM / 1000.
// ad_stats stores CPM, not an amount column. Do not use today's campaign CPM.
export function statAmount(row: { views?: unknown; cpm?: unknown }): number {
  return Number(row.views ?? 0) * Number(row.cpm ?? 0) / 1000;
}

export function statDay(row: { day?: unknown; timestamp?: unknown }): string {
  return String(row.day || row.timestamp || "").slice(0, 10);
}
