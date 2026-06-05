import type { Metadata } from 'next';
import Link from 'next/link';
import Reveal from '../components/Reveal';

export const metadata: Metadata = { title: 'NaviKarier — Harga' };

export default function PricingPage() {
  return (
    <main className="pricing-hero">
      <div className="wrap">
        <Reveal>
          <h1 className="pricing-headline">Bisa <span className="hl">Mulai kapan saja</span> saat dibutuhkan.</h1>
          <p className="pricing-sub">Mulai gratis untuk mencoba. Upgrade saat dibutuhkan, tanpa fake trial dan batalkan kapan saja.</p>
        </Reveal>

        <Reveal>
          <div className="pricing-grid">
            <article className="price-card">
              <h3 className="price-name">Free</h3>
              <div><span className="price-amount">Rp 0</span><span className="price-per">/ bulan</span></div>
              <ul className="price-list">
                <li>1&times; analisis per bulan</li>
                <li>5 cluster industri</li>
                <li>Learning path dasar</li>
                <li>Community support</li>
              </ul>
              <Link href="/#demo" className="cta-btn">Mulai Gratis</Link>
            </article>

            <article className="price-card featured">
              <span className="price-badge">Populer</span>
              <h3 className="price-name">Pro</h3>
              <div><span className="price-amount">Rp 49k</span><span className="price-per">/ bulan</span></div>
              <ul className="price-list">
                <li>Unlimited analisis</li>
                <li>Semua industri + roles</li>
                <li>Learning path detail</li>
                <li>CV upload &amp; parsing</li>
                <li>Priority support</li>
              </ul>
              <Link href="/contact" className="cta-btn filled">Coba 14 Hari Gratis</Link>
            </article>

            <article className="price-card">
              <h3 className="price-name">Enterprise</h3>
              <div><span className="price-amount">Custom</span></div>
              <ul className="price-list">
                <li>Untuk perusahaan / kampus</li>
                <li>Bulk analisis</li>
                <li>Dashboard admin</li>
                <li>API access</li>
                <li>White-label option</li>
              </ul>
              <Link href="/contact" className="cta-btn">Hubungi Kami</Link>
            </article>
          </div>
        </Reveal>
      </div>
    </main>
  );
}
