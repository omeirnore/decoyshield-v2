import { useState, useEffect, useCallback } from 'preact/hooks';
import type { StatsData, DailyStats, DecoyShieldSettings } from '@/shared/types';
import { getSettings, updateSettings, onSettingsChanged } from '@/shared/storage';
import './styles/report.css';

interface WeeklyReport {
  current: StatsData;
  previous: StatsData;
}

interface Remediation {
  icon: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'success';
}

const STAT_LABELS: Record<keyof DailyStats, { label: string; icon: string }> = {
  adsBlocked: { label: 'Ads Blocked', icon: '\u{1F6AB}' },
  trackersBlocked: { label: 'Trackers Blocked', icon: '\u{1F441}' },
  fingerprintProtections: { label: 'Fingerprint Protections', icon: '\u{1F9EC}' },
  phishingWarnings: { label: 'Phishing Warnings', icon: '\u{1F3A3}' },
  redirectsBlocked: { label: 'Redirects Blocked', icon: '\u{21A9}' },
  cookiesDeleted: { label: 'Cookies Deleted', icon: '\u{1F36A}' },
};

const SECTIONS = ['Overview', 'Daily Breakdown', 'Protection Modules', 'Recommendations'] as const;
type Section = typeof SECTIONS[number];

function getTrend(current: number, previous: number): { pct: number; direction: 'up' | 'down' | 'flat' } {
  if (previous === 0 && current === 0) return { pct: 0, direction: 'flat' };
  if (previous === 0) return { pct: 100, direction: 'up' };
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return { pct: 0, direction: 'flat' };
  return { pct: Math.abs(pct), direction: pct > 0 ? 'up' : 'down' };
}

