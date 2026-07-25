'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { apiFetch, type Invite } from '../../../../lib/api';
import { CardMessage } from '../../../../components/dashboard/ui';

const inputStyle = {
  font: 'inherit', fontSize: '0.85rem', background: 'rgba(255,255,255,0.04)',
  border: '1px solid var(--border-2)', padding: '9px 12px', color: 'var(--ink)', width: '100%', borderRadius: 6,
};

export default function CompanyInvitePage() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken;

  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [role, setRole] = useState('');
  const [level, setLevel] = useState('MID');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  function refresh() {
    if (!token) return;
    apiFetch<Invite[]>('/company/invites', { token })
      .then(setInvites)
      .catch((e) => setError(e instanceof Error ? e.message : 'Gagal memuat data'))
      .finally(() => setLoading(false));
  }

  useEffect(refresh, [token]);

  async function createInvite() {
    if (!token || !role.trim()) return;
    setSaving(true);
    try {
      await apiFetch('/company/invites', {
        token, method: 'POST',
        body: { target_role: role, level, candidate_email: email || null },
      });
      setRole(''); setEmail(''); setLevel('MID');
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal membuat undangan');
    } finally {
      setSaving(false);
    }
  }

  function copyLink(link: string, inviteToken: string) {
    navigator.clipboard?.writeText(link).then(() => {
      setCopied(inviteToken);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  if (loading) return <CardMessage>Loading…</CardMessage>;

  return (
    <div className="dash-page">
      <div className="dash-card">
        <div className="dash-card-header"><h3>Undang Kandidat</h3></div>
        <p style={{ color: 'var(--ink-3)', fontSize: '0.78rem', marginBottom: 12 }}>
          Buat link asesmen untuk sebuah posisi. Kandidat unggah CV lewat link, hasilnya masuk ke Talent Pool.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
            <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Posisi target, mis. Data Analyst" style={inputStyle} />
            <select value={level} onChange={(e) => setLevel(e.target.value)} style={inputStyle}>
              <option value="JUNIOR">Junior</option>
              <option value="MID">Mid</option>
              <option value="SENIOR">Senior</option>
            </select>
          </div>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email kandidat (opsional — kirim undangan via email)" style={inputStyle} />
          {error && <div style={{ fontSize: '0.8rem', color: 'var(--red)' }}>{error}</div>}
          <button onClick={createInvite} disabled={saving || !role.trim()} className="dash-action-btn dash-action-primary" style={{ alignSelf: 'flex-start' }}>
            {saving ? 'Membuat…' : '+ Buat Undangan'}
          </button>
        </div>
      </div>

      <div className="dash-card">
        <div className="dash-card-header">
          <h3>Undangan <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>({invites.length})</span></h3>
        </div>
        {invites.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {invites.map((inv) => (
              <div key={inv.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                    {inv.target_role} <span className="dash-tag dash-tag-yellow" style={{ marginLeft: 4 }}>{inv.level}</span>
                    <span className={`dash-tag dash-tag-${inv.status === 'COMPLETED' ? 'green' : 'red'}`} style={{ marginLeft: 6 }}>{inv.status === 'COMPLETED' ? 'SELESAI' : 'MENUNGGU'}</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--ink-3)', fontFamily: 'var(--mono)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 360 }}>
                    {inv.candidate_name ? `${inv.candidate_name} · ` : ''}{inv.link}
                  </div>
                </div>
                <button onClick={() => copyLink(inv.link, inv.token)} className="dash-action-btn" style={{ fontSize: '0.75rem', flexShrink: 0 }}>
                  {copied === inv.token ? 'Tersalin ✓' : 'Salin Link'}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--ink-3)', fontSize: '0.82rem', padding: '24px 0', textAlign: 'center' }}>
            Belum ada undangan. Buat undangan pertama untuk mulai mengumpulkan kandidat.
          </p>
        )}
      </div>
    </div>
  );
}
