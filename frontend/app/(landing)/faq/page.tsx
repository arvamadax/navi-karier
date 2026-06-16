'use client';

import Link from 'next/link';
import { useRef } from 'react';
import Reveal from '../../components/Reveal';

function FaqItem({ q, a }: { q: string; a: string }) {
  const itemRef = useRef<HTMLDivElement>(null);
  const ansRef = useRef<HTMLDivElement>(null);

  function toggle() {
    const item = itemRef.current;
    const ans = ansRef.current;
    if (!item || !ans) return;
    const open = item.classList.toggle('open');
    ans.style.maxHeight = open ? ans.scrollHeight + 'px' : '0px';
  }

  return (
    <div className="faq-item" ref={itemRef}>
      <button className="faq-q" onClick={toggle}>
        <span>{q}</span>
        <span className="faq-plus">+</span>
      </button>
      <div className="faq-a" ref={ansRef}>
        <div className="faq-a-inner" dangerouslySetInnerHTML={{ __html: a }} />
      </div>
    </div>
  );
}

const categories = [
  {
    title: 'Tentang NaviKarier',
    items: [
      { q: 'Bagaimana NaviKarier menghitung skill gap saya?', a: 'Kami menggunakan taxonomy skills industri yang dikurasi dari ribuan job listing Indonesia. Setiap skill punya bobot. Gap dihitung secara matematis: bukan AI prediction, tapi kalkulasi berbasis data.' },
      { q: 'Apakah hasilnya akurat?', a: 'Seakurat data yang kamu input. Taxonomy dikurasi manual dari job listings real. Semakin jujur kamu mengisi level skill, semakin akurat hasilnya.' },
      { q: 'Apa bedanya dengan LinkedIn Skills Assessment?', a: 'LinkedIn test per skill satu per satu. NaviKarier melihat keseluruhan profil kamu vs standar role yang kamu tuju &mdash; lalu prioritaskan skill mana yang paling menggerakkan peluang.' },
      { q: 'Industri apa saja yang tersedia?', a: 'Technology, Business &amp; Finance, Marketing &amp; Creative, Human Resources, Operations, dan Keuangan &amp; Edukasi (OJK). Total 12+ roles.' },
    ],
  },
  {
    title: 'Keamanan & Privasi',
    items: [
      { q: 'Apakah data saya aman?', a: 'Demo berjalan sepenuhnya di browser. Tidak ada data yang dikirim ke server. Untuk Pro dengan CV upload, data dienkripsi dan tidak dibagikan ke pihak ketiga.' },
      { q: 'Apakah NaviKarier menyimpan CV saya?', a: 'Untuk versi gratis, semua pemrosesan dilakukan di browser kamu. CV tidak dikirim ke server manapun. Untuk versi Pro, CV diproses dan dihapus setelah analisis selesai.' },
    ],
  },
  {
    title: 'Cara Kerja',
    items: [
      { q: 'Bagaimana langkah-langkah menggunakan NaviKarier?', a: '<strong>1. Ukur Skill Gap</strong> &mdash; Upload CV atau input skill manual.<br><br><strong>2. Temukan Prioritas</strong> &mdash; Sistem menghitung gap per-skill vs threshold industri.<br><br><strong>3. Belajar Terarah</strong> &mdash; Dapatkan rekomendasi skill yang harus diprioritaskan.<br><br><strong>4. Siap Bersaing</strong> &mdash; Track progress readiness score dari waktu ke waktu.' },
      { q: 'Berapa lama proses analisis?', a: 'Kurang dari 5 menit. Input skill, pilih role target, dan langsung lihat hasilnya.' },
      { q: 'Apakah bisa digunakan tanpa registrasi?', a: 'Ya. Demo di landing page bisa digunakan langsung tanpa signup. Untuk fitur lengkap seperti CV upload dan progress tracking, diperlukan akun.' },
    ],
  },
];

export default function FaqPage() {
  return (
    <main>
      <section className="page-hero">
        <div className="wrap">
          <Reveal>
            <Link href="/" style={{ display: 'inline-block', fontSize: '0.85rem', color: 'var(--ink-2)', marginBottom: 32 }}>&larr; Kembali ke Beranda</Link>
            <h1>Pertanyaan Umum</h1>
            <p>Semua yang perlu kamu tahu tentang NaviKarier, skill gap analysis, dan cara kerja platform kami.</p>
          </Reveal>
        </div>
      </section>

      <section className="faq-section">
        <div className="wrap">
          {categories.map((cat) => (
            <Reveal key={cat.title} className="faq-category">
              <h2>{cat.title}</h2>
              <div className="faq-list">
                {cat.items.map((item) => (
                  <FaqItem key={item.q} q={item.q} a={item.a} />
                ))}
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </main>
  );
}
