import { useState } from 'preact/hooks';

interface Props {
  enabled: boolean;
  onToggle: () => void;
  deletedCount: number;
}

export function CookieCard({ enabled, onToggle, deletedCount }: Props) {
  const [cleaning, setCleaning] = useState(false);
  const [lastResult, setLastResult] = useState<number | null>(null);

  const handleClean = () => {
    setCleaning(true);
    setLastResult(null);
    chrome.runtime.sendMessage({ type: 'DEEP_CLEAN_COOKIES' }, (resp: { deleted: number } | undefined) => {
      setCleaning(false);
      if (resp) setLastResult(resp.deleted);
      // Clear the result after 3 seconds
      setTimeout(() => setLastResult(null), 3000);
    });
  };

  return (
    <div class="module-card cookie-card">
      <div class="module-icon">&#x1F36A;</div>
      <div class="module-info">
        <div class="module-name">Cookie Manager</div>
        <div class="module-stats">
          <span class="stat-item">
            <span class="stat-count">{deletedCount}</span>deleted
          </span>
          {lastResult !== null && (
            <span class="stat-item cookie-result">
              {lastResult > 0 ? `${lastResult} cleaned!` : 'All clean!'}
            </span>
          )}
        </div>
        <button
          class={`cookie-clean-btn ${cleaning ? 'cleaning' : ''}`}
          onClick={handleClean}
          disabled={cleaning || !enabled}
          title="Delete tracking & third-party cookies"
        >
          {cleaning ? 'Cleaning...' : 'Clean Now'}
        </button>
      </div>
      <label class="toggle-switch">
        <input type="checkbox" checked={enabled} onChange={onToggle} />
        <span class="toggle-slider" />
      </label>
    </div>
  );
}
