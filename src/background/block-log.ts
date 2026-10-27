/**
 * Block log for the activity feed.
 * Persisted in chrome.storage.session so it survives service worker restarts
 * but clears on browser close (appropriate for a session activity log).
 */

export interface BlockLogEntry {
  /** The domain or URL that was blocked */
  domain: string;
  /** What kind of block */
  type: 'ad' | 'tracker' | 'redirect' | 'phishing';
  /** Full URL that was blocked (for proof/details) */
  url?: string;
  /** Why it was blocked (phishing reasons, redirect source, etc.) */
  reason?: string;
  /** Timestamp of the block */
  timestamp: number;
}

const STORAGE_KEY = 'ds-block-log';
const MAX_LOG = 200;

// In-memory cache (fast reads); synced to session storage on writes
let blockLog: BlockLogEntry[] = [];
let loaded = false;

async function ensureLoaded(): Promise<void> {
  if (loaded) return;
  try {
    const data = await chrome.storage.session.get(STORAGE_KEY);
    if (Array.isArray(data[STORAGE_KEY])) {
      blockLog = data[STORAGE_KEY];
    }
  } catch { /* first run or quota error — start empty */ }
  loaded = true;
}

export async function pushLogEntry(entry: BlockLogEntry): Promise<void> {
  await ensureLoaded();
  blockLog.push(entry);
  if (blockLog.length > MAX_LOG) blockLog.splice(0, blockLog.length - MAX_LOG);
  try {
    await chrome.storage.session.set({ [STORAGE_KEY]: blockLog });
  } catch { /* quota exceeded — keep in-memory only */ }
}

export async function getBlockLog(): Promise<BlockLogEntry[]> {
  await ensureLoaded();
  return blockLog;
}
