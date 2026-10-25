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
  }
}

bridge();
