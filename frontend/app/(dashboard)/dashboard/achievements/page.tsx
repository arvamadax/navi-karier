'use client';

import { Trophy, Target, Zap, Star, Lock } from 'lucide-react';

const achievements = [
  { icon: Target, title: 'First Analysis', desc: 'Selesaikan analisis pertamamu', unlocked: true },
  { icon: Zap, title: 'Quick Learner', desc: 'Selesaikan 3 analisis dalam seminggu', unlocked: false },
  { icon: Star, title: 'High Scorer', desc: 'Raih match score di atas 80%', unlocked: false },
  { icon: Trophy, title: 'Skill Master', desc: 'Tutup semua gap di satu role', unlocked: false },
];

export default function AchievementsPage() {
  return (
    <div className="dash-page">
      <div className="dash-card">
        <div className="dash-card-header">
          <h3>Achievements</h3>
          <span style={{ fontSize: '0.7rem', color: 'var(--ink-3)', fontFamily: 'var(--mono)' }}>
            COMING SOON
          </span>
        </div>
        <p style={{ color: 'var(--ink-2)', fontSize: '0.85rem', marginBottom: 24 }}>
          Kumpulkan achievements saat kamu menggunakan NaviKarier. Fitur ini akan segera hadir!
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
          {achievements.map((a) => {
            const Icon = a.unlocked ? a.icon : Lock;
            return (
              <div
                key={a.title}
                style={{
                  background: a.unlocked ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${a.unlocked ? 'rgba(34,197,94,0.2)' : 'var(--border)'}`,
                  borderRadius: 8, padding: 18,
                  opacity: a.unlocked ? 1 : 0.5,
                }}
              >
                <Icon size={24} style={{ color: a.unlocked ? 'var(--green)' : 'var(--ink-3)', marginBottom: 10 }} />
                <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 4 }}>{a.title}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--ink-2)' }}>{a.desc}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
