const params = new URLSearchParams(location.search);
const url = params.get('url') ?? '';
const level = params.get('level') ?? 'high';
const reasons: string[] = (() => {
  try { return JSON.parse(params.get('reasons') ?? '[]'); }
  catch { return []; }
})();

const app = document.getElementById('app')!;

const levelColors: Record<string, string> = {
  high: '#ff4444',
  medium: '#ffaa00',
  low: '#44cc44',
};

app.innerHTML = `
  <div style="max-width:600px;margin:40px auto;text-align:center;">
    <div style="font-size:64px;margin-bottom:16px;">&#9888;</div>
    <h1 style="color:${levelColors[level] ?? levelColors.high}">
      ${level === 'high' ? 'Dangerous Site Detected' : 'Suspicious Site Detected'}
    </h1>
    <p>DecoyShield has detected potential threats on this page:</p>
    <ul style="text-align:left;display:inline-block;margin:16px 0;">
      ${reasons.map((r) => `<li>${escapeHtml(r)}</li>`).join('')}
    </ul>
    <p style="color:#999;word-break:break-all;font-size:12px;">${escapeHtml(url)}</p>
    <div style="margin-top:24px;">
      <button id="go-back" style="background:#00d2ff;color:#000;border:none;padding:12px 24px;
        border-radius:6px;cursor:pointer;font-size:16px;margin-right:12px;">
        Go back to safety
      </button>
    </div>
    <div style="margin-top:16px;">
      <a id="proceed" href="#" style="color:#666;font-size:13px;">
        I understand the risks, proceed anyway
      </a>
    </div>
  </div>
`;

function escapeHtml(s: string): string {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

document.getElementById('go-back')!.addEventListener('click', () => {
  history.back();
});

document.getElementById('proceed')!.addEventListener('click', (e) => {
  e.preventDefault();
  if (url) {
    chrome.runtime.sendMessage({ type: 'ALLOW_URL', payload: url });
    location.href = url;
  }
});
