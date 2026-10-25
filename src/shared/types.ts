export interface FingerprintSettings {
  enabled: boolean;
  webgl: boolean;
  navigator: boolean;
  screen: boolean;
  audioContext: boolean;
  canvas: boolean;
  clientRects: boolean;
}

export interface BlockingSettings {
  adsEnabled: boolean;
  trackersEnabled: boolean;
  supplementaryEnabled: boolean;
  customExceptions: string[];
}

export interface PhishingSettings {
  enabled: boolean;
  safeBrowsingEnabled: boolean;
  safeBrowsingApiKey: string;
  riskThreshold: RiskLevel;
}

export interface RedirectBlockSettings {
  enabled: boolean;
}

export interface CookieSettings {
  enabled: boolean;
}

export interface StatisticsSettings {
  enabled: boolean;
}

export interface DecoyShieldSettings {
  masterEnabled: boolean;
  fingerprint: FingerprintSettings;
  blocking: BlockingSettings;
  phishing: PhishingSettings;
  redirectBlock: RedirectBlockSettings;
  cookies: CookieSettings;
  statistics: StatisticsSettings;
}

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RiskLevel = 'low' | 'medium' | 'high';

export interface RiskIndicator {
  type: string;
  description: string;
  weight: number;
}

export interface RiskScore {
  level: RiskLevel;
  score: number;
  reasons: string[];
}

export type StatType =
  | 'adsBlocked'
  | 'trackersBlocked'
  | 'fingerprintProtections'
  | 'phishingWarnings'
  | 'redirectsBlocked'
  | 'cookiesDeleted';

export interface StatsEvent {
  type: StatType;
  timestamp: number;
}

export interface DailyStats {
  adsBlocked: number;
  trackersBlocked: number;
  fingerprintProtections: number;
  phishingWarnings: number;
  redirectsBlocked: number;
  cookiesDeleted: number;
}

export interface StatsData extends DailyStats {
  byDay: Record<string, DailyStats>;
}

export interface CookieInfo {
  name: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: string;
  expirationDate?: number;
  session: boolean;
  partitionKey?: { topLevelSite?: string };
}

export interface FingerprintProfile {
  webgl: { renderer: string; vendor: string };
  navigator: {
    hardwareConcurrency: number;
    deviceMemory: number;
    platform: string;
    language: string;
    languages: string[];
  };
  screen: {
    width: number;
    height: number;
    colorDepth: number;
    pixelDepth: number;
  };
  audio: { noiseOffset: number };
  canvas: { noiseSeed: number };
  clientRects: { offsetX: number; offsetY: number };
}

export type MessageType =
  | 'GET_SETTINGS'
  | 'UPDATE_SETTINGS'
  | 'GET_BLOCKED_COUNT'
  | 'GET_RULESET_STATUS'
  | 'GET_COOKIES'
  | 'DELETE_COOKIE'
  | 'DELETE_ALL_COOKIES'
  | 'GET_STATS'
  | 'RECORD_STAT'
  | 'INSPECT_DOM'
  | 'CHECK_URL';

export interface ExtensionMessage {
  type: MessageType;
  payload?: unknown;
}
