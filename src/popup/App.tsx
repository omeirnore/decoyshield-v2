import { useState, useEffect } from 'preact/hooks';
import type { DecoyShieldSettings } from '@/shared/types';
import { getSettings, updateSettings, onSettingsChanged } from '@/shared/storage';
import { ProtectionStatus } from './components/ProtectionStatus';
import { ModuleCard } from './components/ModuleCard';
import { StatsBar } from './components/StatsBar';
import './styles/popup.css';

export function App() {
  const [settings, setSettings] = useState<DecoyShieldSettings | null>(null);

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
          stats={[{ label: 'protected', count: 0 }]}
        />
        <ModuleCard
          title="Ad Blocking"
          icon="&#x1F6AB;"
          enabled={settings.blocking.adsEnabled}
          onToggle={() => toggle({ blocking: { adsEnabled: !settings.blocking.adsEnabled } })}
          stats={[{ label: 'blocked', count: 0 }]}
        />
        <ModuleCard
          title="Tracker Blocking"
          icon="&#x1F441;"
          enabled={settings.blocking.trackersEnabled}
          onToggle={() => toggle({ blocking: { trackersEnabled: !settings.blocking.trackersEnabled } })}
          stats={[{ label: 'blocked', count: 0 }]}
        />
        <ModuleCard
          title="Phishing Protection"
          icon="&#x1F3A3;"
          enabled={settings.phishing.enabled}
          onToggle={() => toggle({ phishing: { enabled: !settings.phishing.enabled } })}
          stats={[{ label: 'warnings', count: 0 }]}
        />
      </div>

      <StatsBar blocked={0} fingerprints={0} phishing={0} />

      <a class="settings-link" onClick={() => chrome.runtime.openOptionsPage()}>
        Open Settings
      </a>
    </div>
  );
}
