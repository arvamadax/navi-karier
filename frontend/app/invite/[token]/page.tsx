'use client';

import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

type InvitePublic = { target_role: string; level: string; company_name: string; status: string };
type Result = { match_score: number; target_role: string; missing_count: number };

const inputStyle = {
  font: 'inherit', fontSize: '0.9rem', background: 'rgba(255,255,255,0.04)',
  border: '1px solid var(--border-2)', padding: '11px 14px', color: 'var(--ink)', width: '100%', borderRadius: 8,
};

export default function InvitePage({ params }: { params: { token: string } }) {
  const { token } = params;

  const [invite, setInvite] = useState<InvitePublic | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/invite/${token}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Undangan tidak ditemukan atau sudah kedaluwarsa'))))
      .then(setInvite)
      .catch((e) => setLoadError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function submit() {
    if (!file || !name.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('name', name);
      fd.append('file', file);
      const res = await fetch(`${API_BASE}/api/invite/${token}/submit`, { method: 'POST', body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || 'Gagal mengirim');
      }
      setResult(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal mengirim');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 440, border: '1px solid var(--border)', borderRadius: 14, padding: 32, background: 'rgba(255,255,255,0.02)' }}>
        {loading ? (
          <p style={{ color: 'var(--ink-3)', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: '0.85rem' }}>Memuat…</p>
        ) : loadError ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>⚠️</div>
            <p style={{ color: 'var(--ink-2)', fontSize: '0.9rem' }}>{loadError}</p>
          </div>
        ) : result ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.4rem', marginBottom: 8 }}>✅</div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 8 }}>Asesmen Terkirim</h2>
            <p style={{ color: 'var(--ink-2)', fontSize: '0.88rem', marginBottom: 20 }}>
              Terima kasih! Berikut hasil kecocokanmu untuk <strong>{result.target_role}</strong>.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--highlight)', fontFamily: 'var(--mono)' }}>{result.match_score}%</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--ink-3)' }}>Match Score</div>
              </div>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--amber)', fontFamily: 'var(--mono)' }}>{result.missing_count}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--ink-3)' }}>Skill Gap</div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: '0.72rem', color: 'var(--ink-3)', fontFamily: 'var(--mono)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
              Undangan Asesmen · {invite?.company_name}
            </div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 6 }}>
              {invite?.target_role} <span style={{ color: 'var(--ink-3)', fontWeight: 400, fontSize: '0.9rem' }}>· {invite?.level}</span>
            </h1>
            <p style={{ color: 'var(--ink-2)', fontSize: '0.86rem', lineHeight: 1.6, marginBottom: 24 }}>
              Unggah CV-mu (PDF) untuk melihat seberapa cocok skill-mu dengan posisi ini. Instan, tanpa perlu daftar akun.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama lengkap" style={inputStyle} />
              <label style={{ ...inputStyle, cursor: 'pointer', color: file ? 'var(--ink)' : 'var(--ink-3)', display: 'block' }}>
                {file ? file.name : 'Pilih file CV (PDF)…'}
                <input type="file" accept=".pdf" style={{ display: 'none' }}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) { setFile(f); setError(''); } }} />
              </label>
              {error && <div style={{ fontSize: '0.82rem', color: 'var(--red)' }}>{error}</div>}
              <button onClick={submit} disabled={submitting || !file || !name.trim()} className="dash-action-btn dash-action-primary"
                style={{ width: '100%', textAlign: 'center', opacity: submitting || !file || !name.trim() ? 0.6 : 1 }}>
                {submitting ? 'Menganalisis…' : 'Kirim & Analisis'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
