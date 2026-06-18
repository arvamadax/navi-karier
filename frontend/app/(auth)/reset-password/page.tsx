'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';
import { apiFetch } from '../../lib/api';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="auth-card">
        <h1 className="auth-title">Link Tidak Valid</h1>
        <p className="auth-sub">Link reset password tidak valid atau sudah kedaluwarsa.</p>
        <Link
          href="/forgot-password"
          className="dash-action-btn dash-action-primary"
          style={{ display: 'block', textAlign: 'center', marginTop: 24 }}
        >
          Minta Link Baru
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    const formData = new FormData(e.currentTarget);
    const newPassword = formData.get('password') as string;
    const confirmPassword = formData.get('confirm-password') as string;

    if (newPassword.length < 8) {
      setError('Password minimal 8 karakter');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Password tidak cocok');
      return;
    }

    setLoading(true);
    try {
      await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, new_password: newPassword }),
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
        <h1 className="auth-title">Password Berhasil Direset</h1>
        <p className="auth-sub">Kamu sekarang bisa login dengan password baru.</p>
        <Link
          href="/login"
          className="dash-action-btn dash-action-primary"
          style={{ display: 'block', textAlign: 'center', marginTop: 24 }}
        >
          Masuk
        </Link>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <h1 className="auth-title">Reset Password</h1>
      <p className="auth-sub">Masukkan password baru kamu</p>

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
          <label htmlFor="password">Password Baru</label>
          <input id="password" name="password" type="password" placeholder="Min. 8 karakter" required style={{
            font: 'inherit', fontSize: '0.88rem', background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border-2)', padding: '10px 12px', color: 'var(--ink)', width: '100%',
          }} />
        </div>
        <div className="field">
          <label htmlFor="confirm-password">Konfirmasi Password</label>
          <input id="confirm-password" name="confirm-password" type="password" placeholder="Ketik ulang password" required style={{
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
          {loading ? 'Menyimpan...' : 'Reset Password'}
        </button>
      </form>

      <p style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--ink-2)', marginTop: 20 }}>
        <Link href="/login" style={{ color: 'var(--highlight)', fontWeight: 500 }}>Kembali ke Login</Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
