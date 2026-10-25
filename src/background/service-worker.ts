import { getSettings, onSettingsChanged } from '@/shared/storage';
import {
  registerFingerprintScripts,
  unregisterFingerprintScripts,
} from './fingerprint-registrar';
import { registerPhishingHandler, allowUrl } from './phishing-handler';

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

async function onStartup(): Promise<void> {
  await initSessionSalt();
  await syncFingerprintState();
}

chrome.runtime.onInstalled.addListener(() => { onStartup(); });
chrome.runtime.onStartup.addListener(() => { onStartup(); });

onSettingsChanged(() => { syncFingerprintState(); });

registerPhishingHandler();

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'ALLOW_URL' && typeof message.payload === 'string') {
    allowUrl(message.payload);
  }
});

console.log('DecoyShield service worker started');
