import { getSettings } from '@/shared/storage';

async function bridge() {
  const data = await chrome.storage.session.get(['sessionSalt', 'fingerprintSettings']);
  if (data.sessionSalt) {
    window.postMessage(
      {
        type: 'ds-fp-config',
        salt: data.sessionSalt,
        settings: data.fingerprintSettings ?? null,
      },
      '*',
    );
    // Count this page as fingerprint-protected (one per page load)
    if (data.fingerprintSettings?.enabled !== false) {
      chrome.runtime.sendMessage({ type: 'RECORD_STAT', statType: 'fingerprintProtections' });
    }
  }

  // Send redirect-block enabled state to the main-world redirect blocker
  const settings = await getSettings();
  window.postMessage(
    {
      type: 'ds-redirect-config',
      enabled: settings.masterEnabled && settings.redirectBlock.enabled,
    },
    '*',
  );
}

bridge();

// Relay popup-blocked events from the main-world redirect blocker
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (event.data?.type === 'ds-popup-blocked') {
    chrome.runtime.sendMessage({ type: 'RECORD_STAT', statType: 'adsBlocked' });
  }
});
