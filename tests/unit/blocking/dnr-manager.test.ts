import { describe, test, expect, beforeEach, vi } from 'vitest';
import {
  enableRuleset,
  disableRuleset,
  getBlockedCount,
  getRulesetStatus,
  getAvailableRuleCapacity,
  checkRuleCapacity,
} from '@/background/dnr-manager';

beforeEach(() => {
  vi.mocked(chrome.declarativeNetRequest.updateEnabledRulesets).mockClear();
  vi.mocked(chrome.declarativeNetRequest.getMatchedRules).mockClear();
  vi.mocked(chrome.declarativeNetRequest.getAvailableStaticRuleCount).mockClear();
  vi.mocked(chrome.declarativeNetRequest.getEnabledRulesets).mockClear();
});

describe('enableRuleset', () => {
  test('calls updateEnabledRulesets with enableRulesetIds', async () => {
    await enableRuleset('ads');
    expect(chrome.declarativeNetRequest.updateEnabledRulesets).toHaveBeenCalledWith({
      enableRulesetIds: ['ads'],
    });
  });
});

describe('disableRuleset', () => {
  test('calls updateEnabledRulesets with disableRulesetIds', async () => {
    await disableRuleset('ads');
    expect(chrome.declarativeNetRequest.updateEnabledRulesets).toHaveBeenCalledWith({
      disableRulesetIds: ['ads'],
    });
  });
});

describe('getBlockedCount', () => {
  test('returns matched rule count', async () => {
    vi.mocked(chrome.declarativeNetRequest.getMatchedRules).mockResolvedValue({
      rulesMatchedInfo: [
        { rule: { ruleId: 1, rulesetId: 'ads' }, timeStamp: 1000 },
        { rule: { ruleId: 2, rulesetId: 'ads' }, timeStamp: 2000 },
      ],
    } as any);
    expect(await getBlockedCount()).toBe(2);
  });
});

describe('getAvailableRuleCapacity', () => {
  test('wraps getAvailableStaticRuleCount', async () => {
    vi.mocked(chrome.declarativeNetRequest.getAvailableStaticRuleCount).mockResolvedValue(25000);
    expect(await getAvailableRuleCapacity()).toBe(25000);
  });
});

describe('checkRuleCapacity', () => {
  test('warns when available capacity is below threshold', async () => {
    vi.mocked(chrome.declarativeNetRequest.getAvailableStaticRuleCount).mockResolvedValue(2000);
    const status = await checkRuleCapacity();
    expect(status.warning).toBe(true);
    expect(status.available).toBe(2000);
  });

  test('no warning when capacity is sufficient', async () => {
    vi.mocked(chrome.declarativeNetRequest.getAvailableStaticRuleCount).mockResolvedValue(20000);
    const status = await checkRuleCapacity();
    expect(status.warning).toBe(false);
    expect(status.available).toBe(20000);
  });
});

describe('getRulesetStatus', () => {
  test('returns status of all rulesets', async () => {
    vi.mocked(chrome.declarativeNetRequest.getEnabledRulesets).mockResolvedValue(['ads', 'trackers']);
    const status = await getRulesetStatus();
    expect(status).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'ads', enabled: true }),
        expect.objectContaining({ id: 'trackers', enabled: true }),
      ]),
    );
  });
});
