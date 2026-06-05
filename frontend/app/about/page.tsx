import type { Metadata } from 'next';
import Link from 'next/link';
import Reveal from '../components/Reveal';

export const metadata: Metadata = { title: 'NaviKarier — Tentang Kami' };

const team = [
  { name: 'Nama Anggota 1', role: 'Co-founder, CEO', img: 'https://placehold.co/800x800/111/444?text=Foto+1' },
  { name: 'Nama Anggota 2', role: 'Co-founder, CPO', img: 'https://placehold.co/800x800/111/444?text=Foto+2' },
  { name: 'Nama Anggota 3', role: 'COO', img: 'https://placehold.co/800x800/111/444?text=Foto+3' },
];

export default function AboutPage() {
  return (
    <main className="about-hero">
      <div className="wrap">
        <Reveal>
          <div className="about-header">
            <h1 className="about-headline">Kenali tim di balik NaviKarier</h1>
            <div>
              <p className="about-desc">
                Kami adalah analis data, insinyur perangkat lunak, dan spesialis karier. <b>Kami percaya bahwa langkah menuju karier impian harus dipandu oleh data nyata dan hitungan presisi, bukan tebakan. Kami berdedikasi menjembatani kesenjangan kompetensi talenta Indonesia secara transparan dan matematis.</b>
              </p>
              <Link href="/contact" className="about-link">Bergabung dengan kami &rarr;</Link>
            </div>
          </div>
        </Reveal>

        <div className="team-grid">
          {team.map((m, i) => (
            <Reveal key={m.name} delay={i * 50}>
              <article className="team-card">
                <div className="team-img-wrap">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.img} alt={m.name} className="team-img" />
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
