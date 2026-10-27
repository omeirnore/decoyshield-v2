import { useState, useEffect, useCallback } from 'preact/hooks';
import type { DecoyShieldSettings, StatsData, FingerprintSettings } from '@/shared/types';
import { getSettings, updateSettings, onSettingsChanged } from '@/shared/storage';
import { ProtectionStatus } from './components/ProtectionStatus';
import { ModuleCard } from './components/ModuleCard';
import { CookieCard } from './components/CookieCard';
import { StatsBar } from './components/StatsBar';
import {
  FingerprintIcon, BanIcon, EyeOffIcon, AlertTriangleIcon,
  ShieldIcon, CookieIcon, BarChartIcon,
  CanvasIcon, GpuIcon, CompassIcon, MonitorIcon, AudioIcon, BoxSelectIcon,
} from '@/shared/Icons';
import './styles/popup.css';

import type { ComponentChild } from 'preact';

const FP_SUBTYPES: Array<{ key: keyof Omit<FingerprintSettings, 'enabled'>; label: string; icon: ComponentChild }> = [
  { key: 'canvas', label: 'Canvas', icon: <CanvasIcon size={16} /> },
  { key: 'webgl', label: 'WebGL', icon: <GpuIcon size={16} /> },
  { key: 'navigator', label: 'Navigator', icon: <CompassIcon size={16} /> },
  { key: 'screen', label: 'Screen', icon: <MonitorIcon size={16} /> },
  { key: 'audioContext', label: 'Audio', icon: <AudioIcon size={16} /> },
  { key: 'clientRects', label: 'ClientRects', icon: <BoxSelectIcon size={16} /> },
];

const SECTIONS = ['Modules', 'Fingerprint Controls', 'Activity'] as const;

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
        if (resp) setLog([...resp].reverse());
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

/* ─── Section: Modules ─── */
function ModulesSection({
  settings,
  stats,
  toggle,
}: {
  settings: DecoyShieldSettings;
  stats: ReturnType<typeof useLiveStats>;
  toggle: (path: Record<string, unknown>) => void;
}) {
  return (
    <div class="section-content">
      <div class="modules-grid">
        <ModuleCard
          title="Fingerprint Protection"
          icon={<FingerprintIcon size={18} color="#4f8cff" />}
          enabled={settings.fingerprint.enabled}
          onToggle={() => toggle({ fingerprint: { enabled: !settings.fingerprint.enabled } })}
          stats={[{ label: 'protected', count: stats.fingerprints }]}
        />
        <ModuleCard
          title="Ad Blocking"
          icon={<BanIcon size={18} color="#ff4757" />}
          enabled={settings.blocking.adsEnabled}
          onToggle={() => toggle({ blocking: { adsEnabled: !settings.blocking.adsEnabled } })}
          stats={[{ label: 'blocked', count: stats.ads }]}
        />
        <ModuleCard
          title="Tracker Blocking"
          icon={<EyeOffIcon size={18} color="#ffa502" />}
          enabled={settings.blocking.trackersEnabled}
          onToggle={() => toggle({ blocking: { trackersEnabled: !settings.blocking.trackersEnabled } })}
          stats={[{ label: 'blocked', count: stats.trackers }]}
        />
        <ModuleCard
          title="Phishing Protection"
          icon={<AlertTriangleIcon size={18} color="#ff6348" />}
          enabled={settings.phishing.enabled}
          onToggle={() => toggle({ phishing: { enabled: !settings.phishing.enabled } })}
          stats={[{ label: 'warnings', count: stats.phishing }]}
        />
        <ModuleCard
          title="Redirect Blocker"
          icon={<ShieldIcon size={18} color="#7bed9f" />}
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
    </div>
  );
}

