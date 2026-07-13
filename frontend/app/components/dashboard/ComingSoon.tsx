import { LucideIcon, Construction } from 'lucide-react';

type ComingSoonProps = {
  title: string;
  description: string;
  icon?: LucideIcon;
  plannedFeatures?: string[];
};

export default function ComingSoon({
  title,
  description,
  icon: Icon = Construction,
  plannedFeatures = [],
}: ComingSoonProps) {
  return (
    <div className="dash-page">
      <div className="dash-card">
        <div className="dash-card-header">
          <h3>{title}</h3>
          <span style={{ fontSize: '0.7rem', color: 'var(--ink-3)', fontFamily: 'var(--mono)' }}>
            COMING SOON
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '40px 20px' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18,
          }}>
            <Icon size={24} style={{ color: 'var(--ink-3)' }} />
          </div>
          <p style={{ color: 'var(--ink-2)', fontSize: '0.88rem', maxWidth: 420, lineHeight: 1.6 }}>
            {description}
          </p>

          {plannedFeatures.length > 0 && (
            <div style={{
              marginTop: 24, textAlign: 'left', width: '100%', maxWidth: 380,
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              {plannedFeatures.map((f) => (
                <div key={f} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  fontSize: '0.82rem', color: 'var(--ink-2)',
                  background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '10px 14px',
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--ink-3)', flexShrink: 0 }} />
                  {f}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
