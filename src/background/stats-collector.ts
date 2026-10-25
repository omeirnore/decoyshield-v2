import type { StatsEvent, StatsData, DailyStats } from '@/shared/types';

const STATS_PREFIX = 'stats-';

const EMPTY_DAILY: DailyStats = {
  adsBlocked: 0,
  trackersBlocked: 0,
  fingerprintProtections: 0,
  phishingWarnings: 0,
  redirectsBlocked: 0,
  cookiesDeleted: 0,
};

function dateKey(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function storageKey(date: string): string {
  return `${STATS_PREFIX}${date}`;
}

export async function recordStat(event: StatsEvent): Promise<void> {
  const key = storageKey(dateKey(event.timestamp));
  const data = await chrome.storage.local.get(key);
  const daily: DailyStats = data[key] ? { ...EMPTY_DAILY, ...data[key] } : { ...EMPTY_DAILY };
  daily[event.type]++;
  await chrome.storage.local.set({ [key]: daily });
}

function getDateRange(range: 'day' | 'week' | 'month'): string[] {
  const now = new Date();
  const days = range === 'day' ? 1 : range === 'week' ? 7 : 30;
  const keys: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    keys.push(dateKey(d.getTime()));
  }
  return keys;
}

export async function getStats(range: 'day' | 'week' | 'month'): Promise<StatsData> {
  const dates = getDateRange(range);
  const storageKeys = dates.map(storageKey);
  const data = await chrome.storage.local.get(storageKeys);

  const totals: DailyStats = { ...EMPTY_DAILY };
  const byDay: Record<string, DailyStats> = {};

  for (const date of dates) {
    const daily: DailyStats = { ...EMPTY_DAILY, ...(data[storageKey(date)] ?? {}) };
    byDay[date] = daily;
    for (const k of Object.keys(EMPTY_DAILY) as Array<keyof DailyStats>) {
      totals[k] += daily[k];
    }
  }

  return { ...totals, byDay };
}

export async function clearStats(): Promise<void> {
  const all = await chrome.storage.local.get(null);
  const statsKeys = Object.keys(all).filter((k) => k.startsWith(STATS_PREFIX));
  if (statsKeys.length > 0) {
    await chrome.storage.local.remove(statsKeys);
  }
}
