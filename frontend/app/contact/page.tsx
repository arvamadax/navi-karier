'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import Reveal from '../components/Reveal';

export default function ContactPage() {
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState('');
  const [statusColor, setStatusColor] = useState('var(--green)');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const form = formRef.current;
    if (!form) return;
    const data = new FormData(form);
    const name = (data.get('name') as string)?.trim();
    const email = (data.get('email') as string)?.trim();
    const message = (data.get('message') as string)?.trim();
    if (!name || !email || !message) {
      setStatusColor('var(--red)');
      setStatus('Lengkapi semua field.');
      return;
    }
    setStatusColor('var(--green)');
    setStatus('Terkirim. Kami balas dalam 24 jam.');
    form.reset();
  }

  return (
    <main>
      <section className="page-hero">
        <div className="wrap">
          <Reveal>
            <Link href="/" style={{ display: 'inline-block', fontSize: '0.85rem', color: 'var(--ink-2)', marginBottom: 32 }}>&larr; Kembali ke Beranda</Link>
            <h1>Hubungi Kami</h1>
            <p>Untuk demo enterprise, press, kolaborasi kampus, atau pertanyaan apapun &mdash; kami terbuka.</p>
          </Reveal>
        </div>
      </section>

      <section className="contact-section">
        <div className="wrap">
          <div className="contact-grid">
            <Reveal>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 16px', letterSpacing: '-0.02em' }}>Langsung terhubung.</h3>
              <p style={{ color: 'var(--ink-2)', fontSize: '0.92rem', margin: '0 0 32px', lineHeight: 1.7 }}>Kami biasanya merespon dalam 24 jam di hari kerja.</p>
              <ul className="contact-list">
                <li><span className="label">Email</span><span className="val"><a href="mailto:hello@navikarier.id">hello@navikarier.id</a></span></li>
                <li><span className="label">Instagram</span><span className="val"><a href="https://instagram.com/navikarier" target="_blank" rel="noopener">@navikarier</a></span></li>
                <li><span className="label">Lokasi</span><span className="val">Malang &amp; Surabaya, Indonesia</span></li>
              </ul>
            </Reveal>
            <Reveal>
              <form className="form" ref={formRef} onSubmit={handleSubmit} noValidate>
                <div className="field"><label htmlFor="cf-name">Nama</label><input id="cf-name" name="name" type="text" required autoComplete="name" /></div>
                <div className="field"><label htmlFor="cf-email">Email</label><input id="cf-email" name="email" type="email" required autoComplete="email" /></div>
                <div className="field">
                  <label htmlFor="cf-type">Tipe</label>
                  <select id="cf-type" name="type">
                    <option>General</option>
                    <option>Enterprise</option>
                    <option>Press</option>
                    <option>Kampus</option>
                  </select>
                </div>
                <div className="field"><label htmlFor="cf-msg">Pesan</label><textarea id="cf-msg" name="message" rows={4} required></textarea></div>
                <button type="submit" className="form-submit">Kirim Pesan &rarr;</button>
                <div className="form-status" role="status" aria-live="polite" style={{ color: statusColor }}>{status}</div>
              </form>
            </Reveal>
          </div>
        </div>
      </section>
    </main>
  );
}
