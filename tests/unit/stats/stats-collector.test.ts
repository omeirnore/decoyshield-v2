import { describe, test, expect, beforeEach, vi } from 'vitest';
import { recordStat, getStats, clearStats } from '@/background/stats-collector';

let store: Record<string, unknown>;

beforeEach(() => {
  store = {};
  vi.mocked(chrome.storage.local.get).mockImplementation((keys: unknown) => {
    if (keys === null) return Promise.resolve({ ...store });
    const requested = Array.isArray(keys) ? keys : typeof keys === 'string' ? [keys] : Object.keys(keys as object);
    const result: Record<string, unknown> = {};
    for (const k of requested) {
      if (k in store) result[k] = store[k];
    }
    return Promise.resolve(result);
  });
  vi.mocked(chrome.storage.local.set).mockImplementation((items: Record<string, unknown>) => {
    Object.assign(store, items);
    return Promise.resolve();
  });
  vi.mocked(chrome.storage.local.remove).mockImplementation((keys: unknown) => {
    const toRemove = Array.isArray(keys) ? keys : [keys as string];
    for (const k of toRemove) delete store[k];
    return Promise.resolve();
  });
});

describe('recordStat', () => {
  test('increments daily counter', async () => {
    await recordStat({ type: 'adsBlocked', timestamp: Date.now() });
    await recordStat({ type: 'adsBlocked', timestamp: Date.now() });
    const stats = await getStats('day');
    expect(stats.adsBlocked).toBe(2);
  });
});

describe('getStats', () => {
  test('aggregates across days for week range', async () => {
    const day1 = new Date('2026-10-20').getTime();
    const day2 = new Date('2026-10-21').getTime();
    await recordStat({ type: 'adsBlocked', timestamp: day1 });
    await recordStat({ type: 'adsBlocked', timestamp: day2 });
    const stats = await getStats('week');
    expect(stats.adsBlocked).toBe(2);
  });
});

describe('clearStats', () => {
  test('resets all counters', async () => {
    await recordStat({ type: 'adsBlocked', timestamp: Date.now() });
    await clearStats();
    expect((await getStats('day')).adsBlocked).toBe(0);
  });
});
