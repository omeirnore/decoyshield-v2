/**
 * Shared in-memory block log for the activity feed.
 * Any handler (DNR, redirect, phishing) can push entries here.
 * The popup reads it via GET_BLOCK_LOG message.
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

const MAX_LOG = 200;
const blockLog: BlockLogEntry[] = [];

export function pushLogEntry(entry: BlockLogEntry): void {
  blockLog.push(entry);
  if (blockLog.length > MAX_LOG) blockLog.shift();
}

export function getBlockLog(): BlockLogEntry[] {
  return blockLog;
}
