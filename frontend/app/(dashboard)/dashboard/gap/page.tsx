'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, type RecommendationDetail, type SkillGap } from '../../../lib/api';

export default function GapDetailPageWrapper() {
  return (
    <Suspense fallback={
      <div className="dash-page">
        <div className="dash-card" style={{ minHeight: 180 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[1, 2, 3].map((j) => (
              <div key={j} style={{ height: 14, borderRadius: 4, background: 'rgba(255,255,255,0.06)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        </div>
      </div>
    }>
      <GapDetailPage />
    </Suspense>
  );
}

function groupSkillsByPriority(skills: SkillGap[]) {
  const high = skills.filter((s) => s.priority === 'HIGH');
  const medium = skills.filter((s) => s.priority === 'MEDIUM');
  const low = skills.filter((s) => s.priority === 'LOW');
  return [
    { name: 'High Priority Gaps', tag: 'HIGH', color: 'var(--red)', skills: high },
    { name: 'Medium Priority', tag: 'MED', color: 'var(--amber)', skills: medium },
    { name: 'On Track', tag: 'OK', color: 'var(--green)', skills: low },
  ].filter((g) => g.skills.length > 0);
}

function GapDetailPage() {
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
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>📊</div>
          <h3 style={{ marginBottom: 8 }}>Belum Ada Analisis</h3>
          <p style={{ color: 'var(--ink-3)', fontSize: '0.85rem', marginBottom: 20 }}>
            Lakukan analisis CV terlebih dahulu untuk melihat detail gap skill kamu.
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
        {[1, 2].map((i) => (
          <div key={i} className="dash-card" style={{ minHeight: 180 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[1, 2, 3].map((j) => (
                <div key={j} style={{ height: 14, borderRadius: 4, background: 'rgba(255,255,255,0.06)', animation: 'pulse 1.5s ease-in-out infinite' }} />
              ))}
            </div>
          </div>
        ))}
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
            {error || 'Data analisis tidak ditemukan'}
          </p>
          <button onClick={() => router.back()} className="dash-action-btn">
            ← Kembali
          </button>
        </div>
      </div>
    );
  }

  const groups = groupSkillsByPriority(data.skills);

  return (
    <div className="dash-page">
      <div className="dash-score-row">
        <div className="dash-score-card">
          <div className="dash-score-label">Match Score</div>
          <div className="dash-score-value" style={{ color: 'var(--highlight)' }}>
            {data.match_score.toFixed(1)}<span className="dash-score-unit">%</span>
          </div>
        </div>
        <div className="dash-score-card">
          <div className="dash-score-label">Target</div>
          <div className="dash-score-value" style={{ fontSize: '1.2rem' }}>{data.target_role}</div>
          <div className="dash-score-sub">{data.level} Level</div>
        </div>
        <div className="dash-score-card">
          <div className="dash-score-label">Total Gaps</div>
          <div className="dash-score-value" style={{ color: 'var(--amber)' }}>
            {data.skills.filter((s) => s.gap > 0).length}
          </div>
        </div>
      </div>

      {groups.map((group) => (
        <div key={group.name} className="dash-card">
          <div className="dash-card-header">
            <h3>{group.name}</h3>
            <span className="dash-tag dash-tag-yellow">
              {group.skills.length} skill{group.skills.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="dash-skill-list">
            {group.skills.map((skill) => {
              const met = skill.current >= skill.required;
              const color = met ? 'var(--green)' : skill.current >= skill.required * 0.7 ? 'var(--amber)' : 'var(--red)';
              return (
                <div key={skill.skill} className="dash-skill-row">
                  <span className="dash-skill-name">{skill.skill}</span>
                  <div className="dash-skill-bar-bg">
                    <div className="dash-skill-bar-fill" style={{ width: `${skill.current}%`, background: color }} />
                    <div className="dash-skill-threshold" style={{ left: `${skill.required}%` }} />
                  </div>
                  <span className="dash-skill-val" style={{ color }}>
                    {skill.current}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="dash-actions-row" style={{ gap: 8 }}>
        <Link href={`/dashboard/roadmap?id=${analysisId}`} className="dash-action-btn dash-action-primary">
          Lihat Roadmap →
        </Link>
        <button onClick={() => router.push('/dashboard')} className="dash-action-btn">
          ← Dashboard
        </button>
      </div>
    </div>
  );
}
