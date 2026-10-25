import { describe, test, expect, beforeEach, vi } from 'vitest';
import { getSettings, updateSettings, onSettingsChanged } from '@/shared/storage';

beforeEach(() => {
  vi.mocked(chrome.storage.local.get).mockResolvedValue({});
  vi.mocked(chrome.storage.local.set).mockResolvedValue(undefined);
});

describe('getSettings', () => {
  test('returns defaults when storage is empty', async () => {
    const settings = await getSettings();
    expect(settings.masterEnabled).toBe(true);
    expect(settings.fingerprint.enabled).toBe(true);
    expect(settings.fingerprint.webgl).toBe(true);
    expect(settings.fingerprint.canvas).toBe(true);
    expect(settings.blocking.adsEnabled).toBe(true);
    expect(settings.blocking.trackersEnabled).toBe(true);
    expect(settings.phishing.enabled).toBe(true);
    expect(settings.cookies.enabled).toBe(true);
  });

  test('merges stored values over defaults', async () => {
    vi.mocked(chrome.storage.local.get).mockResolvedValue({
      settings: { masterEnabled: false },
    });
    const settings = await getSettings();
    expect(settings.masterEnabled).toBe(false);
    expect(settings.fingerprint.enabled).toBe(true);
  });
});

describe('updateSettings', () => {
  test('deep-merges partial updates', async () => {
    vi.mocked(chrome.storage.local.get).mockResolvedValue({});
    await updateSettings({ fingerprint: { webgl: false } });

    const setCall = vi.mocked(chrome.storage.local.set).mock.calls[0][0] as any;
    expect(setCall.settings.fingerprint.webgl).toBe(false);
    expect(setCall.settings.fingerprint.canvas).toBe(true);
    expect(setCall.settings.masterEnabled).toBe(true);
  });
});

describe('onSettingsChanged', () => {
  test('returns unsubscribe function', () => {
    const unsub = onSettingsChanged(() => {});
    expect(typeof unsub).toBe('function');
  });

  test('registers listener on chrome.storage.onChanged', () => {
    onSettingsChanged(() => {});
    expect(chrome.storage.onChanged.addListener).toHaveBeenCalled();
  });
});