function generateRemediations(report: WeeklyReport): Remediation[] {
  const tips: Remediation[] = [];
  const { current, previous } = report;

  if (current.phishingWarnings > 0) {
    tips.push({
      icon: '\u{26A0}\u{FE0F}',
      title: `${current.phishingWarnings} phishing attempt${current.phishingWarnings > 1 ? 's' : ''} detected`,
      description: 'Avoid clicking links in emails from unknown senders. Always verify URLs before entering credentials. Look for HTTPS and check the domain carefully.',
      severity: 'warning',
    });
  } else {
    tips.push({
      icon: '\u{2705}',
      title: 'No phishing attempts detected',
      description: 'Great browsing habits! Keep being cautious with unfamiliar links and emails.',
      severity: 'success',
    });
  }

  const trackerTrend = getTrend(current.trackersBlocked, previous.trackersBlocked);
  if (trackerTrend.direction === 'up' && trackerTrend.pct > 30) {
    tips.push({
      icon: '\u{1F4C8}',
      title: `Trackers up ${trackerTrend.pct}% vs last week`,
      description: 'You may be visiting more sites with aggressive tracking. Consider enabling cookie auto-delete if not already active, and review your browsing for new sites that load excessive trackers.',
      severity: 'warning',
    });
  } else if (current.trackersBlocked > 0) {
    tips.push({
      icon: '\u{1F6E1}\u{FE0F}',
      title: `${current.trackersBlocked} trackers blocked`,
      description: 'DecoyShield is actively protecting your privacy by blocking known tracking scripts and pixels.',
      severity: 'info',
    });
  }

  if (current.adsBlocked > 100) {
    tips.push({
      icon: '\u{1F4A1}',
      title: `${current.adsBlocked} ads blocked this week`,
      description: 'Heavy ad exposure detected. Consider checking if supplementary blocking rules are enabled in settings for broader coverage.',
      severity: 'info',
    });
  } else if (current.adsBlocked > 0) {
    tips.push({
      icon: '\u{1F6AB}',
      title: `${current.adsBlocked} ads blocked`,
      description: 'Ad blocking is working normally. Pages should load faster and with fewer distractions.',
      severity: 'success',
    });
  }

  if (current.fingerprintProtections === 0) {
    tips.push({
      icon: '\u{1F9EC}',
      title: 'No fingerprint protections recorded',
      description: 'Fingerprint protection may be disabled. Enable it in the Protection Modules section to prevent sites from uniquely identifying your browser.',
      severity: 'warning',
    });
  } else {
    tips.push({
      icon: '\u{1F9EC}',
      title: `${current.fingerprintProtections} pages fingerprint-protected`,
      description: 'Your browser fingerprint is being randomized per-site, making cross-site tracking much harder.',
      severity: 'success',
    });
  }

  if (current.redirectsBlocked > 0) {
    const redirectTrend = getTrend(current.redirectsBlocked, previous.redirectsBlocked);
    const trendText = redirectTrend.direction === 'up' ? ` (${redirectTrend.pct}% increase)` : '';
    tips.push({
      icon: '\u{21A9}\u{FE0F}',
      title: `${current.redirectsBlocked} redirects blocked${trendText}`,
      description: 'Malicious redirects were intercepted before they could take you to unwanted sites.',
      severity: 'info',
    });
  }

  if (current.cookiesDeleted > 0) {
    tips.push({
      icon: '\u{1F36A}',
      title: `${current.cookiesDeleted} tracking cookies cleaned`,
      description: 'Tracking cookies from known advertising and analytics domains were automatically removed.',
      severity: 'success',
    });
  }

  return tips;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/* ─── Section Components ─── */

function OverviewSection({ report }: { report: WeeklyReport }) {
  const statKeys = Object.keys(STAT_LABELS) as Array<keyof DailyStats>;
  return (
    <div class="section-content">
      <div class="stats-grid">
        {statKeys.map((key) => {
          const { label, icon } = STAT_LABELS[key];
          const trend = getTrend(report.current[key], report.previous[key]);
          return (
            <div class="stat-card" key={key}>
              <div class="stat-icon">{icon}</div>
              <div class="stat-value">{report.current[key].toLocaleString()}</div>
              <div class="stat-label">{label}</div>
              {trend.direction !== 'flat' ? (
                <div class={`stat-trend trend-${trend.direction}`}>
                  {trend.direction === 'up' ? '↑' : '↓'} {trend.pct}%
                  <span class="trend-label"> vs last week</span>
                </div>
              ) : (
                <div class="stat-trend trend-flat">{'—'} No change</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DailyBreakdownSection({ byDay }: { byDay: Record<string, DailyStats> }) {
  const days = Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b));
  if (days.length === 0) {
    return <div class="section-content"><div class="empty-state">No daily data available yet.</div></div>;
  }

  const maxTotal = Math.max(
    ...days.map(([, d]) => d.adsBlocked + d.trackersBlocked + d.fingerprintProtections + d.phishingWarnings + d.redirectsBlocked + d.cookiesDeleted),
    1,
  );

  return (
    <div class="section-content">
      <div class="daily-chart">
        {days.map(([date, stats]) => {
          const total = stats.adsBlocked + stats.trackersBlocked + stats.fingerprintProtections + stats.phishingWarnings + stats.redirectsBlocked + stats.cookiesDeleted;
          const pct = (total / maxTotal) * 100;
          return (
            <div class="day-row" key={date}>
              <span class="day-label">{formatDate(date)}</span>
              <div class="day-bar-track">
                <div class="day-bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <span class="day-total">{total.toLocaleString()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProtectionModulesSection({ settings }: { settings: DecoyShieldSettings }) {
  const modules = [
    {
      icon: '\u{1F9EC}', label: 'Fingerprint Protection',
      desc: 'Randomizes browser fingerprint per-site to prevent cross-site tracking',
      enabled: settings.fingerprint.enabled,
      toggle: () => updateSettings({ fingerprint: { enabled: !settings.fingerprint.enabled } }),
    },
    {
      icon: '\u{1F6AB}', label: 'Ad Blocking',
      desc: 'Blocks ads using curated filter rules',
      enabled: settings.blocking.adsEnabled,
      toggle: () => updateSettings({ blocking: { adsEnabled: !settings.blocking.adsEnabled } }),
    },
    {
      icon: '\u{1F441}', label: 'Tracker Blocking',
      desc: 'Blocks known tracking scripts and pixels',
      enabled: settings.blocking.trackersEnabled,
      toggle: () => updateSettings({ blocking: { trackersEnabled: !settings.blocking.trackersEnabled } }),
    },
    {
      icon: '\u{1F3A3}', label: 'Phishing Protection',
      desc: 'Warns before visiting suspected phishing sites',
      enabled: settings.phishing.enabled,
      toggle: () => updateSettings({ phishing: { enabled: !settings.phishing.enabled } }),
    },
    {
      icon: '\u{1F6E1}', label: 'Redirect Blocker',
      desc: 'Intercepts malicious redirects and popup navigations',
      enabled: settings.redirectBlock.enabled,
      toggle: () => updateSettings({ redirectBlock: { enabled: !settings.redirectBlock.enabled } }),
    },
    {
      icon: '\u{1F36A}', label: 'Cookie Manager',
      desc: 'Automatically deletes tracking cookies from known domains',
      enabled: settings.cookies.enabled,
      toggle: () => updateSettings({ cookies: { enabled: !settings.cookies.enabled } }),
    },
  ];

  return (
    <div class="section-content">
      <div class="modules-list">
        {modules.map((m) => (
          <div class="module-row" key={m.label}>
            <span class="module-icon">{m.icon}</span>
            <div class="module-detail">
              <div class="module-name">{m.label}</div>
              <div class="module-desc">{m.desc}</div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" checked={m.enabled} onChange={m.toggle} />
              <span class="toggle-slider" />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecommendationsSection({ report }: { report: WeeklyReport }) {
  const remediations = generateRemediations(report);
  return (
    <div class="section-content">
      <div class="remediation-list">
        {remediations.map((tip, i) => (
          <div key={i} class={`remediation-card severity-${tip.severity}`}>
            <div class="remediation-icon">{tip.icon}</div>
            <div class="remediation-content">
              <div class="remediation-title">{tip.title}</div>
              <div class="remediation-desc">{tip.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main App ─── */

export function App() {
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [settings, setSettings] = useState<DecoyShieldSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [sectionIdx, setSectionIdx] = useState(0);

  useEffect(() => {
    getSettings().then(setSettings);
    return onSettingsChanged((s) => setSettings(s));
  }, []);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_WEEKLY_REPORT' }).then((data: WeeklyReport | undefined) => {
      if (data) setReport(data);
      setLoading(false);
    }).catch(() => {
      chrome.runtime.sendMessage({ type: 'GET_STATS', range: 'week' }).then((current: StatsData | undefined) => {
        setReport({ current: current ?? emptyStats(), previous: emptyStats() });
        setLoading(false);
      });
    });
  }, []);

  const goNext = useCallback(() => setSectionIdx((i) => Math.min(i + 1, SECTIONS.length - 1)), []);
  const goPrev = useCallback(() => setSectionIdx((i) => Math.max(i - 1, 0)), []);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); goNext(); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); goPrev(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goNext, goPrev]);

  if (loading) {
    return <div class="report-container"><div class="report-loading">Loading report...</div></div>;
  }

  if (!report || !settings) {
    return <div class="report-container"><div class="report-loading">No data available yet. Check back after browsing for a week.</div></div>;
  }

  const currentSection = SECTIONS[sectionIdx];
  const reportDate = new Date();
  const weekStart = new Date(reportDate);
  weekStart.setDate(weekStart.getDate() - 6);

  return (
    <div class="report-container">
      {/* Header */}
      <div class="report-header">
        <div class="report-title-row">
          <span class="shield-icon">{'\u{1F6E1}\u{FE0F}'}</span>
          <div>
            <h1>Weekly Security Report</h1>
            <p class="report-date">
              {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              {' — '}
              {reportDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      {/* Section indicator dots */}
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

      {/* Navigation + Section */}
      <div class="section-nav">
        <button
          class="nav-arrow nav-left"
          onClick={goPrev}
          disabled={sectionIdx === 0}
          aria-label="Previous section"
        >
          {'❮'}
        </button>

        <div class="section-panel">
          <h2 class="section-title">{currentSection}</h2>
          {currentSection === 'Overview' && <OverviewSection report={report} />}
          {currentSection === 'Daily Breakdown' && <DailyBreakdownSection byDay={report.current.byDay} />}
          {currentSection === 'Protection Modules' && <ProtectionModulesSection settings={settings} />}
          {currentSection === 'Recommendations' && <RecommendationsSection report={report} />}
        </div>

        <button
          class="nav-arrow nav-right"
          onClick={goNext}
          disabled={sectionIdx === SECTIONS.length - 1}
          aria-label="Next section"
        >
          {'❯'}
        </button>
      </div>

      {/* Section label */}
      <div class="section-counter">
        {sectionIdx + 1} / {SECTIONS.length}
      </div>

      <div class="report-footer">
        <p>Generated by DecoyShield &middot; Protecting your browsing privacy</p>
      </div>
    </div>
  );
}

function emptyStats(): StatsData {
  return {
    adsBlocked: 0, trackersBlocked: 0, fingerprintProtections: 0,
    phishingWarnings: 0, redirectsBlocked: 0, cookiesDeleted: 0,
    byDay: {},
  };
}
