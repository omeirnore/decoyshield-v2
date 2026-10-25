import { useState, useEffect } from 'preact/hooks';
import type { DecoyShieldSettings, StatsData } from '@/shared/types';
import { getSettings, updateSettings, onSettingsChanged } from '@/shared/storage';
import { ProtectionStatus } from './components/ProtectionStatus';
import { ModuleCard } from './components/ModuleCard';
import { StatsBar } from './components/StatsBar';
import './styles/popup.css';

function useLiveStats() {
  const [stats, setStats] = useState({ ads: 0, trackers: 0, fingerprints: 0, phishing: 0 });

  useEffect(() => {
    function fetchStats() {
      chrome.runtime.sendMessage({ type: 'GET_STATS', range: 'day' }, (resp: StatsData | undefined) => {
        if (!resp) return;
        // StatsData extends DailyStats – totals are at the top level
        setStats({
          ads: resp.adsBlocked ?? 0,
          trackers: resp.trackersBlocked ?? 0,
          fingerprints: resp.fingerprintProtections ?? 0,
          phishing: resp.phishingWarnings ?? 0,
        });
      });
    }
    fetchStats();
    const id = setInterval(fetchStats, 3000); // refresh every 3s while popup is open
    return () => clearInterval(id);
  }, []);

  return stats;
}

export function App() {
  const [settings, setSettings] = useState<DecoyShieldSettings | null>(null);
  const stats = useLiveStats();

  useEffect(() => {
    getSettings().then(setSettings);
    return onSettingsChanged((s) => setSettings(s));
  }, []);

  if (!settings) return null;

  const toggle = (path: Record<string, unknown>) => updateSettings(path);

  return (
    <div class="popup-container">
      <ProtectionStatus
        settings={settings}
        onToggle={() => toggle({ masterEnabled: !settings.masterEnabled })}
      />

      <div class="modules-grid">
        <ModuleCard
          title="Fingerprint Protection"
          icon="&#x1F9EC;"
          enabled={settings.fingerprint.enabled}
          onToggle={() => toggle({ fingerprint: { enabled: !settings.fingerprint.enabled } })}
          stats={[{ label: 'protected', count: stats.fingerprints }]}
        />
        <ModuleCard
          title="Ad Blocking"
          icon="&#x1F6AB;"
          enabled={settings.blocking.adsEnabled}
          onToggle={() => toggle({ blocking: { adsEnabled: !settings.blocking.adsEnabled } })}
          stats={[{ label: 'blocked', count: stats.ads }]}
        />
        <ModuleCard
          title="Tracker Blocking"
          icon="&#x1F441;"
          enabled={settings.blocking.trackersEnabled}
          onToggle={() => toggle({ blocking: { trackersEnabled: !settings.blocking.trackersEnabled } })}
          stats={[{ label: 'blocked', count: stats.trackers }]}
        />
        <ModuleCard
          title="Phishing Protection"
          icon="&#x1F3A3;"
          enabled={settings.phishing.enabled}
          onToggle={() => toggle({ phishing: { enabled: !settings.phishing.enabled } })}
          stats={[{ label: 'warnings', count: stats.phishing }]}
        />
      </div>

      <StatsBar
        blocked={stats.ads + stats.trackers}
        fingerprints={stats.fingerprints}
        phishing={stats.phishing}
      />

      <a class="settings-link" onClick={() => chrome.runtime.openOptionsPage()}>
        Open Settings
      </a>
    </div>
  );
}
