'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { apiFetch, type AnalysisHistoryItem } from '../../../lib/api';

export default function ProgressPage() {
  const { data: session } = useSession();
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = session?.user?.accessToken;
    if (!token) return;

    apiFetch<AnalysisHistoryItem[]>('/dashboard/history', { token })
      .then(setHistory)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session]);

  function scoreTag(s: number) {
    if (s >= 75) return 'green';
    if (s >= 55) return 'yellow';
    return 'red';
  }

  if (loading) {
    return (
      <div className="dash-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
        <p style={{ color: 'var(--ink-3)', fontFamily: 'var(--mono)', fontSize: '0.82rem' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div className="dash-page">
      <div className="dash-card">
        <div className="dash-card-header">
          <h3>Score Trend</h3>
        </div>
        {history.length >= 2 ? (
          <div style={{ padding: '16px 0' }}>
            <svg viewBox="0 0 500 150" style={{ width: '100%', height: 150 }}>
              {(() => {
                const sorted = [...history].reverse();
                const maxScore = 100;
                const points = sorted.map((h, i) => ({
                  x: 40 + (i / Math.max(sorted.length - 1, 1)) * 420,
                  y: 140 - (h.match_score / maxScore) * 120,
                }));
                const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                return (
                  <>
                    <line x1="40" y1="20" x2="40" y2="140" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                    <line x1="40" y1="140" x2="460" y2="140" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                    <path d={path} fill="none" stroke="var(--highlight)" strokeWidth="2" />
                    {points.map((p, i) => (
                      <circle key={i} cx={p.x} cy={p.y} r="4" fill="var(--highlight)" />
                    ))}
                    {points.map((p, i) => (
                      <text key={`t${i}`} x={p.x} y={p.y - 10} textAnchor="middle" fill="var(--ink-2)" fontSize="10">
                        {sorted[i].match_score}%
                      </text>
                    ))}
                  </>
                );
              })()}
            </svg>
          </div>
        ) : (
          <div style={{
            height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--ink-3)', fontSize: '0.82rem', fontFamily: 'var(--mono)',
            border: '1px dashed var(--border)', borderRadius: 8,
          }}>
            {history.length === 0 ? 'Belum ada data analisis' : 'Minimal 2 analisis untuk melihat trend'}
          </div>
        )}
      </div>

      <div className="dash-card">
        <div className="dash-card-header">
          <h3>Analysis History</h3>
        </div>
        {history.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Date', 'Target Role', 'Level', 'Score'].map((h) => (
                    <th key={h} style={{
                      textAlign: h === 'Score' ? 'right' : 'left', padding: '10px 0',
                      fontWeight: 600, color: 'var(--ink-2)', fontFamily: 'var(--mono)',
                      fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase' as const,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 0', fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--ink-3)' }}>
                      {h.created_at ? new Date(h.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td style={{ padding: '12px 0' }}>{h.target_role}</td>
                    <td style={{ padding: '12px 0', fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--ink-3)' }}>{h.level}</td>
                    <td style={{ padding: '12px 0', textAlign: 'right' }}>
                      <span className={`dash-tag dash-tag-${scoreTag(h.match_score)}`}>{h.match_score}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: 'var(--ink-3)', fontSize: '0.82rem', padding: '24px 0', textAlign: 'center' }}>
            Belum ada riwayat analisis. Upload CV dan jalankan analisis pertamamu.
          </p>
        )}
      </div>
    </div>
  );
}
