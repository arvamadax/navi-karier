import Link from 'next/link';
import type { Metadata } from 'next';
import Reveal from '../../components/Reveal';

export const metadata: Metadata = {
  title: 'Blog | NaviKarier',
  description: 'Insight, tutorial, dan data seputar skill gap, karier, dan upskilling di Indonesia.',
};

export default function BlogPage() {
  return (
    <main>
      <section className="page-hero">
        <div className="wrap">
          <Reveal>
            <Link href="/" style={{ display: 'inline-block', fontSize: '0.85rem', color: 'var(--ink-2)', marginBottom: 32 }}>&larr; Kembali ke Beranda</Link>
            <h1>Blog</h1>
            <p>Insight, tutorial, dan data seputar skill gap, karier, dan upskilling di Indonesia.</p>
          </Reveal>
        </div>
      </section>

      <section style={{ padding: '80px 0 120px' }}>
        <div className="wrap" style={{ maxWidth: 600, textAlign: 'center' }}>
          <Reveal>
            <div style={{
              width: 80,
              height: 80,
              margin: '0 auto 32px',
              border: '2px solid var(--border)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
            }}>
              &#9998;
            </div>
            <h2 style={{
              fontSize: 'clamp(1.4rem, 3vw, 2rem)',
              fontWeight: 800,
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
              margin: '0 0 16px',
            }}>
              Sedang dalam pengembangan
            </h2>
            <p style={{
              fontSize: '1rem',
              color: 'var(--ink-2)',
              lineHeight: 1.7,
              margin: '0 0 40px',
            }}>
              Kami sedang menyiapkan artikel berkualitas seputar skill gap analysis, tips karier, dan insight industri Indonesia. Halaman ini akan segera tersedia.
            </p>
            <Link href="/" className="hero-btn primary">Kembali ke Beranda</Link>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
