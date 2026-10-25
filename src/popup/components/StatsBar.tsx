interface Props {
  blocked: number;
  redirects: number;
  fingerprints: number;
  phishing: number;
}

export function StatsBar({ blocked, redirects, fingerprints, phishing }: Props) {
  return (
    <div class="stats-bar">
      <div class="stats-bar-item">
        <span class="stats-bar-count">{blocked}</span>
        <span class="stats-bar-label">Blocked</span>
      </div>
      <div class="stats-bar-item">
        <span class="stats-bar-count">{redirects}</span>
        <span class="stats-bar-label">Redirects</span>
      </div>
      <div class="stats-bar-item">
        <span class="stats-bar-count">{fingerprints}</span>
        <span class="stats-bar-label">FP Protected</span>
      </div>
      <div class="stats-bar-item">
        <span class="stats-bar-count">{phishing}</span>
        <span class="stats-bar-label">Threats</span>
      </div>
    </div>
  );
}
