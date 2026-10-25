const THREAT_LOG_KEY = 'threatLog';
const MAX_ENTRIES = 500;

export interface ThreatEntry {
  timestamp: number;
  url: string;
  level: string;
  action: string;
  reason: string;
}

export async function recordThreat(entry: ThreatEntry): Promise<void> {
  const data = await chrome.storage.local.get(THREAT_LOG_KEY);
  const log: ThreatEntry[] = data[THREAT_LOG_KEY] ?? [];
  log.unshift(entry);
  if (log.length > MAX_ENTRIES) log.length = MAX_ENTRIES;
  await chrome.storage.local.set({ [THREAT_LOG_KEY]: log });
}

export async function getThreatLog(): Promise<ThreatEntry[]> {
  const data = await chrome.storage.local.get(THREAT_LOG_KEY);
  return data[THREAT_LOG_KEY] ?? [];
}

export async function clearThreatLog(): Promise<void> {
  await chrome.storage.local.remove(THREAT_LOG_KEY);
}
