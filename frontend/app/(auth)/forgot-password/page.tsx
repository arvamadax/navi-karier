'use client';

import Link from 'next/link';
import { useState } from 'react';
import { apiFetch } from '../../lib/api';

export default function ForgotPasswordPage() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;

    try {
      await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setSuccess(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="auth-card">
        <h1 className="auth-title">Cek Email Kamu</h1>
        <p className="auth-sub" style={{ lineHeight: 1.6 }}>
          Jika email terdaftar, kami sudah mengirim link untuk reset password.
          Cek inbox (dan folder spam) kamu.
        </p>
        <Link
          href="/login"
          className="dash-action-btn dash-action-primary"
          style={{ display: 'block', textAlign: 'center', marginTop: 24 }}
        >
          Kembali ke Login
        </Link>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <h1 className="auth-title">Lupa Password</h1>
      <p className="auth-sub">Masukkan email kamu untuk reset password</p>

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
        <button
          type="submit"
          disabled={loading}
          className="dash-action-btn dash-action-primary"
          style={{ width: '100%', textAlign: 'center', opacity: loading ? 0.6 : 1 }}
        >
          {loading ? 'Mengirim...' : 'Kirim Link Reset'}
        </button>
      </form>

      <p style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--ink-2)', marginTop: 20 }}>
        Ingat password?{' '}
        <Link href="/login" style={{ color: 'var(--highlight)', fontWeight: 500 }}>Masuk</Link>
      </p>
    </div>
  );
}
