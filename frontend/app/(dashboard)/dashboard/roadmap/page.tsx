'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, type RecommendationDetail } from '../../../lib/api';

export default function RoadmapPageWrapper() {
  return (
    <Suspense fallback={
      <div className="dash-page">
        <div className="dash-card" style={{ minHeight: 200 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{ height: 14, borderRadius: 4, background: 'rgba(255,255,255,0.06)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        </div>
      </div>
    }>
      <RoadmapPage />
    </Suspense>
  );
}

function RoadmapPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const analysisId = searchParams.get('id');

  const [data, setData] = useState<RecommendationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!analysisId || !session?.user?.accessToken) return;

    setLoading(true);
    apiFetch<RecommendationDetail>(`/recommendations/${analysisId}`, {
      token: session.user.accessToken,
    })
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Gagal memuat data'))
      .finally(() => setLoading(false));
  }, [analysisId, session?.user?.accessToken]);

  if (!analysisId) {
    return (
      <div className="dash-page">
        <div className="dash-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>🗺️</div>
          <h3 style={{ marginBottom: 8 }}>Belum Ada Roadmap</h3>
          <p style={{ color: 'var(--ink-3)', fontSize: '0.85rem', marginBottom: 20 }}>
            Lakukan analisis CV terlebih dahulu untuk mendapatkan learning roadmap.
          </p>
          <Link href="/dashboard/analyze" className="dash-action-btn dash-action-primary">
            Mulai Analisis →
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="dash-page">
        <div className="dash-card" style={{ minHeight: 200 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{ height: 14, borderRadius: 4, background: 'rgba(255,255,255,0.06)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="dash-page">
        <div className="dash-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>⚠️</div>
          <h3 style={{ marginBottom: 8 }}>Gagal Memuat</h3>
          <p style={{ color: 'var(--ink-3)', fontSize: '0.85rem', marginBottom: 20 }}>
            {error || 'Data tidak ditemukan'}
          </p>
          <button onClick={() => router.back()} className="dash-action-btn">
            ← Kembali
          </button>
        </div>
      </div>
    );
  }

  const prioritySkills = [...data.skills]
    .filter((s) => s.gap > 0)
    .sort((a, b) => b.gap - a.gap);

  return (
    <div className="dash-page">
      <div className="dash-card">
        <div className="dash-card-header">
          <h3>Learning Roadmap — {data.target_role}</h3>
          <span className="dash-tag dash-tag-yellow">{data.level}</span>
        </div>

        {data.recommended_courses.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {data.recommended_courses.map((course, i) => (
              <div key={i} style={{ display: 'flex', gap: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20 }}>
                  <div style={{
                    width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
                    background: i === 0 ? 'var(--highlight)' : 'var(--ink-3)',
                    boxShadow: i === 0 ? '0 0 0 4px rgba(225,29,72,0.25)' : 'none',
                  }} />
                  {i < data.recommended_courses.length - 1 && (
                    <div style={{ width: 2, flex: 1, background: 'var(--border)', minHeight: 40 }} />
                  )}
                </div>
                <div style={{ paddingBottom: 24, flex: 1 }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{course}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--ink-3)', fontFamily: 'var(--mono)', marginTop: 4 }}>
                    {i === 0 ? 'Mulai dari sini' : `Langkah ${i + 1}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--ink-3)', fontSize: '0.85rem' }}>
            Tidak ada rekomendasi course — skill kamu sudah cukup baik!
          </p>
        )}
      </div>

      {prioritySkills.length > 0 && (
        <div className="dash-card">
          <div className="dash-card-header">
            <h3>Priority Impact</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {prioritySkills.slice(0, 8).map((skill) => (
              <div key={skill.skill} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '0.78rem', width: 100, color: 'var(--ink-2)', flexShrink: 0 }}>{skill.skill}</span>
                <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.min(skill.gap * 2, 100)}%`, height: '100%', borderRadius: 3,
                    background: skill.priority === 'HIGH' ? 'var(--highlight)' : skill.priority === 'MEDIUM' ? 'var(--amber)' : 'var(--green)',
                  }} />
                </div>
                <span style={{
                  fontSize: '0.68rem', fontWeight: 600, fontFamily: 'var(--mono)', width: 36,
                  color: skill.priority === 'HIGH' ? 'var(--highlight)' : skill.priority === 'MEDIUM' ? 'var(--amber)' : 'var(--green)',
                }}>
                  {skill.priority === 'HIGH' ? 'HIGH' : skill.priority === 'MEDIUM' ? 'MED' : 'LOW'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="dash-actions-row" style={{ gap: 8 }}>
        <Link href={`/dashboard/gap?id=${analysisId}`} className="dash-action-btn">
          ← Detail Gap
        </Link>
        <button onClick={() => router.push('/dashboard')} className="dash-action-btn dash-action-primary">
          Dashboard
        </button>
      </div>
    </div>
  );
}
