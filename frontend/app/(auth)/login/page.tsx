'use client';

import Link from 'next/link';
import { useState } from 'react';
import { loginAction } from '../../lib/actions';

export default function LoginPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await loginAction(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="auth-card">
      <h1 className="auth-title">Masuk</h1>
      <p className="auth-sub">Masuk ke dashboard NaviKarier</p>

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
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" placeholder="nama@email.com" required style={{
            font: 'inherit', fontSize: '0.88rem', background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border-2)', padding: '10px 12px', color: 'var(--ink)', width: '100%',
          }} />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" placeholder="••••••••" required style={{
            font: 'inherit', fontSize: '0.88rem', background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border-2)', padding: '10px 12px', color: 'var(--ink)', width: '100%',
          }} />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="dash-action-btn dash-action-primary"
          style={{ width: '100%', textAlign: 'center', opacity: loading ? 0.6 : 1 }}
        >
          {loading ? 'Memproses...' : 'Masuk →'}
        </button>
      </form>

      <div style={{
        margin: '20px 0 12px', textAlign: 'center', fontSize: '0.72rem',
        color: 'var(--ink-3)', fontFamily: 'var(--mono)', letterSpacing: '0.06em',
      }}>
        DEMO ACCOUNTS
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--ink-2)', fontFamily: 'var(--mono)', lineHeight: 1.8 }}>
        <div>jobseeker@demo.com / demo123 <span style={{ color: 'var(--ink-3)' }}>(Job Seeker)</span></div>
        <div>company@demo.com / demo123 <span style={{ color: 'var(--ink-3)' }}>(Company)</span></div>
        <div>admin@demo.com / demo123 <span style={{ color: 'var(--ink-3)' }}>(Admin)</span></div>
      </div>

      <p style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--ink-2)', marginTop: 20 }}>
        Belum punya akun?{' '}
        <Link href="/register" style={{ color: 'var(--highlight)', fontWeight: 500 }}>Daftar</Link>
      </p>
    </div>
  );
}
