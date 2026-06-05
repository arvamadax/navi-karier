'use client';

import { useEffect, useState } from 'react';

function GaugeCard() {
  const targets = [47, 53, 61, 58, 65, 52, 47];
  const [step, setStep] = useState(0);
  const val = targets[step];
  const deg = Math.round((val / 100) * 360);

  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % targets.length), 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="scard">
      <div className="scard-title">Readiness Score</div>
      <div className="scard-visual" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="gauge-wrap">
          <div
            className="gauge-ring"
            style={{ background: `conic-gradient(var(--highlight) 0deg, var(--highlight) ${deg}deg, rgba(255,255,255,0.06) ${deg}deg)` }}
          >
            <div className="gauge-inner">
              <span className="gauge-num">{val}</span>
            </div>
          </div>
          <span className="gauge-label">Industry Readiness</span>
        </div>
      </div>
      <div className="scard-text"><b>Satu angka.</b> Readiness score menunjukkan seberapa siap kamu untuk role target.</div>
    </div>
  );
}

function GapTableCard() {
  const rows = [
    { name: 'React', val: '-35', status: 'gap' },
    { name: 'SQL', val: '-15', status: 'gap' },
    { name: 'Communication', val: '+5', status: 'met' },
    { name: 'Problem Solving', val: '-20', status: 'gap' },
    { name: 'Testing', val: '-10', status: 'gap' },
  ];
  const [hlIdx, setHlIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setHlIdx((i) => (i + 1) % rows.length), 2500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="scard">
      <div className="scard-title">Gap Analysis</div>
      <div className="scard-visual" style={{ alignItems: 'stretch' }}>
        <div className="gap-table" style={{ alignSelf: 'center' }}>
          {rows.map((r, i) => (
            <div key={i} className={`gap-table-row${i === hlIdx ? ' hl-row' : ''}`}>
              <span>{r.name}</span>
              <span className="gap-val">{r.val}</span>
              <span>{r.status}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="scard-text"><b>Gap per-skill.</b> Setiap skill dihitung gap-nya vs threshold industri. Prioritas terlihat jelas.</div>
    </div>
  );
}

export default function ShowcaseCards() {
  return (
    <div className="showcase">
      <div className="scard">
        <div className="scard-title">Skill Levels</div>
        <div className="scard-visual">
          <div className="skill-bars">
            {[
              { label: 'JS', h: '50%', color: 'red' },
              { label: 'SQL', h: '65%', color: 'amber' },
              { label: 'Comm', h: '85%', color: 'green' },
              { label: 'PM', h: '40%', color: 'accent' },
              { label: 'Git', h: '55%', color: 'red' },
              { label: 'API', h: '70%', color: 'amber' },
            ].map((b) => (
              <div key={b.label} className="skill-bar-col">
                <div className={`skill-bar-fill ${b.color}`} style={{ '--h': b.h } as React.CSSProperties} />
                <span className="skill-bar-label">{b.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="scard-text"><b>Visualisasi skill.</b> Lihat posisi skill kamu vs standar industri secara real-time.</div>
      </div>

      <GapTableCard />
      <GaugeCard />

      <div className="scard">
        <div className="scard-title">Progress 30 Hari</div>
        <div className="scard-visual" style={{ alignItems: 'stretch' }}>
          <div className="line-chart">
            <svg viewBox="0 0 200 80" preserveAspectRatio="none">
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <line className="chart-grid-line" x1="0" y1="20" x2="200" y2="20" />
              <line className="chart-grid-line" x1="0" y1="40" x2="200" y2="40" />
              <line className="chart-grid-line" x1="0" y1="60" x2="200" y2="60" />
              <path className="line-area" d="M0,65 L33,55 L66,50 L100,40 L133,30 L166,25 L200,18 L200,80 L0,80 Z" />
              <path className="line-path" d="M0,65 L33,55 L66,50 L100,40 L133,30 L166,25 L200,18" />
              {[[0, 65], [33, 55], [66, 50], [100, 40], [133, 30], [166, 25], [200, 18]].map(([cx, cy], i) => (
                <circle key={i} className="line-dot" cx={cx} cy={cy} r={3} style={{ animationDelay: `${i * 0.3}s` }} />
              ))}
            </svg>
          </div>
        </div>
        <div className="scard-text"><b>Track progress.</b> Lihat perkembangan readiness score kamu dari waktu ke waktu.</div>
      </div>
    </div>
  );
}
