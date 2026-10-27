import { getSettings, onSettingsChanged } from '@/shared/storage';
import {
  registerFingerprintScripts,
  unregisterFingerprintScripts,
} from './fingerprint-registrar';
import { registerPhishingHandler, allowUrl } from './phishing-handler';
import { registerRedirectHandler } from './redirect-handler';
import { registerCookieHandler, cleanTrackingCookies, deepCleanCookies } from './cookie-handler';
import { enableRuleset, disableRuleset, checkRuleCapacity } from './dnr-manager';
import { recordStat, getStats } from './stats-collector';
import { pushLogEntry, getBlockLog } from './block-log';
import type { StatType, StatsData, DailyStats } from '@/shared/types';

const WEEKLY_ALARM = 'decoyshield-weekly-report';

async function initSessionSalt(): Promise<void> {
  await chrome.storage.session.setAccessLevel({
    accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS',
  });
  const salt = crypto.randomUUID();
  await chrome.storage.session.set({ sessionSalt: salt });
}

async function syncFingerprintState(): Promise<void> {
  const settings = await getSettings();
  if (settings.masterEnabled && settings.fingerprint.enabled) {
    await chrome.storage.session.set({ fingerprintSettings: settings.fingerprint });
    await registerFingerprintScripts();
  } else {
    await unregisterFingerprintScripts();
  }
}

async function syncBlockingState(): Promise<void> {
  const settings = await getSettings();
  const rulesetMap = {
    ads: settings.blocking.adsEnabled,
    trackers: settings.blocking.trackersEnabled,
    supplementary: settings.blocking.supplementaryEnabled,
  } as const;
  for (const [id, enabled] of Object.entries(rulesetMap)) {
    if (enabled) {
      await enableRuleset(id as 'ads' | 'trackers' | 'supplementary');
    } else {
      await disableRuleset(id);
    }
  }
}

async function registerWeeklyAlarm(): Promise<void> {
  const existing = await chrome.alarms.get(WEEKLY_ALARM);
  if (!existing) {
    // Fire once a week (10080 minutes). First fire in 7 days from install.
    chrome.alarms.create(WEEKLY_ALARM, {
      delayInMinutes: 7 * 24 * 60,
      periodInMinutes: 7 * 24 * 60,
    });
  }
}

async function getPreviousWeekStats(): Promise<StatsData> {
  // Build a "previous week" stats object by fetching 14 days and slicing days 8-14
  const now = new Date();
  const EMPTY: DailyStats = {
    adsBlocked: 0, trackersBlocked: 0, fingerprintProtections: 0,
    phishingWarnings: 0, redirectsBlocked: 0, cookiesDeleted: 0,
  };
  const keys: string[] = [];
  for (let i = 7; i < 14; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    keys.push(`${y}-${m}-${day}`);
  }
  const storageKeys = keys.map((k) => `stats-${k}`);
  const data = await chrome.storage.local.get(storageKeys);
  const totals: DailyStats = { ...EMPTY };
  const byDay: Record<string, DailyStats> = {};
  for (const date of keys) {
    const daily: DailyStats = data[`stats-${date}`] ?? { ...EMPTY };
    byDay[date] = daily;
    for (const k of Object.keys(EMPTY) as Array<keyof DailyStats>) {
      totals[k] += daily[k];
    }
  }
  return { ...totals, byDay };
}

async function onStartup(): Promise<void> {
  await initSessionSalt();
  await syncFingerprintState();
  await syncBlockingState();
  await registerWeeklyAlarm();
  const capacity = await checkRuleCapacity();
  if (capacity.warning) {
    console.warn(`DecoyShield: Low DNR rule capacity (${capacity.available} remaining)`);
  }
}

chrome.runtime.onInstalled.addListener(() => { onStartup(); });
chrome.runtime.onStartup.addListener(() => { onStartup(); });

onSettingsChanged(() => { syncFingerprintState(); syncBlockingState(); });

registerPhishingHandler();
registerRedirectHandler();
registerCookieHandler();

// --- Weekly report alarm & notification ---
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === WEEKLY_ALARM) {
    chrome.notifications.create('decoyshield-weekly-report', {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon128.png'),
      title: 'DecoyShield Weekly Report',
      message: 'Your weekly security report is ready. Click to view your browsing protection summary.',
      priority: 2,
    });
  }
});

chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId === 'decoyshield-weekly-report') {
    chrome.tabs.create({ url: chrome.runtime.getURL('report/index.html') });
    chrome.notifications.clear(notificationId);
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'ALLOW_URL' && typeof message.payload === 'string') {
    allowUrl(message.payload);
  }
  if (message?.type === 'GET_STATS') {
    getStats(message.range ?? 'day').then((stats) => sendResponse(stats));
    return true;
  }
  if (message?.type === 'RECORD_STAT' && message.statType) {
    recordStat({ type: message.statType, timestamp: Date.now() });
  }
  if (message?.type === 'GET_WEEKLY_REPORT') {
    Promise.all([getStats('week'), getPreviousWeekStats()]).then(([current, previous]) => {
      sendResponse({ current, previous });
    });
    return true;
  }
  if (message?.type === 'GET_BLOCK_LOG') {
    getBlockLog().then((log) => sendResponse(log));
    return true;
  }
  if (message?.type === 'CLEAN_COOKIES') {
    cleanTrackingCookies().then((count) => sendResponse({ deleted: count }));
    return true;
  }
  if (message?.type === 'DEEP_CLEAN_COOKIES') {
    deepCleanCookies().then((count) => sendResponse({ deleted: count }));
    return true;
  }
});

// --- Block-count tracking via declarativeNetRequestFeedback ---
function classifyRule(ruleId: number): StatType | null {
  if (ruleId < 100_000) return 'adsBlocked';
  if (ruleId < 200_000) return 'trackersBlocked';
  return null; // supplementary rules – no separate counter yet
}

try {
  chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
    const statType = classifyRule(info.rule.ruleId);
    if (statType) {
      recordStat({ type: statType, timestamp: Date.now() });
      // Log the blocked domain for the activity feed
      try {
        const url = new URL(info.request.url);
        pushLogEntry({
          domain: url.hostname,
          type: statType === 'adsBlocked' ? 'ad' : 'tracker',
          url: info.request.url,
          timestamp: Date.now(),
        });
      } catch { /* ignore bad URLs */ }
    }
  });
} catch {
  console.warn('DecoyShield: onRuleMatchedDebug not available (packed extension)');
}

console.log('DecoyShield service worker started');
