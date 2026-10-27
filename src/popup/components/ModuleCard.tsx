import type { ComponentChildren } from 'preact';

interface StatEntry {
  label: string;
  count: number;
}

interface Props {
  title: string;
  icon: string;
  enabled: boolean;
  onToggle: () => void;
  stats: StatEntry[];
  children?: ComponentChildren;
}

export function ModuleCard({ title, icon, enabled, onToggle, stats, children }: Props) {
  return (
    <div class="module-card-wrapper">
      <div class="module-card">
        <div class="module-icon">{icon}</div>
        <div class="module-info">
          <div class="module-name">{title}</div>
          <div class="module-stats">
            {stats.map((s) => (
              <span class="stat-item" key={s.label}>
                <span class="stat-count">{s.count}</span>{s.label}
              </span>
            ))}
          </div>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" checked={enabled} onChange={onToggle} />
          <span class="toggle-slider" />
        </label>
      </div>
      {children}
    </div>
  );
}
