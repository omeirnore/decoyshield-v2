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
}

bridge();
