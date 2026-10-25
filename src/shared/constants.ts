import type { DecoyShieldSettings } from './types';

export const STORAGE_KEY_SETTINGS = 'settings';

export const DEFAULT_SETTINGS: Readonly<DecoyShieldSettings> = Object.freeze({
  masterEnabled: true,
  fingerprint: Object.freeze({
    enabled: true,
    webgl: true,
    navigator: true,
    screen: true,
    audioContext: true,
    canvas: true,
    clientRects: true,
  }),
  blocking: Object.freeze({
    adsEnabled: true,
    trackersEnabled: true,
    supplementaryEnabled: true,
    customExceptions: [] as readonly string[],
  }) as DecoyShieldSettings['blocking'],
  phishing: Object.freeze({
    enabled: true,
    safeBrowsingEnabled: false,
    safeBrowsingApiKey: '',
    riskThreshold: 'medium' as const,
  }),
  redirectBlock: Object.freeze({
    enabled: true,
  }),
  cookies: Object.freeze({
    enabled: true,
    whitelist: [] as readonly string[],
  }) as DecoyShieldSettings['cookies'],
  statistics: Object.freeze({
    enabled: true,
  }),
});
