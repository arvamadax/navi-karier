import Link from 'next/link';

type RoadmapStep = {
  title: string;
  platform: string;
  duration: string;
  status: 'done' | 'current' | 'pending';
  progress?: number;
};

const steps: RoadmapStep[] = [
  { title: 'Advanced TypeScript Patterns', platform: 'Dicoding', duration: '12 jam', status: 'done' },
  { title: 'Docker for Frontend Developers', platform: 'Udemy', duration: '8 jam', status: 'current', progress: 40 },
  { title: 'Kubernetes Fundamentals', platform: 'LPPI', duration: '16 jam', status: 'pending' },
  { title: 'GraphQL API Design', platform: 'Dicoding', duration: '10 jam', status: 'pending' },
  { title: 'CI/CD Pipeline Mastery', platform: 'Coursera', duration: '14 jam', status: 'pending' },
];

const statusLabel: Record<string, string> = {
  done: 'Selesai',
  current: 'Sedang belajar',
  pending: 'Belum mulai',
};

export default function RoadmapPage() {
  return (
    <div className="dash-page">
      <div className="dash-card">
        <div className="dash-card-header">
          <h3>Training Roadmap — Senior Frontend Dev</h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {steps.map((step, i) => (
            <div key={step.title} style={{ display: 'flex', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20 }}>
                <div style={{
                  width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
                  background: step.status === 'done' ? 'var(--green)' : step.status === 'current' ? 'var(--highlight)' : 'var(--ink-3)',
                  boxShadow: step.status === 'current' ? '0 0 0 4px rgba(225,29,72,0.25)' : 'none',
                }} />
                {i < steps.length - 1 && (
                  <div style={{ width: 2, flex: 1, background: 'var(--border)', minHeight: 40 }} />
                )}
              </div>
              <div style={{ paddingBottom: 24, flex: 1 }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{step.title}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--ink-3)', fontFamily: 'var(--mono)', marginTop: 4 }}>
                  {statusLabel[step.status]} · {step.platform} · {step.duration}
                  {step.progress !== undefined && ` · ${step.progress}% done`}
                </div>
                <Link
                  href="#"
                  style={{
                    display: 'inline-block', marginTop: 8, fontSize: '0.75rem',
                    color: 'var(--highlight)', fontWeight: 500,
                  }}
                >
                  Buka Course →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="dash-card">
        <div className="dash-card-header">
          <h3>Priority Impact</h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { skill: 'Docker', impact: 92, level: 'HIGH' as const },
            { skill: 'Kubernetes', impact: 85, level: 'HIGH' as const },
            { skill: 'GraphQL', impact: 65, level: 'MED' as const },
            { skill: 'CI/CD', impact: 50, level: 'MED' as const },
            { skill: 'Sys Design', impact: 35, level: 'LOW' as const },
          ].map((item) => (
            <div key={item.skill} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '0.78rem', width: 80, color: 'var(--ink-2)' }}>{item.skill}</span>
              <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  width: `${item.impact}%`, height: '100%', borderRadius: 3,
                  background: item.level === 'HIGH' ? 'var(--highlight)' : item.level === 'MED' ? 'var(--amber)' : 'var(--green)',
                }} />
              </div>
              <span style={{
                fontSize: '0.68rem', fontWeight: 600, fontFamily: 'var(--mono)', width: 36,
                color: item.level === 'HIGH' ? 'var(--highlight)' : item.level === 'MED' ? 'var(--amber)' : 'var(--green)',
              }}>
                {item.level}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
