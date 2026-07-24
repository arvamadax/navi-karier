'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { apiFetch, type CompanyOverview } from '../../../../lib/api';
import { Stat, CardMessage } from '../../../../components/dashboard/ui';

export default function CompanyAnalyticsPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<CompanyOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = session?.user?.accessToken;
    if (!token) return;
    apiFetch<CompanyOverview>('/company/overview', { token })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Gagal memuat data'))
      .finally(() => setLoading(false));
  }, [session]);

  if (loading) return <CardMessage>Loading…</CardMessage>;
  if (error || !data) return <CardMessage>{error || 'Data tidak tersedia'}</CardMessage>;

  const maxGap = Math.max(...data.top_gaps.map((g) => g.avg_gap), 1);
  const maxRole = Math.max(...data.top_roles.map((r) => r.count), 1);
  const readyPct = data.total_analyses ? Math.round((data.job_ready / data.total_analyses) * 100) : 0;

  return (
    <div className="dash-page">
      <div className="dash-score-row">
        <Stat label="Kandidat" value={data.total_candidates} sub="dalam pool" />
        <Stat label="Job Ready" value={`${readyPct}%`} sub={`${data.job_ready} dari ${data.total_analyses}`} color="var(--green)" />
        <Stat label="Avg Match" value={`${data.avg_match_score}%`} sub="kesiapan rata-rata" color="var(--highlight)" />
        <Stat label="Skill Kritis" value={data.top_gaps.length} sub="gap teridentifikasi" color="var(--amber)" />
      </div>

      <div className="dash-card">
        <div className="dash-card-header"><h3>Agregat Skill Gap Talent Pool</h3></div>
        <p style={{ color: 'var(--ink-3)', fontSize: '0.78rem', marginBottom: 16 }}>
          Rata-rata gap (selisih skill dibutuhkan vs dimiliki) di seluruh kandidat. Makin panjang, makin kritis kebutuhan pelatihan.
        </p>
        {data.top_gaps.length ? (
          <div className="dash-skill-list">
            {data.top_gaps.map((g) => (
              <div key={g.skill} className="dash-skill-row">
                <span className="dash-skill-name">{g.skill}</span>
                <div className="dash-skill-bar-bg">
                  <div className="dash-skill-bar-fill" style={{ width: `${(g.avg_gap / maxGap) * 100}%`, background: 'var(--amber)' }} />
                </div>
                <span className="dash-skill-val" style={{ color: 'var(--amber)' }}>{g.avg_gap}</span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--ink-3)', fontSize: '0.82rem', padding: '24px 0', textAlign: 'center' }}>Belum ada data kandidat</p>
        )}
      </div>

      <div className="dash-card">
        <div className="dash-card-header"><h3>Distribusi Target Role</h3></div>
        {data.top_roles.length ? (
          <div className="dash-skill-list">
            {data.top_roles.map((r) => (
              <div key={r.role} className="dash-skill-row">
                <span className="dash-skill-name">{r.role}</span>
                <div className="dash-skill-bar-bg">
                  <div className="dash-skill-bar-fill" style={{ width: `${(r.count / maxRole) * 100}%`, background: 'var(--highlight)' }} />
                </div>
                <span className="dash-skill-val">{r.count}</span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--ink-3)', fontSize: '0.82rem', padding: '24px 0', textAlign: 'center' }}>Belum ada analisis</p>
        )}
      </div>
    </div>
  );
}
