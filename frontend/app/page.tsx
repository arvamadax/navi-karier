import Link from 'next/link';
import HeroRotator from './components/HeroRotator';
import LogoMarquee from './components/LogoMarquee';
import ShowcaseCards from './components/ShowcaseCards';
import DemoWidget from './components/DemoWidget';
import Reveal from './components/Reveal';

export default function HomePage() {
  return (
    <main>
      {/* HERO */}
      <section id="hero" className="hero">
        <div className="hero-noise"></div>
        <div className="wrap">
          <Reveal>
            <h1 className="hero-headline">
              Dari tebakan<br />jadi <HeroRotator />
            </h1>
          </Reveal>
          <Reveal>
            <p className="hero-sub">
              NaviKarier menghitung gap antara skill kamu dan standar industri &mdash; matematis, bukan tebakan. Dalam 5 menit kamu tahu harus fokus kemana.
            </p>
          </Reveal>
          <Reveal>
            <div className="hero-ctas">
              <Link href="#demo" className="hero-btn primary">Analisa Sekarang</Link>
              <Link href="#features" className="hero-btn ghost">Pelajari Lebih &rarr;</Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* LOGO MARQUEE */}
      <LogoMarquee />

      {/* FEATURES */}
      <section id="features" className="sec">
        <div className="wrap">
          <div className="split">
            <Reveal>
              <h2 className="sec-headline">
                Hitung skill gap kamu secara matematis. Bukan tebakan, bukan <span className="hl">AI black-box.</span>
              </h2>
            </Reveal>
            <Reveal style={{ paddingTop: 48 }}>
              <p className="sec-sub">
                Upload CV atau input skill manual. Sistem menghitung gap vs standar industri menggunakan taxonomy yang dikurasi dari ribuan job listing Indonesia.
              </p>
            </Reveal>
          </div>
          <Reveal>
            <ShowcaseCards />
          </Reveal>
        </div>
      </section>

      {/* DEMO */}
      <section id="demo" className="sec">
        <div className="wrap">
          <div className="split">
            <Reveal>
              <h2 className="sec-headline">Coba sendiri. Pilih role, lihat <span className="hl">gap-mu.</span></h2>
            </Reveal>
            <Reveal style={{ paddingTop: 48 }}>
              <p className="sec-sub">100% berjalan di browser. Tidak ada data yang dikirim ke server manapun.</p>
            </Reveal>
          </div>
          <Reveal>
            <DemoWidget />
          </Reveal>
        </div>
      </section>

      {/* DAMPAK */}
      <section id="dampak" className="sec">
        <div className="wrap">
          <div className="split">
            <Reveal>
              <h2 className="sec-headline">Indonesia kehilangan <span className="hl">Rp 142T</span> per tahun karena skill gap.</h2>
            </Reveal>
            <Reveal style={{ paddingTop: 48 }}>
              <p className="sec-sub">Bukan soal kurang lowongan. Masalahnya: skill pelamar tidak match dengan kebutuhan industri. Data BPS dan Bank Indonesia membuktikannya.</p>
            </Reveal>
          </div>

          <Reveal>
            <div className="dampak-stats">
              <a href="https://www.bps.go.id/id/pressrelease/2024/05/06/2393/februari-2024--tingkat-pengangguran-terbuka--tpt--sebesar-4-82-persen.html" target="_blank" rel="noopener" className="card" style={{ textAlign: 'center', textDecoration: 'none', cursor: 'pointer' }}>
                <div style={{ fontSize: 'clamp(2rem,4vw,2.8rem)', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1 }}>7,46<span style={{ fontSize: '0.5em', color: 'var(--ink-2)', fontWeight: 400, marginLeft: 4 }}>juta</span></div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginTop: 12 }}>Pengangguran</div>
                <p style={{ color: 'var(--ink-2)', fontSize: '0.85rem', margin: '12px 0 0', lineHeight: 1.5 }}>Mayoritas karena mismatch skill vs kebutuhan industri.</p>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '0.62rem', color: 'var(--highlight)', marginTop: 12, letterSpacing: '0.06em' }}>BPS, Feb 2024 &#x2197;</div>
              </a>
              <a href="https://www.bi.go.id/id/publikasi/laporan/Pages/LPI_2023.aspx" target="_blank" rel="noopener" className="card" style={{ textAlign: 'center', textDecoration: 'none', cursor: 'pointer' }}>
                <div style={{ fontSize: 'clamp(2rem,4vw,2.8rem)', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1, color: 'var(--red)' }}>51,5<span style={{ fontSize: '0.5em', color: 'var(--ink-2)', fontWeight: 400, marginLeft: 2 }}>%</span></div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginTop: 12 }}>Underqualified</div>
                <p style={{ color: 'var(--ink-2)', fontSize: '0.85rem', margin: '12px 0 0', lineHeight: 1.5 }}>Pelamar tidak memenuhi kualifikasi minimum posisi yang dilamar.</p>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '0.62rem', color: 'var(--highlight)', marginTop: 12, letterSpacing: '0.06em' }}>Laporan Bank Indonesia &#x2197;</div>
              </a>
              <a href="https://www.kemenkeu.go.id/informasi-publik/publikasi/berita-utama/Menkeu-Paparkan-Outlook-Perekonomian-Indonesia" target="_blank" rel="noopener" className="card" style={{ textAlign: 'center', textDecoration: 'none', cursor: 'pointer' }}>
                <div style={{ fontSize: 'clamp(2rem,4vw,2.8rem)', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1, color: 'var(--amber)' }}>142<span style={{ fontSize: '0.5em', color: 'var(--ink-2)', fontWeight: 400, marginLeft: 4 }}>T</span></div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginTop: 12 }}>PDB Hilang / Tahun</div>
                <p style={{ color: 'var(--ink-2)', fontSize: '0.85rem', margin: '12px 0 0', lineHeight: 1.5 }}>Kerugian ekonomi akibat produktivitas tidak optimal.</p>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '0.62rem', color: 'var(--highlight)', marginTop: 12, letterSpacing: '0.06em' }}>Kemenkeu RI &#x2197;</div>
              </a>
            </div>
          </Reveal>
          <Reveal>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 48 }}>
              <Link href="/blog" className="hero-btn primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                Baca Selengkapnya di Blog &rarr;
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* COMPARISON */}
      <section id="comparison" className="sec">
        <div className="wrap">
          <div className="split">
            <Reveal>
              <h2 className="sec-headline">Tebakan bukan <span className="hl">strategi.</span></h2>
              <p className="sec-sub" style={{ marginTop: 24 }}>Kebanyakan job seeker belajar tanpa arah. NaviKarier memberikan peta yang jelas: apa yang kurang, seberapa jauh gap-nya, dan skill mana yang paling berdampak.</p>
            </Reveal>
            <Reveal style={{ paddingTop: 16 }}>
              <div style={{ border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                  <div style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.03)', fontFamily: 'var(--mono)', fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', textAlign: 'center', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}>Tanpa NaviKarier</div>
                  <div style={{ padding: '16px 20px', background: 'var(--highlight)', fontFamily: 'var(--mono)', fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#fff', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>Dengan NaviKarier</div>
                </div>
                {[
                  ['Belajar skill random dari rekomendasi umum', 'Belajar skill yang paling berdampak berdasarkan data industri'],
                  ['Tidak tahu seberapa jauh dari standar', 'Gap dihitung matematis per-skill vs threshold industri'],
                  ['Self-assessment subjektif dan bias', 'Readiness score objektif dengan bobot per-skill'],
                  ['Tidak bisa track progress belajar', 'Monitoring progress dari waktu ke waktu'],
                ].map(([left, right], i, arr) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                    <div style={{ padding: '16px 20px', fontSize: '0.88rem', color: 'var(--ink-2)', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : undefined, borderRight: '1px solid var(--border)' }}>{left}</div>
                    <div style={{ padding: '16px 20px', fontSize: '0.88rem', color: 'var(--ink)', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : undefined }}>{right}</div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ARCHITECTURE */}
      <section id="architecture" className="sec">
        <div className="wrap">
          <Reveal style={{ textAlign: 'center' }}>
            <h2 className="sec-headline" style={{ maxWidth: 700, margin: '0 auto 24px' }}>Architecture Overview</h2>
            <p className="sec-sub" style={{ margin: '0 auto' }}>Bagaimana NaviKarier memproses data skill kamu menjadi insight yang actionable.</p>
          </Reveal>
          <Reveal style={{ marginTop: 64, maxWidth: 900, marginLeft: 'auto', marginRight: 'auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
              <div style={{ width: '100%', maxWidth: 600, border: '1px solid var(--border-2)', padding: '18px 24px', textAlign: 'center' }}>
                <span style={{ color: 'var(--highlight)', fontSize: '0.95rem' }}>Input: CV Upload / Manual Entry</span>
              </div>
              <div style={{ width: 1, height: 32, borderLeft: '2px dashed var(--highlight)' }}></div>
              <div style={{ width: '100%', maxWidth: 600, border: '1px solid var(--border)', background: 'var(--bg-card)', padding: '18px 24px', textAlign: 'center' }}>
                <span style={{ fontSize: '0.92rem' }}>Skill Extraction &amp; Parsing</span>
              </div>
              <div style={{ width: 1, height: 32, borderLeft: '2px dashed var(--highlight)' }}></div>
              <div style={{ width: '100%', maxWidth: 600, border: '1px solid var(--border)', background: 'var(--bg-card)', padding: '18px 24px', textAlign: 'center' }}>
                <span style={{ fontSize: '0.92rem' }}>Industry Taxonomy + Bobot Skill + Threshold</span>
              </div>
              <div style={{ display: 'flex', width: '100%', maxWidth: 800, marginTop: 32, gap: 0 }}>
                {[
                  { title: 'Gap Calculation', sub: 'Per-skill gap vs threshold' },
                  { title: 'Readiness Scoring', sub: 'Weighted industry readiness' },
                  { title: 'Priority Engine', sub: 'Skill impact ranking' },
                ].map((item, i, arr) => (
                  <div key={i} style={{ display: 'contents' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ width: 1, height: 24, borderLeft: '2px dashed var(--highlight)' }}></div>
                      <div style={{ border: '1px solid var(--border)', background: 'var(--bg-card)', padding: '16px 20px', textAlign: 'center', width: '100%' }}>
                        <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{item.title}</div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: '0.65rem', color: 'var(--ink-3)', marginTop: 6 }}>{item.sub}</div>
                      </div>
                    </div>
                    {i < arr.length - 1 && <div style={{ flex: '0 0 1px', background: 'var(--border)', margin: '48px 0' }}></div>}
                  </div>
                ))}
              </div>
              <div style={{ width: 1, height: 32, borderLeft: '2px dashed var(--highlight)' }}></div>
              <div style={{ width: '100%', maxWidth: 800, border: '1px solid var(--highlight)', background: 'rgba(225,29,72,0.08)', padding: '18px 24px', textAlign: 'center' }}>
                <span style={{ color: 'var(--highlight)', fontWeight: 600, fontSize: '0.95rem' }}>Output: Actionable Skill Roadmap</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, width: '100%', maxWidth: 800, marginTop: 16 }}>
                {['Gap Report', 'Score Card', 'Priority List', 'Progress Track'].map((label) => (
                  <div key={label} style={{ border: '1px solid var(--border)', background: 'var(--bg-card)', padding: 12, textAlign: 'center', fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--ink-3)', letterSpacing: '0.06em' }}>{label}</div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA BOTTOM */}
      <section className="cta-bottom" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="cta-glow"></div>
        <div className="wrap" style={{ position: 'relative', zIndex: 1 }}>
          <Reveal>
            <h2 className="sec-headline" style={{ margin: '0 auto 24px', textAlign: 'center', maxWidth: 700 }}>Siap tahu posisi skill kamu <span className="hl">sebenarnya?</span></h2>
            <p className="sec-sub" style={{ textAlign: 'center', margin: '0 auto 40px' }}>5 menit. Tanpa signup. Langsung lihat gap kamu vs standar industri.</p>
            <div style={{ display: 'flex', gap: 0, justifyContent: 'center' }}>
              <Link href="#demo" className="hero-btn primary">Analisa Sekarang</Link>
              <Link href="/faq" className="hero-btn ghost">Lihat FAQ &rarr;</Link>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginTop: 48 }}>
              <Link href="/contact" style={{ fontSize: '0.88rem', color: 'var(--ink-2)', borderBottom: '1px solid var(--border-2)', paddingBottom: 2, transition: 'color 150ms' }}>Hubungi Kami</Link>
              <Link href="/pricing" style={{ fontSize: '0.88rem', color: 'var(--ink-2)', borderBottom: '1px solid var(--border-2)', paddingBottom: 2, transition: 'color 150ms' }}>Lihat Harga</Link>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
