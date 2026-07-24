import type { ReactNode } from 'react';

export function Stat({ label, value, sub, color }: { label: string; value: ReactNode; sub?: string; color?: string }) {
  return (
    <div className="dash-score-card">
      <div className="dash-score-label">{label}</div>
      <div className="dash-score-value" style={color ? { color } : undefined}>{value}</div>
      {sub && <div className="dash-score-sub">{sub}</div>}
    </div>
  );
}

export function CardMessage({ children }: { children: ReactNode }) {
  return (
    <div className="dash-page">
      <div className="dash-card" style={{ textAlign: 'center', padding: '40px 24px', color: 'var(--ink-3)', fontSize: '0.85rem', fontFamily: 'var(--mono)' }}>
        {children}
      </div>
    </div>
  );
}

export function scoreTag(s: number): string {
  if (s >= 75) return 'green';
  if (s >= 55) return 'yellow';
  return 'red';
}
