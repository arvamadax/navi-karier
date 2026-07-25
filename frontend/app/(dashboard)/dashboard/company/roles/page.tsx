'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { apiFetch, type JobRole } from '../../../../lib/api';
import { CardMessage } from '../../../../components/dashboard/ui';

const inputStyle = {
  font: 'inherit', fontSize: '0.85rem', background: 'rgba(255,255,255,0.04)',
  border: '1px solid var(--border-2)', padding: '9px 12px', color: 'var(--ink)', width: '100%', borderRadius: 6,
};

export default function CompanyRolesPage() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken;

  const [roles, setRoles] = useState<JobRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [level, setLevel] = useState('MID');
  const [skills, setSkills] = useState('');
  const [saving, setSaving] = useState(false);

  function refresh() {
    if (!token) return;
    apiFetch<JobRole[]>('/company/roles', { token })
      .then(setRoles)
      .catch((e) => setError(e instanceof Error ? e.message : 'Gagal memuat data'))
      .finally(() => setLoading(false));
  }

  useEffect(refresh, [token]);

  async function addRole() {
    if (!token || !title.trim()) return;
    setSaving(true);
    try {
      await apiFetch('/company/roles', {
        token, method: 'POST',
        body: { title, level, required_skills: skills },
      });
      setTitle(''); setSkills(''); setLevel('MID');
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  }

  async function removeRole(id: number) {
    if (!token) return;
    await apiFetch(`/company/roles/${id}`, { token, method: 'DELETE' }).catch(() => {});
    refresh();
  }

  if (loading) return <CardMessage>Loading…</CardMessage>;

  return (
    <div className="dash-page">
      <div className="dash-card">
        <div className="dash-card-header"><h3>Tambah Posisi</h3></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul posisi, mis. Backend Engineer" style={inputStyle} />
            <select value={level} onChange={(e) => setLevel(e.target.value)} style={inputStyle}>
              <option value="JUNIOR">Junior</option>
              <option value="MID">Mid</option>
              <option value="SENIOR">Senior</option>
            </select>
          </div>
          <input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Skill wajib, pisahkan koma: SQL, Python, Docker" style={inputStyle} />
          {error && <div style={{ fontSize: '0.8rem', color: 'var(--red)' }}>{error}</div>}
          <button onClick={addRole} disabled={saving || !title.trim()} className="dash-action-btn dash-action-primary" style={{ alignSelf: 'flex-start' }}>
            {saving ? 'Menyimpan…' : '+ Tambah Posisi'}
          </button>
        </div>
      </div>

      <div className="dash-card">
        <div className="dash-card-header">
          <h3>Posisi Terdaftar <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>({roles.length})</span></h3>
        </div>
        {roles.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {roles.map((r) => (
              <div key={r.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                      {r.title} <span className="dash-tag dash-tag-yellow" style={{ marginLeft: 6 }}>{r.level}</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      {r.required_skills.length ? r.required_skills.map((s) => (
                        <span key={s} style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 5, padding: '3px 8px', color: 'var(--ink-2)' }}>{s}</span>
                      )) : <span style={{ fontSize: '0.75rem', color: 'var(--ink-3)' }}>Belum ada skill</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: '1.3rem', fontWeight: 700, color: 'var(--highlight)' }}>{r.match_count}</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--ink-3)' }}>kandidat cocok</div>
                    <button onClick={() => removeRole(r.id)} style={{ marginTop: 8, fontSize: '0.72rem', color: 'var(--ink-3)', background: 'none', border: 'none', cursor: 'pointer' }}>Hapus</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--ink-3)', fontSize: '0.82rem', padding: '24px 0', textAlign: 'center' }}>
            Belum ada posisi. Tambahkan requirement kompetensi untuk mulai mencocokkan talent.
          </p>
        )}
      </div>
    </div>
  );
}
