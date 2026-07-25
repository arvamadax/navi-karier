'use client';

import Link from 'next/link';
import { useState } from 'react';
import { loginAction, googleLoginAction } from '../../lib/actions';

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
    } else {
      // Full reload so SessionProvider picks up the new session immediately.
      window.location.href = '/dashboard';
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
        <div style={{ textAlign: 'right', marginTop: -6 }}>
          <Link href="/forgot-password" style={{
            fontSize: '0.78rem', color: 'var(--ink-3)', textDecoration: 'none',
          }}>
            Lupa password?
          </Link>
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

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <span style={{ fontSize: '0.72rem', color: 'var(--ink-3)' }}>atau</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>

      <form action={googleLoginAction}>
        <button type="submit" className="dash-action-btn" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Lanjut dengan Google
        </button>
      </form>

      {process.env.NODE_ENV === 'development' && (
        <>
          <div style={{
            margin: '20px 0 12px', textAlign: 'center', fontSize: '0.72rem',
            color: 'var(--ink-3)', fontFamily: 'var(--mono)', letterSpacing: '0.06em',
          }}>
            DEMO ACCOUNTS
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--ink-2)', fontFamily: 'var(--mono)', lineHeight: 1.8 }}>
            <div>budi@email.com / demo123 <span style={{ color: 'var(--ink-3)' }}>(Job Seeker)</span></div>
            <div>hr@techcorp.id / company123 <span style={{ color: 'var(--ink-3)' }}>(Company)</span></div>
            <div>admin@navikarier.id / admin123 <span style={{ color: 'var(--ink-3)' }}>(Admin)</span></div>
          </div>
        </>
      )}

      <p style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--ink-2)', marginTop: 20 }}>
        Belum punya akun?{' '}
        <Link href="/register" style={{ color: 'var(--highlight)', fontWeight: 500 }}>Daftar</Link>
      </p>
    </div>
  );
}
