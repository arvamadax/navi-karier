'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type RoleSkill = [string, number, number];
type Role = { name: string; skills: RoleSkill[] };

const taxonomy: Record<string, Role> = {
  frontend: { name: 'Frontend Engineer', skills: [['JavaScript / TypeScript', 80, 0.18], ['React / Next.js', 75, 0.16], ['HTML / CSS / A11y', 70, 0.10], ['State Management', 65, 0.08], ['Testing', 60, 0.08], ['Git', 70, 0.06], ['API Integration', 65, 0.10], ['Performance', 60, 0.08], ['Problem Solving', 75, 0.10], ['Communication', 65, 0.06]] },
  data: { name: 'Data Analyst', skills: [['SQL (Window, CTE)', 80, 0.18], ['Excel', 75, 0.10], ['Python (pandas)', 70, 0.14], ['Data Viz', 70, 0.12], ['Statistics', 65, 0.10], ['BI Tools', 65, 0.10], ['Business Acumen', 70, 0.10], ['Data Storytelling', 65, 0.08], ['Communication', 70, 0.08]] },
  pm: { name: 'Product Manager', skills: [['Product Discovery', 75, 0.14], ['User Research', 65, 0.10], ['Roadmapping', 75, 0.12], ['Agile / Scrum', 70, 0.08], ['Stakeholder Mgmt', 75, 0.10], ['Analytics', 70, 0.12], ['Technical Literacy', 65, 0.10], ['Storytelling', 70, 0.10], ['Strategic Thinking', 75, 0.14]] },
  marketing: { name: 'Digital Marketing', skills: [['SEO', 70, 0.12], ['Performance Ads', 75, 0.14], ['Copywriting', 70, 0.12], ['Analytics (GA4)', 70, 0.12], ['Social Media', 70, 0.10], ['Content Planning', 65, 0.10], ['Email & CRM', 65, 0.08], ['Brand', 65, 0.10], ['Communication', 70, 0.12]] },
  hr: { name: 'HR Generalist', skills: [['Recruitment', 75, 0.14], ['Employee Relations', 75, 0.12], ['Comp & Benefits', 70, 0.10], ['HRIS', 65, 0.08], ['Performance Mgmt', 70, 0.12], ['L&D', 70, 0.10], ['Labor Law', 70, 0.12], ['Empathy', 75, 0.10], ['Communication', 75, 0.12]] },
  ops: { name: 'Supply Chain Analyst', skills: [['Inventory Mgmt', 75, 0.14], ['Demand Forecasting', 70, 0.12], ['Excel / PQ', 75, 0.10], ['SQL', 65, 0.10], ['ERP (SAP)', 70, 0.10], ['Logistics', 70, 0.10], ['Process Improvement', 70, 0.12], ['Data Analysis', 70, 0.10], ['Communication', 70, 0.12]] },
  finlit: { name: 'Financial Literacy (OJK)', skills: [['Literasi Produk Keuangan', 75, 0.14], ['Perencanaan Keuangan', 70, 0.12], ['Analisis Risiko', 70, 0.12], ['Regulasi BI/OJK', 75, 0.14], ['Edukasi Publik', 70, 0.10], ['Data Literacy', 65, 0.10], ['Inklusi Digital', 70, 0.10], ['Etika Konsumen', 70, 0.10], ['Storytelling', 70, 0.08]] },
};

const levelMods: Record<string, number> = { junior: 0.55, mid: 0.82, senior: 1.05 };

function calcDemo(roleId: string, level: string) {
  const role = taxonomy[roleId];
  const mod = levelMods[level];
  let weighted = 0;
  let totalW = 0;
  const skills = role.skills.map(([name, threshold, w]) => {
    const seed = (name.length * 13 + level.length * 7) % 30;
    const lv = Math.max(5, Math.min(100, Math.round(threshold * mod + (seed - 15))));
    const ratio = Math.min(lv / threshold, 1);
    weighted += ratio * w;
    totalW += w;
    const r = lv / threshold;
    const met = r >= 1 ? 'true' : r >= 0.8 ? 'medium' : 'false';
    return { name, lv, threshold, met };
  });
  const score = Math.round((weighted / totalW) * 100);
  let verdict = 'Banyak gap terbuka';
  if (score >= 80) verdict = 'Siap melamar';
  else if (score >= 60) verdict = 'Hampir siap';
  else if (score >= 40) verdict = 'Perlu pengembangan';
  return { skills, score, verdict };
}

export default function DemoWidget() {
  const [roleId, setRoleId] = useState('frontend');
  const [level, setLevel] = useState('junior');
  const [displayScore, setDisplayScore] = useState(0);
  const targetRef = useRef(0);

  const result = useMemo(() => calcDemo(roleId, level), [roleId, level]);
  targetRef.current = result.score;

  useEffect(() => {
    let raf: number;
    const tick = () => {
      setDisplayScore((d) => {
        const diff = targetRef.current - d;
        if (Math.abs(diff) < 0.5) return targetRef.current;
        return d + diff * 0.15;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="demo">
      <div className="demo-head">
        <h3>Skill Gap Analyzer</h3>
        <span style={{ fontFamily: 'var(--mono)', fontSize: '0.68rem', color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Client-side only</span>
      </div>
      <div className="demo-body">
        <aside className="demo-aside">
          <h4>Role</h4>
          <ul className="role-list">
            {Object.entries(taxonomy).map(([id, role]) => (
              <li key={id}>
                <button className={id === roleId ? 'active' : ''} onClick={() => setRoleId(id)}>
                  {role.name}
                </button>
              </li>
            ))}
          </ul>
          <h4>Level</h4>
          <div className="level-pick">
            {['junior', 'mid', 'senior'].map((l) => (
              <button key={l} className={l === level ? 'active' : ''} onClick={() => setLevel(l)}>
                {l.charAt(0).toUpperCase() + l.slice(1)}
              </button>
            ))}
          </div>
        </aside>
        <div className="demo-main">
          <div className="demo-result-head">
            <div>
              <span className="demo-score-label">Readiness Score</span>
              <div className="demo-score">
                <span>{Math.round(displayScore)}</span>
                <sup style={{ fontSize: '0.9rem', color: 'var(--ink-3)' }}>%</sup>
              </div>
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--ink-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {result.verdict}
            </div>
          </div>
          {result.skills.map((s) => (
            <div key={s.name} className="demo-skill" data-met={s.met}>
              <div className="demo-skill-head">
                <span className="demo-skill-name">{s.name}</span>
                <span className="demo-skill-vals">{s.lv} / {s.threshold}</span>
              </div>
              <div className="demo-skill-bar">
                <div className="demo-skill-fill" style={{ width: `${Math.min(100, s.lv)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
