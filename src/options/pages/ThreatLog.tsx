import { useState, useEffect } from 'preact/hooks';
import { getThreatLog, clearThreatLog } from '@/background/threat-log';
import type { ThreatEntry } from '@/background/threat-log';

const BADGE_CLASS = { low: 'badge-success', medium: 'badge-warning', high: 'badge-danger' } as const;

export function ThreatLog() {
  const [entries, setEntries] = useState<ThreatEntry[]>([]);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    getThreatLog().then(setEntries);
  }, []);

  const truncateUrl = (url: string) => url.length > 60 ? url.slice(0, 57) + '...' : url;

  const handleClear = async () => {
    await clearThreatLog();
    setEntries([]);
    setConfirmClear(false);
  };

  return (
    <div>
      <div class="section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2>Threat Log</h2>
          {entries.length > 0 && (
            <button class="btn btn-danger" onClick={() => setConfirmClear(true)}>Clear Log</button>
          )}
        </div>

        {entries.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table class="threat-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>URL</th>
                  <th>Risk</th>
                  <th>Action</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr key={i}>
                    <td>{new Date(e.timestamp).toLocaleString()}</td>
                    <td title={e.url}>{truncateUrl(e.url)}</td>
                    <td><span class={`badge ${BADGE_CLASS[e.level as keyof typeof BADGE_CLASS] ?? 'badge-warning'}`}>{e.level}</span></td>
                    <td>{e.action}</td>
                    <td>{e.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div class="empty-state">No threats detected yet.</div>
        )}

        <p class="info-text" style={{ marginTop: '16px' }}>
          This log is stored locally and never transmitted.
        </p>
      </div>

      {confirmClear && (
        <div class="confirm-dialog" onClick={() => setConfirmClear(false)}>
          <div class="confirm-box" onClick={(e) => e.stopPropagation()}>
            <p>Clear the threat log? This cannot be undone.</p>
            <div class="confirm-actions">
              <button class="btn btn-outline" onClick={() => setConfirmClear(false)}>Cancel</button>
              <button class="btn btn-danger" onClick={handleClear}>Clear</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
