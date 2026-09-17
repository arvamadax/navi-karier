import type { Metadata } from 'next';
import Link from 'next/link';
import Reveal from '../../components/Reveal';

export const metadata: Metadata = { title: 'NaviKarier | Tentang Kami' };

const team: { name: string; role: string; img: string | null }[] = [
  { name: 'Arva Mada Jayastu', role: 'Project Lead, Frontend Developer', img: '/assets/team-arva.jpg' },
  { name: 'Farrel Arzaqia Mecca', role: 'Backend Developer, AI Integration', img: '/assets/team-farrel.jpg' },
  { name: 'Fristian Boas Nathaniel', role: 'Business Analyst, Documentation', img: null },
];

const initials = (name: string) => name.split(' ').slice(0, 2).map((w) => w[0]).join('');

export default function AboutPage() {
  return (
    <main className="about-hero">
      <div className="about-glow" />
      <div className="wrap">
        <div className="about-header">
          <Reveal>
            <h1 className="about-headline">Kenali tim di balik NaviKarier</h1>
          </Reveal>
          <div>
            <Reveal delay={80}>
              <p className="about-desc">
                Kami tim mahasiswa Universitas Brawijaya yang membangun NaviKarier untuk Digdaya &times; Hackathon 2026. <b>Terlalu banyak pencari kerja di Indonesia belajar tanpa arah karena tidak ada yang memberi tahu skill mana yang sebenarnya kurang. Kami ingin jawabannya bisa dilihat siapa saja, terbuka soal cara menghitungnya dan terbuka soal batasannya.</b>
              </p>
            </Reveal>
            <Reveal delay={160}>
              <Link href="/contact" className="about-link">Bergabung dengan kami &rarr;</Link>
            </Reveal>
          </div>
        </div>

        <div className="team-grid">
          {team.map((m, i) => (
            <Reveal key={m.name} delay={i * 120}>
              <article className="team-card">
                <div className="team-img-wrap">
                  {m.img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.img} alt={m.name} className="team-img" />
                  ) : (
                    <div className="team-initials" aria-hidden="true">{initials(m.name)}</div>
                  )}
                </div>
                <h3 className="team-name">{m.name}</h3>
                <p className="team-role">{m.role}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </main>
  );
}
