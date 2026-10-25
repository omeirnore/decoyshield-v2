import { useState } from 'preact/hooks';
import type { DailyStats } from '@/shared/types';

const METRICS: Array<{ key: keyof DailyStats; label: string; color: string }> = [
  { key: 'adsBlocked', label: 'Ads Blocked', color: '#4f8cff' },
  { key: 'trackersBlocked', label: 'Trackers Blocked', color: '#ffa502' },
  { key: 'fingerprintProtections', label: 'FP Protections', color: '#2ed573' },
  { key: 'phishingWarnings', label: 'Phishing Warnings', color: '#ff4757' },
  { key: 'cookiesDeleted', label: 'Cookies Deleted', color: '#a855f7' },
];

export function StatisticsPage() {
  const [range, setRange] = useState<'day' | 'week' | 'month'>('day');
  const [confirmClear, setConfirmClear] = useState(false);

  const stats: DailyStats = {
    adsBlocked: 0,
    trackersBlocked: 0,
    fingerprintProtections: 0,
    phishingWarnings: 0,
    cookiesDeleted: 0,
  };

  const max = Math.max(1, ...METRICS.map((m) => stats[m.key]));

  return (
    <div>
      <div class="section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2>Statistics</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['day', 'week', 'month'] as const).map((r) => (
              <button key={r} class={`btn ${range === r ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setRange(r)}>{r[0].toUpperCase() + r.slice(1)}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {METRICS.map(({ key, label, color }) => (
            <div key={key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '13px' }}>{label}</span>
                <span style={{ fontSize: '13px', fontWeight: '600', color }}>{stats[key]}</span>
              </div>
              <div class="capacity-bar">
                <div class="capacity-fill" style={{ width: `${(stats[key] / max) * 100}%`, background: color }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div class="section">
        <button class="btn btn-danger" onClick={() => setConfirmClear(true)}>Clear All Statistics</button>
      </div>

      {confirmClear && (
        <div class="confirm-dialog" onClick={() => setConfirmClear(false)}>
          <div class="confirm-box" onClick={(e) => e.stopPropagation()}>
            <p>Clear all statistics? This cannot be undone.</p>
            <div class="confirm-actions">
              <button class="btn btn-outline" onClick={() => setConfirmClear(false)}>Cancel</button>
              <button class="btn btn-danger" onClick={() => setConfirmClear(false)}>Clear</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
