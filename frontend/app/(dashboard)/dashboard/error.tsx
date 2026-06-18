'use client';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="dash-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16 }}>
      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        background: 'rgba(239,68,68,0.1)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem',
      }}>
        !
      </div>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Terjadi Kesalahan</h2>
      <p style={{ color: 'var(--ink-2)', fontSize: '0.85rem', textAlign: 'center', maxWidth: 400 }}>
        {error.message || 'Halaman gagal dimuat. Coba refresh atau kembali ke dashboard.'}
      </p>
      <button
        onClick={reset}
        className="dash-action-btn dash-action-primary"
      >
        Coba Lagi
      </button>
    </div>
  );
}
