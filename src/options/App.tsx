import { useState, useEffect } from 'preact/hooks';
import type { DecoyShieldSettings } from '@/shared/types';
import { getSettings, onSettingsChanged } from '@/shared/storage';
import { FingerprintSettings } from './pages/FingerprintSettings';
import { BlockingSettings } from './pages/BlockingSettings';
import { PhishingSettings } from './pages/PhishingSettings';
import { CookieManager } from './pages/CookieManager';
import { StatisticsPage } from './pages/StatisticsPage';
import { ThreatLog } from './pages/ThreatLog';
import './styles/options.css';

const TABS = ['Fingerprint', 'Blocking', 'Phishing', 'Cookies', 'Statistics', 'Threat Log', 'Weekly Report'] as const;
type Tab = typeof TABS[number];

function getInitialTab(): Tab {
  const hash = location.hash.slice(1).toLowerCase();
  const match = TABS.find((t) => t.toLowerCase() === hash);
  return match ?? 'Fingerprint';
}

export function App() {
  const [settings, setSettings] = useState<DecoyShieldSettings | null>(null);
  const [tab, setTab] = useState<Tab>(getInitialTab);

  useEffect(() => {
    getSettings().then(setSettings);
    return onSettingsChanged((s) => setSettings(s));
  }, []);

  const switchTab = (t: Tab) => {
    setTab(t);
    location.hash = t.toLowerCase();
  };

  if (!settings) return null;

  return (
    <div class="options-container">
      <div class="options-header">
        <span style={{ fontSize: '28px' }}>&#x1F6E1;</span>
        <h1>DecoyShield Settings</h1>
      </div>

      <div class="tab-bar">
        {TABS.map((t) => (
          <button key={t} class={`tab-btn ${tab === t ? 'active' : ''}`}
            onClick={() => switchTab(t)}>{t}</button>
        ))}
      </div>

      {tab === 'Fingerprint' && <FingerprintSettings settings={settings} />}
      {tab === 'Blocking' && <BlockingSettings settings={settings} />}
      {tab === 'Phishing' && <PhishingSettings settings={settings} />}
      {tab === 'Cookies' && <CookieManager />}
      {tab === 'Statistics' && <StatisticsPage />}
      {tab === 'Threat Log' && <ThreatLog />}
      {tab === 'Weekly Report' && (
        <div class="section" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <p style={{ fontSize: '48px', marginBottom: '16px' }}>{'\u{1F6E1}\u{FE0F}'}</p>
          <h2 style={{ marginBottom: '8px' }}>Weekly Security Report</h2>
          <p class="info-text" style={{ marginBottom: '20px' }}>
            View your weekly browsing protection summary with trends and personalised security recommendations.
          </p>
          <button
            class="btn btn-primary"
            onClick={() => chrome.tabs.create({ url: chrome.runtime.getURL('report/index.html') })}
          >
            Open Weekly Report
          </button>
          <p class="info-text" style={{ marginTop: '16px' }}>
            You'll also receive a notification each week when a new report is ready.
          </p>
        </div>
      )}
    </div>
  );
}
