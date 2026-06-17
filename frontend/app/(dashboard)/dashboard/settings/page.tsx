'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api';

type ProfileData = {
  id: number;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  bio: string | null;
  target_role: string | null;
  experience_level: string | null;
};

const inputStyle = {
  font: 'inherit', fontSize: '0.88rem', background: 'rgba(255,255,255,0.04)',
  border: '1px solid var(--border-2)', padding: '10px 12px', color: 'var(--ink)', width: '100%',
  borderRadius: 6,
};

export default function SettingsPage() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken;

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [expLevel, setExpLevel] = useState('');

  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwMsg, setPwMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    apiFetch<ProfileData>('/auth/me', { token })
      .then((data) => {
        setProfile(data);
        setName(data.name || '');
        setPhone(data.phone || '');
        setBio(data.bio || '');
        setTargetRole(data.target_role || '');
        setExpLevel(data.experience_level || '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSaveProfile() {
    if (!token) return;
    setSaving(true);
    setMsg(null);
    try {
      const updated = await apiFetch<ProfileData>('/auth/profile', {
        token,
        method: 'PUT',
        body: { name, phone, bio, target_role: targetRole, experience_level: expLevel },
      });
      setProfile(updated);
      setMsg({ text: 'Profil berhasil disimpan', ok: true });
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : 'Gagal menyimpan', ok: false });
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    if (!token) return;
    if (newPw !== confirmPw) {
      setPwMsg({ text: 'Password baru tidak cocok', ok: false });
      return;
    }
    if (newPw.length < 6) {
      setPwMsg({ text: 'Password minimal 6 karakter', ok: false });
      return;
    }
    setPwSaving(true);
    setPwMsg(null);
    try {
      await apiFetch('/auth/password', {
        token,
        method: 'PUT',
        body: { old_password: oldPw, new_password: newPw },
      });
      setPwMsg({ text: 'Password berhasil diubah', ok: true });
      setOldPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (err) {
      setPwMsg({ text: err instanceof Error ? err.message : 'Gagal mengubah password', ok: false });
    } finally {
      setPwSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="dash-page">
        <div className="dash-card" style={{ minHeight: 200 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ height: 14, borderRadius: 4, background: 'rgba(255,255,255,0.06)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-page">
      <div className="dash-card">
        <div className="dash-card-header">
          <h3>Profil</h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="field">
            <label htmlFor="s-name">Nama</label>
            <input id="s-name" type="text" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
          </div>
          <div className="field">
            <label htmlFor="s-email">Email</label>
            <input id="s-email" type="email" value={profile?.email ?? ''} disabled style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }} />
          </div>
          <div className="field">
            <label htmlFor="s-phone">Telepon</label>
            <input id="s-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08xxxxxxxxxx" style={inputStyle} />
          </div>
          <div className="field">
            <label htmlFor="s-bio">Bio</label>
            <textarea id="s-bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Ceritakan tentang dirimu..." rows={3}
              style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="field">
              <label htmlFor="s-role">Target Role</label>
              <input id="s-role" type="text" value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder="e.g. Software Engineer" style={inputStyle} />
            </div>
            <div className="field">
              <label htmlFor="s-level">Experience Level</label>
              <select id="s-level" value={expLevel} onChange={(e) => setExpLevel(e.target.value)} style={inputStyle}>
                <option value="">Pilih level</option>
                <option value="JUNIOR">Junior</option>
                <option value="MID">Mid</option>
                <option value="SENIOR">Senior</option>
              </select>
            </div>
          </div>

          {msg && (
            <div style={{ fontSize: '0.82rem', padding: '8px 12px', borderRadius: 6, background: msg.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: msg.ok ? 'var(--green)' : 'var(--red)' }}>
              {msg.text}
            </div>
          )}

          <button onClick={handleSaveProfile} disabled={saving} className="dash-action-btn dash-action-primary" style={{ alignSelf: 'flex-start' }}>
            {saving ? 'Menyimpan...' : 'Simpan Profil'}
          </button>
        </div>
      </div>

      <div className="dash-card">
        <div className="dash-card-header">
          <h3>Ubah Password</h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="field">
            <label htmlFor="s-oldpw">Password Lama</label>
            <input id="s-oldpw" type="password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="field">
              <label htmlFor="s-newpw">Password Baru</label>
              <input id="s-newpw" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} style={inputStyle} />
            </div>
            <div className="field">
              <label htmlFor="s-confirmpw">Konfirmasi</label>
              <input id="s-confirmpw" type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} style={inputStyle} />
            </div>
          </div>

          {pwMsg && (
            <div style={{ fontSize: '0.82rem', padding: '8px 12px', borderRadius: 6, background: pwMsg.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: pwMsg.ok ? 'var(--green)' : 'var(--red)' }}>
              {pwMsg.text}
            </div>
          )}

          <button onClick={handleChangePassword} disabled={pwSaving} className="dash-action-btn" style={{ alignSelf: 'flex-start' }}>
            {pwSaving ? 'Mengubah...' : 'Ubah Password'}
          </button>
        </div>
      </div>
    </div>
  );
}
