import type { DecoyShieldSettings, RiskLevel } from '@/shared/types';
import { updateSettings } from '@/shared/storage';

interface Props {
  settings: DecoyShieldSettings;
}

export function PhishingSettings({ settings }: Props) {
  const phishing = settings.phishing;
  return (
    <div>
      <div class="section">
        <h2>Phishing Protection</h2>
        <div class="setting-row">
          <div class="setting-label">
            <span>Enable phishing detection</span>
            <div class="desc">Analyzes URLs for phishing indicators using local heuristics.</div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" checked={phishing.enabled}
              onChange={() => updateSettings({ phishing: { enabled: !phishing.enabled } })} />
            <span class="toggle-slider" />
          </label>
        </div>
      </div>

      <div class="section">
        <h2>Google Safe Browsing</h2>
        <div class="setting-row">
          <div class="setting-label">
            <span>Enable Safe Browsing lookup</span>
            <div class="desc">Opt-in: partial URL hashes may be sent to Google's Safe Browsing service. Full URLs are never transmitted.</div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" checked={phishing.safeBrowsingEnabled}
              onChange={() => updateSettings({ phishing: { safeBrowsingEnabled: !phishing.safeBrowsingEnabled } })} />
            <span class="toggle-slider" />
          </label>
        </div>

        {phishing.safeBrowsingEnabled && (
          <div class="setting-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
            <div class="setting-label">
              <span>API Key</span>
              <div class="desc">Required for Safe Browsing lookups. Get a key from Google Cloud Console.</div>
            </div>
            <input class="input-field" type="password" placeholder="Enter Safe Browsing API key"
              value={phishing.safeBrowsingApiKey}
              onBlur={(e) => updateSettings({ phishing: { safeBrowsingApiKey: (e.target as HTMLInputElement).value } })} />
          </div>
        )}
      </div>

      <div class="section">
        <h2>Risk Threshold</h2>
        <div class="setting-row">
          <div class="setting-label">
            <span>Block pages at or above</span>
            <div class="desc">Low: most aggressive. Medium: balanced. High: only clear threats.</div>
          </div>
          <select class="select-field" value={phishing.riskThreshold}
            onChange={(e) => updateSettings({ phishing: { riskThreshold: (e.target as HTMLSelectElement).value as RiskLevel } })}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <p class="info-text" style={{ marginTop: '12px' }}>
          No detection system is perfect. DecoyShield may not catch all threats.
        </p>
      </div>
    </div>
  );
}
