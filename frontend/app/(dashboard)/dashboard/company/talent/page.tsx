'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch, type TalentCandidate } from '../../../../lib/api';
import { CardMessage, scoreTag } from '../../../../components/dashboard/ui';

const TH = {
  textAlign: 'left' as const, padding: '10px 0', fontWeight: 600, color: 'var(--ink-2)',
  fontFamily: 'var(--mono)', fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase' as const,
};
const TD = { padding: '12px 0', fontSize: '0.82rem' };

export default function CompanyTalentPage() {
  const { data: session } = useSession();
  const [rows, setRows] = useState<TalentCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [role, setRole] = useState('ALL');

  useEffect(() => {
    const token = session?.user?.accessToken;
    if (!token) return;
    apiFetch<TalentCandidate[]>('/company/talent', { token })
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : 'Gagal memuat data'))
      .finally(() => setLoading(false));
  }, [session]);

  const roles = useMemo(() => ['ALL', ...Array.from(new Set(rows.map((r) => r.target_role)))], [rows]);

  if (loading) return <CardMessage>Loading…</CardMessage>;
  if (error) return <CardMessage>{error}</CardMessage>;

  const filtered = role === 'ALL' ? rows : rows.filter((r) => r.target_role === role);

  return (
    <div className="dash-page">
      <div className="dash-card">
        <div className="dash-card-header">
          <h3>Talent Pool <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>({filtered.length})</span></h3>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            style={{
              font: 'inherit', fontSize: '0.8rem', background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', color: 'var(--ink)',
            }}
          >
            {roles.map((r) => <option key={r} value={r}>{r === 'ALL' ? 'Semua Role' : r}</option>)}
          </select>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={TH}>Kandidat</th>
                <th style={TH}>Target Role</th>
                <th style={TH}>Level</th>
                <th style={{ ...TH, textAlign: 'right' }}>Gap Skills</th>
                <th style={{ ...TH, textAlign: 'right' }}>Match</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.analysis_id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ ...TD, fontWeight: 600 }}>{c.candidate}</td>
                  <td style={{ ...TD, color: 'var(--ink-2)' }}>{c.target_role}</td>
                  <td style={{ ...TD, fontFamily: 'var(--mono)', fontSize: '0.72rem', color: 'var(--ink-3)' }}>{c.level}</td>
                  <td style={{ ...TD, textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--ink-3)' }}>{c.missing_count}</td>
                  <td style={{ ...TD, textAlign: 'right' }}>
                    <span className={`dash-tag dash-tag-${scoreTag(c.match_score)}`}>{c.match_score}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p style={{ color: 'var(--ink-3)', fontSize: '0.82rem', padding: '24px 0', textAlign: 'center' }}>
              {rows.length === 0 ? 'Belum ada kandidat di talent pool' : 'Tidak ada kandidat untuk role ini'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
