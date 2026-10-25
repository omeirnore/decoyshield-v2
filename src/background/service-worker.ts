import { getSettings, onSettingsChanged } from '@/shared/storage';
import {
  registerFingerprintScripts,
  unregisterFingerprintScripts,
} from './fingerprint-registrar';
import { registerPhishingHandler, allowUrl } from './phishing-handler';
import { enableRuleset, disableRuleset, checkRuleCapacity } from './dnr-manager';
import { recordStat, getStats } from './stats-collector';
import type { StatType } from '@/shared/types';

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

async function onStartup(): Promise<void> {
  await initSessionSalt();
  await syncFingerprintState();
  await syncBlockingState();
  const capacity = await checkRuleCapacity();
  if (capacity.warning) {
    console.warn(`DecoyShield: Low DNR rule capacity (${capacity.available} remaining)`);
  }
}

chrome.runtime.onInstalled.addListener(() => { onStartup(); });
chrome.runtime.onStartup.addListener(() => { onStartup(); });

onSettingsChanged(() => { syncFingerprintState(); syncBlockingState(); });

registerPhishingHandler();

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'ALLOW_URL' && typeof message.payload === 'string') {
    allowUrl(message.payload);
  }
  if (message?.type === 'GET_STATS') {
    getStats(message.range ?? 'day').then((stats) => sendResponse(stats));
    return true; // keep channel open for async response
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
    }
  });
} catch {
  // onRuleMatchedDebug only available when the extension was loaded unpacked
  console.warn('DecoyShield: onRuleMatchedDebug not available (packed extension)');
}

console.log('DecoyShield service worker started');
