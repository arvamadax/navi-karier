'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { apiFetch, type DashboardOverview, type SkillGap } from '../../lib/api';

export default function DashboardOverviewPage() {
  const { data: session } = useSession();
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = session?.user?.accessToken;
    if (!token) return;

    apiFetch<DashboardOverview>('/dashboard/overview', { token })
      .then(setOverview)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session]);

  const score = overview?.match_score ?? 0;
  const skillsAnalyzed = overview?.skills_analyzed ?? 0;
  const gapsFound = overview?.gaps_found ?? 0;
  const totalAnalyses = overview?.total_analyses ?? 0;
  const recentAnalyses = overview?.recent_analyses ?? [];
  const topGaps = overview?.top_gaps ?? [];

  const hasData = totalAnalyses > 0;

  function gapColor(g: SkillGap) {
    if (g.gap >= 30) return 'var(--red)';
    if (g.gap >= 15) return 'var(--amber)';
    return 'var(--green)';
  }

  function scoreTag(s: number) {
    if (s >= 75) return 'green';
    if (s >= 55) return 'yellow';
    return 'red';
  }

  if (loading) {
    return (
      <div className="dash-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <p style={{ color: 'var(--ink-3)', fontFamily: 'var(--mono)', fontSize: '0.82rem' }}>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dash-page">
      <div className="dash-score-row">
        <div className="dash-score-card">
          <div className="dash-score-label">Match Score</div>
          <div className="dash-score-value" style={{ color: 'var(--highlight)' }}>
            {hasData ? score.toFixed(1) : '—'}<span className="dash-score-unit">{hasData ? '%' : ''}</span>
          </div>
          <div className="dash-score-sub">{hasData ? 'Latest analysis' : 'Belum ada data'}</div>
        </div>
        <div className="dash-score-card">
          <div className="dash-score-label">Skills Analyzed</div>
          <div className="dash-score-value">{skillsAnalyzed}</div>
          <div className="dash-score-sub">{hasData ? 'across all analyses' : 'Upload CV untuk mulai'}</div>
        </div>
        <div className="dash-score-card">
          <div className="dash-score-label">Gaps Found</div>
          <div className="dash-score-value" style={{ color: 'var(--amber)' }}>{gapsFound}</div>
          <div className="dash-score-sub">{hasData ? 'skills to improve' : 'Belum ada data'}</div>
        </div>
        <div className="dash-score-card">
          <div className="dash-score-label">Total Analyses</div>
          <div className="dash-score-value">{totalAnalyses}</div>
          <div className="dash-score-sub">{hasData ? `${recentAnalyses.length} recent` : 'Mulai analisis pertamamu'}</div>
        </div>
      </div>

      <div className="dash-grid-2">
        <div className="dash-card">
          <div className="dash-card-header">
            <h3>Top Skill Gaps</h3>
            <Link href="/dashboard/gap" className="dash-see-all">View All →</Link>
          </div>
          {topGaps.length > 0 ? (
            <div className="dash-skill-list">
              {topGaps.map((g) => (
                <div key={g.skill} className="dash-skill-row">
                  <span className="dash-skill-name">{g.skill}</span>
                  <div className="dash-skill-bar-bg">
                    <div className="dash-skill-bar-fill" style={{ width: `${g.current}%`, background: gapColor(g) }} />
                    <div className="dash-skill-threshold" style={{ left: `${g.required}%` }} />
                  </div>
                  <span className="dash-skill-val" style={{ color: gapColor(g) }}>{g.current}%</span>
                </div>
              ))}
              <div className="dash-legend">
                <span>■ Your Level</span>
                <span style={{ opacity: 0.5 }}>┃ Required</span>
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--ink-3)', fontSize: '0.82rem', padding: '24px 0', textAlign: 'center' }}>
              Jalankan analisis untuk melihat skill gaps
            </p>
          )}
        </div>

        <div className="dash-stack">
          <div className="dash-card">
            <div className="dash-card-header">
              <h3>Readiness Score</h3>
            </div>
            <div className="dash-ring-container">
              <svg width="130" height="130" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
                <circle
                  cx="60" cy="60" r="50" fill="none"
                  stroke="var(--highlight)" strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={`${Math.PI * 100}`}
                  strokeDashoffset={`${Math.PI * 100 * (1 - score / 100)}`}
                  transform="rotate(-90 60 60)"
                />
                <text x="60" y="56" textAnchor="middle" fill="var(--ink)" fontSize="24" fontWeight="800">
                  {hasData ? Math.round(score) : '—'}
                </text>
                <text x="60" y="72" textAnchor="middle" fill="var(--ink-2)" fontSize="9">/ 100</text>
              </svg>
              <div className="dash-ring-label">
                {recentAnalyses[0]?.target_role
                  ? <>Target: <strong>{recentAnalyses[0].target_role}</strong></>
                  : 'Belum ada target role'}
              </div>
            </div>
          </div>

          <div className="dash-card">
            <div className="dash-card-header">
              <h3>Recent Analyses</h3>
            </div>
            {recentAnalyses.length > 0 ? (
              recentAnalyses.map((a) => (
                <div key={a.id} className="dash-analysis-row">
                  <div>
                    <div className="dash-analysis-role">{a.target_role}</div>
                    <div className="dash-analysis-date">
                      {a.created_at ? new Date(a.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                    </div>
                  </div>
                  <span className={`dash-tag dash-tag-${scoreTag(a.match_score)}`}>{a.match_score}%</span>
                </div>
              ))
            ) : (
              <p style={{ color: 'var(--ink-3)', fontSize: '0.82rem', padding: '16px 0', textAlign: 'center' }}>
                Belum ada analisis
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="dash-card">
        <div className="dash-card-header">
          <h3>Quick Actions</h3>
        </div>
        <div className="dash-actions-row">
          <Link href="/dashboard/analyze" className="dash-action-btn dash-action-primary">
            + New Analysis
          </Link>
          <Link href="/dashboard/roadmap" className="dash-action-btn">
            View Roadmap
          </Link>
          <Link href="/dashboard/progress" className="dash-action-btn">
            Track Progress
          </Link>
        </div>
      </div>
    </div>
  );
}
