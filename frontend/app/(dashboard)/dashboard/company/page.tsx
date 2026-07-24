'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { apiFetch, type CompanyOverview } from '../../../lib/api';
import { Stat, CardMessage } from '../../../components/dashboard/ui';

export default function CompanyOverviewPage() {
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

  const maxRole = Math.max(...data.top_roles.map((r) => r.count), 1);

  return (
    <div className="dash-page">
      <div className="dash-score-row">
        <Stat label="Total Kandidat" value={data.total_candidates} sub="di talent pool" color="var(--highlight)" />
        <Stat label="Avg Match Score" value={`${data.avg_match_score}%`} sub="rata-rata kesiapan" />
        <Stat label="Job Ready" value={data.job_ready} sub="skor ≥ 75%" color="var(--green)" />
        <Stat label="Total Analisis" value={data.total_analyses} sub="CV teranalisis" />
      </div>

      <div className="dash-grid-2">
        <div className="dash-card">
          <div className="dash-card-header">
            <h3>Skill Gap Terbesar di Talent Pool</h3>
            <Link href="/dashboard/company/analytics" className="dash-see-all">Analytics →</Link>
          </div>
          {data.top_gaps.length ? (
            <div className="dash-skill-list">
              {data.top_gaps.map((g) => (
                <div key={g.skill} className="dash-skill-row">
                  <span className="dash-skill-name">{g.skill}</span>
                  <div className="dash-skill-bar-bg">
                    <div className="dash-skill-bar-fill" style={{ width: `${Math.min(g.avg_gap * 2, 100)}%`, background: 'var(--amber)' }} />
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
          <div className="dash-card-header">
            <h3>Role Paling Dicari</h3>
            <Link href="/dashboard/company/talent" className="dash-see-all">Talent →</Link>
          </div>
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

      <div className="dash-card">
        <div className="dash-card-header"><h3>Quick Actions</h3></div>
        <div className="dash-actions-row">
          <Link href="/dashboard/company/talent" className="dash-action-btn dash-action-primary">Lihat Talent Pool</Link>
          <Link href="/dashboard/company/analytics" className="dash-action-btn">Gap Analytics</Link>
        </div>
      </div>
    </div>
  );
}