/* ─── Section: Fingerprint Controls ─── */
function FingerprintSection({
  settings,
  toggle,
}: {
  settings: DecoyShieldSettings;
  toggle: (path: Record<string, unknown>) => void;
}) {
  const allOn = FP_SUBTYPES.every(({ key }) => settings.fingerprint[key]);
  const allOff = FP_SUBTYPES.every(({ key }) => !settings.fingerprint[key]);

  const toggleAll = () => {
    const newVal = !allOn;
    const updates: Record<string, boolean> = {};
    FP_SUBTYPES.forEach(({ key }) => { updates[key] = newVal; });
    toggle({ fingerprint: updates });
  };

  return (
    <div class="section-content">
      <div class="fp-section-header">
        <span class="fp-section-desc">Toggle individual spoofing types</span>
        <button class="fp-toggle-all-btn" onClick={toggleAll}>
          {allOn ? 'Disable All' : 'Enable All'}
        </button>
      </div>
      <div class="fp-controls-list">
        {FP_SUBTYPES.map(({ key, label, icon }) => (
          <div class="fp-control-row" key={key}>
            <span class="fp-control-icon">{icon}</span>
            <div class="fp-control-info">
              <span class="fp-control-label">{label}</span>
              <span class="fp-control-hint">
                {key === 'canvas' && 'Randomize canvas draw output'}
                {key === 'webgl' && 'Spoof GPU renderer & vendor'}
                {key === 'navigator' && 'Mask hardware & platform info'}
                {key === 'screen' && 'Randomize screen dimensions'}
                {key === 'audioContext' && 'Add noise to audio fingerprint'}
                {key === 'clientRects' && 'Offset element bounding rects'}
              </span>
            </div>
            <label class="toggle-switch">
              <input
                type="checkbox"
                checked={settings.fingerprint[key]}
                onChange={() => toggle({ fingerprint: { [key]: !settings.fingerprint[key] } })}
              />
              <span class="toggle-slider" />
            </label>
          </div>
        ))}
      </div>
      {!settings.fingerprint.enabled && (
        <div class="fp-disabled-notice">
          Fingerprint Protection is off. Enable it on the Modules page first.
        </div>
      )}
    </div>
  );
}

/* ─── Section: Activity ─── */
function ActivitySection({
  stats,
  blockLog,
}: {
  stats: ReturnType<typeof useLiveStats>;
  blockLog: BlockLogEntry[];
}) {
  return (
    <div class="section-content">
      <StatsBar
        blocked={stats.ads + stats.trackers}
        fingerprints={stats.fingerprints}
        phishing={stats.phishing}
      />
      <div style={{ height: 10 }} />
      <ActivityLog log={blockLog} />
      <div style={{ height: 10 }} />
      <button
        class="report-btn"
        onClick={() => chrome.tabs.create({ url: chrome.runtime.getURL('report/index.html') })}
      >
        <span class="report-btn-icon"><BarChartIcon size={14} /></span> Weekly Security Report
      </button>
    </div>
  );
}

/* ─── Main App ─── */
export function App() {
  const [settings, setSettings] = useState<DecoyShieldSettings | null>(null);
  const [sectionIdx, setSectionIdx] = useState(0);
  const stats = useLiveStats();
  const blockLog = useBlockLog();

  useEffect(() => {
    getSettings().then(setSettings);
    return onSettingsChanged((s) => setSettings(s));
  }, []);

  const goNext = useCallback(() => setSectionIdx((i) => Math.min(i + 1, SECTIONS.length - 1)), []);
  const goPrev = useCallback(() => setSectionIdx((i) => Math.max(i - 1, 0)), []);

  if (!settings) return null;

  const toggle = (path: Record<string, unknown>) => updateSettings(path);
  const currentSection = SECTIONS[sectionIdx];

  return (
    <div class="popup-container">
      {/* Header — always visible */}
      <ProtectionStatus
        settings={settings}
        onToggle={() => toggle({ masterEnabled: !settings.masterEnabled })}
      />

      {/* Section dots */}
      <div class="section-dots">
        {SECTIONS.map((s, i) => (
          <button
            key={s}
            class={`section-dot ${i === sectionIdx ? 'active' : ''}`}
            onClick={() => setSectionIdx(i)}
            title={s}
          />
        ))}
      </div>

      {/* Navigation + Content */}
      <div class="section-nav">
        <button
          class="nav-arrow"
          onClick={goPrev}
          disabled={sectionIdx === 0}
          aria-label="Previous section"
        >
          {'❮'}
        </button>

        <div class="section-panel">
          <div class="section-title">{currentSection}</div>
          {currentSection === 'Modules' && (
            <ModulesSection settings={settings} stats={stats} toggle={toggle} />
          )}
          {currentSection === 'Fingerprint Controls' && (
            <FingerprintSection settings={settings} toggle={toggle} />
          )}
          {currentSection === 'Activity' && (
            <ActivitySection stats={stats} blockLog={blockLog} />
          )}
        </div>

        <button
          class="nav-arrow"
          onClick={goNext}
          disabled={sectionIdx === SECTIONS.length - 1}
          aria-label="Next section"
        >
          {'❯'}
        </button>
      </div>

      {/* Section counter + Settings */}
      <div class="section-footer">
        <span class="section-counter">{sectionIdx + 1} / {SECTIONS.length}</span>
        <a class="settings-link" onClick={() => chrome.runtime.openOptionsPage()}>
          Settings
        </a>
      </div>
    </div>
  );
}
