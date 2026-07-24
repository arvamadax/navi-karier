'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { apiFetch, type AdminUser } from '../../../../lib/api';
import { CardMessage } from '../../../../components/dashboard/ui';

const ROLE_TAG: Record<string, string> = { JOBSEEKER: 'green', COMPANY: 'yellow', ADMIN: 'red' };
const TH = {
  textAlign: 'left' as const, padding: '10px 0', fontWeight: 600, color: 'var(--ink-2)',
  fontFamily: 'var(--mono)', fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase' as const,
};
const TD = { padding: '12px 0', fontSize: '0.82rem' };

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    const token = session?.user?.accessToken;
    if (!token) return;
    apiFetch<AdminUser[]>('/admin/users', { token })
      .then(setUsers)
      .catch((e) => setError(e instanceof Error ? e.message : 'Gagal memuat data'))
      .finally(() => setLoading(false));
  }, [session]);

  if (loading) return <CardMessage>Loading…</CardMessage>;
  if (error) return <CardMessage>{error}</CardMessage>;

  const filtered = users.filter(
    (u) => u.name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="dash-page">
      <div className="dash-card">
        <div className="dash-card-header">
          <h3>User Management</h3>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama / email…"
            style={{
              font: 'inherit', fontSize: '0.8rem', background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', color: 'var(--ink)', width: 200,
            }}
          />
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={TH}>Nama</th>
                <th style={TH}>Email</th>
                <th style={TH}>Role</th>
                <th style={{ ...TH, textAlign: 'right' }}>Analyses</th>
                <th style={{ ...TH, textAlign: 'right' }}>Bergabung</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ ...TD, fontWeight: 600 }}>{u.name}</td>
                  <td style={{ ...TD, color: 'var(--ink-2)' }}>{u.email}</td>
                  <td style={TD}>
                    <span className={`dash-tag dash-tag-${ROLE_TAG[u.role] ?? 'yellow'}`}>{u.role}</span>
                  </td>
                  <td style={{ ...TD, textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--ink-3)' }}>{u.analyses_count}</td>
                  <td style={{ ...TD, textAlign: 'right', fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--ink-3)' }}>
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p style={{ color: 'var(--ink-3)', fontSize: '0.82rem', padding: '24px 0', textAlign: 'center' }}>
              {users.length === 0 ? 'Belum ada user terdaftar' : 'Tidak ada user yang cocok'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
