import { getSettings, onSettingsChanged } from '@/shared/storage';
import {
  registerFingerprintScripts,
  unregisterFingerprintScripts,
} from './fingerprint-registrar';
import { registerPhishingHandler, allowUrl } from './phishing-handler';
import { enableRuleset, disableRuleset, checkRuleCapacity } from './dnr-manager';

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

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'ALLOW_URL' && typeof message.payload === 'string') {
    allowUrl(message.payload);
  }
});

console.log('DecoyShield service worker started');
