import type { DecoyShieldSettings, DeepPartial } from './types';
import { DEFAULT_SETTINGS, STORAGE_KEY_SETTINGS } from './constants';

function deepMerge<T extends Record<string, unknown>>(target: T, source: Record<string, unknown>): T {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    const sourceVal = source[key];
    const targetVal = (target as Record<string, unknown>)[key];
    if (
      sourceVal !== null &&
      typeof sourceVal === 'object' &&
      !Array.isArray(sourceVal) &&
      targetVal !== null &&
      typeof targetVal === 'object' &&
      !Array.isArray(targetVal)
    ) {
      (result as Record<string, unknown>)[key] = deepMerge(
        targetVal as Record<string, unknown>,
        sourceVal as Record<string, unknown>,
      );
    } else {
      (result as Record<string, unknown>)[key] = sourceVal;
    }
  }
  return result;
}

export async function getSettings(): Promise<DecoyShieldSettings> {
  const data = await chrome.storage.local.get(STORAGE_KEY_SETTINGS);
  const stored = data[STORAGE_KEY_SETTINGS] ?? {};
  return deepMerge({ ...DEFAULT_SETTINGS } as unknown as Record<string, unknown>, stored) as unknown as DecoyShieldSettings;
}

export async function updateSettings(partial: DeepPartial<DecoyShieldSettings>): Promise<void> {
  const current = await getSettings();
  const merged = deepMerge(current as unknown as Record<string, unknown>, partial as Record<string, unknown>);
  await chrome.storage.local.set({ [STORAGE_KEY_SETTINGS]: merged });
}

export function onSettingsChanged(cb: (settings: DecoyShieldSettings) => void): () => void {
  const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
    if (changes[STORAGE_KEY_SETTINGS]) {
      const newValue = changes[STORAGE_KEY_SETTINGS].newValue;
      const merged = deepMerge(
        { ...DEFAULT_SETTINGS } as unknown as Record<string, unknown>,
        newValue ?? {},
      ) as unknown as DecoyShieldSettings;
      cb(merged);
    }
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
