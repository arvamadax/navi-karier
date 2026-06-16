'use client';

import { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import type { AnalysisResult } from '../../../lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

const TARGET_ROLES = ['Software Engineer', 'Data Analyst', 'Product Manager'];
const LEVELS = ['JUNIOR', 'MID', 'SENIOR'];

export default function AnalyzePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [targetRole, setTargetRole] = useState(TARGET_ROLES[0]);
  const [level, setLevel] = useState('MID');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');

  function handleFile(f: File) {
    if (!f.name.endsWith('.pdf')) {
      setError('Hanya file PDF yang didukung');
      return;
    }
    setFile(f);
    setError('');
  }

  async function runAnalysis() {
    const token = session?.user?.accessToken;
    if (!token || !file) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await fetch(`${API_BASE}/api/upload-cv`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!uploadRes.ok) {
        const body = await uploadRes.json().catch(() => ({}));
        throw new Error(body.detail || 'Upload gagal');
      }

      const { cv_id } = await uploadRes.json();

      const analyzeRes = await fetch(`${API_BASE}/api/analyze-gap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cv_id, target_role: targetRole, level }),
      });

      if (!analyzeRes.ok) {
        const body = await analyzeRes.json().catch(() => ({}));
        throw new Error(body.detail || 'Analysis gagal');
      }

      const data: AnalysisResult = await analyzeRes.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  }

  function gapColor(gap: number) {
    if (gap >= 30) return 'var(--red)';
    if (gap >= 15) return 'var(--amber)';
    return 'var(--green)';
  }

  return (
    <div className="dash-page">
      {!result ? (
        <>
          <div className="dash-card">
            <div className="dash-card-header">
              <h3>Upload CV</h3>
            </div>
            <div
              style={{
                border: `2px dashed ${dragActive ? 'var(--highlight)' : file ? 'var(--green)' : 'var(--border-2)'}`,
                borderRadius: 8,
                padding: '48px 24px',
                textAlign: 'center',
                transition: 'border-color 200ms',
                background: dragActive ? 'rgba(225,29,72,0.05)' : file ? 'rgba(34,197,94,0.05)' : 'transparent',
                cursor: 'pointer',
              }}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
              onClick={() => fileRef.current?.click()}
            >
              <input ref={fileRef} type="file" accept=".pdf" hidden onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
              {file ? (
                <>
                  <div style={{ fontSize: '2rem', marginBottom: 12 }}>✅</div>
                  <p style={{ fontSize: '0.92rem', margin: '0 0 8px', color: 'var(--green)' }}>{file.name}</p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--ink-3)', margin: 0 }}>Klik untuk ganti file</p>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '2rem', marginBottom: 12 }}>📄</div>
                  <p style={{ fontSize: '0.92rem', margin: '0 0 8px' }}>Drag & drop CV kamu di sini</p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--ink-3)', margin: 0 }}>Format: PDF (maks. 5MB)</p>
                </>
              )}
            </div>
          </div>

          <div className="dash-card">
            <div className="dash-card-header">
              <h3>Target Role</h3>
            </div>
            <div className="field">
              <label htmlFor="target-role">Posisi yang kamu tuju</label>
              <select
                id="target-role"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                style={{
                  font: 'inherit', fontSize: '0.88rem', background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--border-2)', padding: '10px 12px', color: 'var(--ink)', width: '100%',
                }}
              >
                {TARGET_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="field" style={{ marginTop: 14 }}>
              <label>Level</label>
              <div style={{ display: 'flex', gap: 1 }}>
                {LEVELS.map((l) => (
                  <button
                    key={l}
                    onClick={() => setLevel(l)}
                    style={{
                      fontFamily: 'var(--mono)', fontSize: '0.72rem', letterSpacing: '0.06em',
                      textTransform: 'uppercase' as const, padding: '8px 16px',
                      border: '1px solid var(--border-2)',
                      color: level === l ? 'var(--ink)' : 'var(--ink-2)',
                      background: level === l ? 'rgba(225,29,72,0.15)' : 'transparent',
                      borderColor: level === l ? 'var(--highlight)' : 'var(--border-2)',
                    }}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div style={{
                marginTop: 14, background: 'rgba(225,29,72,0.1)', border: '1px solid rgba(225,29,72,0.3)',
                borderRadius: 8, padding: '10px 14px', fontSize: '0.82rem', color: '#f87171',
              }}>
                {error}
              </div>
            )}

            <button
              onClick={runAnalysis}
              disabled={!file || loading}
              className="dash-action-btn dash-action-primary"
              style={{ marginTop: 24, width: '100%', textAlign: 'center', opacity: (!file || loading) ? 0.5 : 1 }}
            >
              {loading ? 'Analyzing...' : 'Run Analysis →'}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="dash-score-row">
            <div className="dash-score-card">
              <div className="dash-score-label">Match Score</div>
              <div className="dash-score-value" style={{ color: 'var(--highlight)' }}>
                {result.match_score.toFixed(1)}<span className="dash-score-unit">%</span>
              </div>
            </div>
            <div className="dash-score-card">
              <div className="dash-score-label">Target</div>
              <div className="dash-score-value" style={{ fontSize: '1.2rem' }}>{result.target_role}</div>
              <div className="dash-score-sub">{result.level} Level</div>
            </div>
            <div className="dash-score-card">
              <div className="dash-score-label">Gaps</div>
              <div className="dash-score-value" style={{ color: 'var(--amber)' }}>{result.missing_skills.length}</div>
            </div>
          </div>

          <div className="dash-card">
            <div className="dash-card-header">
              <h3>Skill Analysis</h3>
            </div>
            <div className="dash-skill-list">
              {result.skills.map((s) => (
                <div key={s.skill} className="dash-skill-row">
                  <span className="dash-skill-name">{s.skill}</span>
                  <div className="dash-skill-bar-bg">
                    <div className="dash-skill-bar-fill" style={{ width: `${s.current}%`, background: gapColor(s.gap) }} />
                    <div className="dash-skill-threshold" style={{ left: `${s.required}%` }} />
                  </div>
                  <span className="dash-skill-val" style={{ color: gapColor(s.gap) }}>{s.current}%</span>
                </div>
              ))}
            </div>
          </div>

          {result.recommended_courses.length > 0 && (
            <div className="dash-card">
              <div className="dash-card-header">
                <h3>Recommended Courses</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {result.recommended_courses.map((c, i) => (
                  <div key={i} style={{
                    padding: '10px 14px', borderRadius: 6, fontSize: '0.82rem',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
                  }}>
                    {c}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="dash-actions-row" style={{ gap: 8 }}>
            <button onClick={() => { setResult(null); setFile(null); }} className="dash-action-btn">
              New Analysis
            </button>
            <button onClick={() => router.push('/dashboard')} className="dash-action-btn dash-action-primary">
              Back to Dashboard
            </button>
          </div>
        </>
      )}
    </div>
  );
}
