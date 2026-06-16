'use client';

import Link from 'next/link';
import { useState } from 'react';
import { registerAction } from '../../lib/actions';

export default function RegisterPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await registerAction(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="auth-card">
      <h1 className="auth-title">Daftar</h1>
      <p className="auth-sub">Buat akun NaviKarier gratis</p>

      {error && (
        <div style={{
          background: 'rgba(225,29,72,0.1)', border: '1px solid rgba(225,29,72,0.3)',
          borderRadius: 8, padding: '10px 14px', fontSize: '0.82rem', color: '#f87171', marginBottom: 8,
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="field">
          <label htmlFor="name">Nama lengkap</label>
          <input id="name" name="name" type="text" placeholder="Nama kamu" required style={{
            font: 'inherit', fontSize: '0.88rem', background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border-2)', padding: '10px 12px', color: 'var(--ink)', width: '100%',
          }} />
        </div>
        <div className="field">
          <label htmlFor="reg-email">Email</label>
          <input id="reg-email" name="email" type="email" placeholder="nama@email.com" required style={{
            font: 'inherit', fontSize: '0.88rem', background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border-2)', padding: '10px 12px', color: 'var(--ink)', width: '100%',
          }} />
        </div>
        <div className="field">
          <label htmlFor="reg-password">Password</label>
          <input id="reg-password" name="password" type="password" placeholder="Min. 8 karakter" required style={{
            font: 'inherit', fontSize: '0.88rem', background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border-2)', padding: '10px 12px', color: 'var(--ink)', width: '100%',
          }} />
        </div>
        <div className="field">
          <label htmlFor="role">Saya adalah</label>
          <select id="role" name="role" style={{
            font: 'inherit', fontSize: '0.88rem', background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border-2)', padding: '10px 12px', color: 'var(--ink)', width: '100%',
          }}>
            <option value="JOBSEEKER">Job Seeker</option>
            <option value="COMPANY">Perusahaan / HR</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="dash-action-btn dash-action-primary"
          style={{ width: '100%', textAlign: 'center', opacity: loading ? 0.6 : 1 }}
        >
          {loading ? 'Memproses...' : 'Daftar →'}
        </button>
      </form>

      <p style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--ink-2)', marginTop: 20 }}>
        Sudah punya akun?{' '}
        <Link href="/login" style={{ color: 'var(--highlight)', fontWeight: 500 }}>Masuk</Link>
      </p>
    </div>
  );
}
