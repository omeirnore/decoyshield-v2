/** Lightweight inline SVG icons — no emoji, no external deps. */

interface IconProps {
  size?: number;
  color?: string;
  class?: string;
}

const defaults = { size: 18, color: 'currentColor' };

function p(props: IconProps) {
  return { ...defaults, ...props };
}

export function ShieldIcon(props: IconProps) {
  const { size, color } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={props.class}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

export function FingerprintIcon(props: IconProps) {
  const { size, color } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={props.class}>
      <path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4" />
      <path d="M5 19.5C5.5 18 6 15 6 12c0-3.5 2.5-6 6-6 2 0 3.7 1 4.8 2.5" />
      <path d="M10 12c0 4-1 8-3.5 10.5" />
      <path d="M14 12c0 2.5-.5 5-1.5 7" />
      <path d="M18 12c0 1-.5 3-1 4.5" />
      <path d="M22 12a10 10 0 0 0-2-6" />
    </svg>
  );
}

export function BanIcon(props: IconProps) {
  const { size, color } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={props.class}>
      <circle cx="12" cy="12" r="10" />
      <path d="m4.9 4.9 14.2 14.2" />
    </svg>
  );
}

export function EyeOffIcon(props: IconProps) {
  const { size, color } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={props.class}>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="m1 1 22 22" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
    </svg>
  );
}

export function AlertTriangleIcon(props: IconProps) {
  const { size, color } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={props.class}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

export function CornerDownLeftIcon(props: IconProps) {
  const { size, color } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={props.class}>
      <polyline points="9 10 4 15 9 20" />
      <path d="M20 4v7a4 4 0 0 1-4 4H4" />
    </svg>
  );
}

export function CookieIcon(props: IconProps) {
  const { size, color } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={props.class}>
      <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" />
      <circle cx="8.5" cy="8.5" r=".5" fill={color} />
      <circle cx="10.5" cy="15.5" r=".5" fill={color} />
      <circle cx="15.5" cy="12.5" r=".5" fill={color} />
      <circle cx="7.5" cy="12.5" r=".5" fill={color} />
      <circle cx="12.5" cy="9.5" r=".5" fill={color} />
    </svg>
  );
}

/* ── Fingerprint sub-type icons ── */

export function CanvasIcon(props: IconProps) {
  const { size, color } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={props.class}>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <path d="m9 15 3-8 3 8" />
      <path d="M10 13h4" />
    </svg>
  );
}

export function GpuIcon(props: IconProps) {
  const { size, color } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={props.class}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="8" y="8" width="8" height="8" rx="1" />
      <path d="M8 2v2" /><path d="M12 2v2" /><path d="M16 2v2" />
      <path d="M8 20v2" /><path d="M12 20v2" /><path d="M16 20v2" />
      <path d="M2 8h2" /><path d="M2 12h2" /><path d="M2 16h2" />
      <path d="M20 8h2" /><path d="M20 12h2" /><path d="M20 16h2" />
    </svg>
  );
}

export function CompassIcon(props: IconProps) {
  const { size, color } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={props.class}>
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

export function MonitorIcon(props: IconProps) {
  const { size, color } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={props.class}>
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
    </svg>
  );
}

export function AudioIcon(props: IconProps) {
  const { size, color } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={props.class}>
      <path d="M2 10v4" /><path d="M6 6v12" /><path d="M10 3v18" />
      <path d="M14 6v12" /><path d="M18 10v4" /><path d="M22 8v8" />
    </svg>
  );
}

export function BoxSelectIcon(props: IconProps) {
  const { size, color } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={props.class}>
      <path d="M5 3a2 2 0 0 0-2 2" /><path d="M19 3a2 2 0 0 1 2 2" />
      <path d="M21 19a2 2 0 0 1-2 2" /><path d="M5 21a2 2 0 0 1-2-2" />
      <path d="M9 3h6" /><path d="M9 21h6" />
      <path d="M3 9v6" /><path d="M21 9v6" />
    </svg>
  );
}

export function BarChartIcon(props: IconProps) {
  const { size, color } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={props.class}>
      <path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" />
    </svg>
  );
}

export function CheckCircleIcon(props: IconProps) {
  const { size, color } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={props.class}>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function TrendingUpIcon(props: IconProps) {
  const { size, color } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={props.class}>
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}

export function InfoIcon(props: IconProps) {
  const { size, color } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={props.class}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

export function LightbulbIcon(props: IconProps) {
  const { size, color } = p(props);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={props.class}>
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
      <path d="M9 18h6" /><path d="M10 22h4" />
    </svg>
  );
}
