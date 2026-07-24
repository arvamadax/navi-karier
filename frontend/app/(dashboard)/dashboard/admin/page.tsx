'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { apiFetch, type AdminOverview } from '../../../lib/api';
import { Stat, CardMessage } from '../../../components/dashboard/ui';

const ROLE_TAG: Record<string, string> = { JOBSEEKER: 'green', COMPANY: 'yellow', ADMIN: 'red' };

export default function AdminOverviewPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = session?.user?.accessToken;
    if (!token) return;
    apiFetch<AdminOverview>('/admin/overview', { token })
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
        <Stat label="Total Users" value={data.total_users} sub={`${data.total_jobseekers} job seeker`} />
        <Stat label="Companies" value={data.total_companies} sub="akun perusahaan" color="var(--amber)" />
        <Stat label="Total Analyses" value={data.total_analyses} sub={`${data.total_cvs} CV diunggah`} />
        <Stat label="Avg Match Score" value={`${data.avg_match_score}%`} sub="seluruh platform" color="var(--highlight)" />
      </div>

      <div className="dash-grid-2">
        <div className="dash-card">
          <div className="dash-card-header"><h3>Role Paling Diminati</h3></div>
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

        <div className="dash-card">
          <div className="dash-card-header">
            <h3>User Terbaru</h3>
            <Link href="/dashboard/admin/users" className="dash-see-all">Kelola →</Link>
          </div>
          {data.recent_users.length ? data.recent_users.map((u) => (
            <div key={u.id} className="dash-analysis-row">
              <div>
                <div className="dash-analysis-role">{u.name}</div>
                <div className="dash-analysis-date">{u.email}</div>
              </div>
              <span className={`dash-tag dash-tag-${ROLE_TAG[u.role] ?? 'yellow'}`}>{u.role}</span>
            </div>
          )) : (
            <p style={{ color: 'var(--ink-3)', fontSize: '0.82rem', padding: '24px 0', textAlign: 'center' }}>Belum ada user</p>
          )}
        </div>
      </div>
    </div>
  );
}
