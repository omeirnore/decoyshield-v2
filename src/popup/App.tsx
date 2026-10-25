import { useState, useEffect } from 'preact/hooks';
import type { DecoyShieldSettings, StatsData } from '@/shared/types';
import { getSettings, updateSettings, onSettingsChanged } from '@/shared/storage';
import { ProtectionStatus } from './components/ProtectionStatus';
import { ModuleCard } from './components/ModuleCard';
import { CookieCard } from './components/CookieCard';
import { StatsBar } from './components/StatsBar';
import './styles/popup.css';

interface BlockLogEntry {
  domain: string;
  type: 'ad' | 'tracker' | 'redirect' | 'phishing';
  url?: string;
  reason?: string;
  timestamp: number;
}

function useLiveStats() {
  const [stats, setStats] = useState({ ads: 0, trackers: 0, fingerprints: 0, phishing: 0, redirects: 0, cookies: 0 });

  useEffect(() => {
    function fetchStats() {
      chrome.runtime.sendMessage({ type: 'GET_STATS', range: 'day' }, (resp: StatsData | undefined) => {
        if (!resp) return;
        setStats({
          ads: resp.adsBlocked ?? 0,
          trackers: resp.trackersBlocked ?? 0,
          fingerprints: resp.fingerprintProtections ?? 0,
          phishing: resp.phishingWarnings ?? 0,
          redirects: resp.redirectsBlocked ?? 0,
          cookies: resp.cookiesDeleted ?? 0,
        });
      });
    }
    fetchStats();
    const id = setInterval(fetchStats, 3000);
    return () => clearInterval(id);
  }, []);

  return stats;
}

function useBlockLog() {
  const [log, setLog] = useState<BlockLogEntry[]>([]);

  useEffect(() => {
    function fetchLog() {
      chrome.runtime.sendMessage({ type: 'GET_BLOCK_LOG' }, (resp: BlockLogEntry[] | undefined) => {
        if (resp) setLog([...resp].reverse()); // newest first
      });
    }
    fetchLog();
    const id = setInterval(fetchLog, 3000);
    return () => clearInterval(id);
  }, []);

  return log;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function badgeLabel(type: string): string {
  switch (type) {
    case 'ad': return 'ad';
    case 'tracker': return 'tracker';
    case 'redirect': return 'redirect';
    case 'phishing': return 'phishing';
    default: return type;
  }
}

function ActivityLog({ log }: { log: BlockLogEntry[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div class="activity-log">
      <div class="activity-log-header" onClick={() => setOpen(!open)}>
        <span class="activity-log-title">Activity Log ({log.length})</span>
        <span class="activity-log-toggle">{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div class="activity-log-list">
          {log.length === 0 ? (
            <div class="log-empty">No blocked requests yet. Browse some websites!</div>
          ) : (
            log.slice(0, 50).map((entry, i) => (
              <div class={`activity-log-item ${entry.type === 'redirect' || entry.type === 'phishing' ? 'log-highlight' : ''}`} key={i}>
                <div class="log-row-main">
                  <span class={`log-badge ${entry.type}`}>{badgeLabel(entry.type)}</span>
                  <span class="log-domain" title={entry.url || entry.domain}>{entry.domain}</span>
                  <span class="log-time">{formatTime(entry.timestamp)}</span>
                </div>
                {(entry.type === 'redirect' || entry.type === 'phishing') && (
                  <div class="log-row-detail">
                    {entry.reason && <span class="log-reason">{entry.reason}</span>}
                    {entry.url && (
                      <span class="log-url" title={entry.url}>
                        {entry.url.length > 60 ? entry.url.slice(0, 60) + '…' : entry.url}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function App() {
  const [settings, setSettings] = useState<DecoyShieldSettings | null>(null);
  const stats = useLiveStats();
  const blockLog = useBlockLog();

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
        <ModuleCard
          title="Redirect Blocker"
          icon="&#x1F6E1;"
          enabled={settings.redirectBlock.enabled}
          onToggle={() => toggle({ redirectBlock: { enabled: !settings.redirectBlock.enabled } })}
          stats={[{ label: 'blocked', count: stats.redirects }]}
        />
        <CookieCard
          enabled={settings.cookies.enabled}
          onToggle={() => toggle({ cookies: { enabled: !settings.cookies.enabled } })}
          deletedCount={stats.cookies}
        />
      </div>

      <StatsBar
        blocked={stats.ads + stats.trackers}
        fingerprints={stats.fingerprints}
        phishing={stats.phishing}
      />

      <ActivityLog log={blockLog} />

      <a class="settings-link" onClick={() => chrome.runtime.openOptionsPage()}>
        Open Settings
      </a>
    </div>
  );
}
