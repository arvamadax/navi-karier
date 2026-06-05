'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="nav">
      <div className="nav-inner">
        <Link href="/" className="logo">
          <Image src="/assets/logonavi.png" alt="NaviKarier Logo" width={24} height={24} />
          NaviKarier
        </Link>
        <nav>
          <ul className="nav-links">
            <li><Link href="/#features">Fitur</Link></li>
            <li><Link href="/#demo">Demo</Link></li>
            <li><Link href="/#dampak">Dampak</Link></li>
            <li><Link href="/pricing">Harga</Link></li>
            <li><Link href="/faq">FAQ</Link></li>
            <li><Link href="/about">Tentang Kami</Link></li>
            <li><Link href="/blog">Blog</Link></li>
          </ul>
        </nav>
        <div className="nav-right">
          <Link href="/contact" className="nav-btn">Kontak</Link>
          <Link href="/#demo" className="nav-btn filled">Mulai Gratis</Link>
        </div>
        <button
          className="nav-toggle"
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <span></span>
        </button>
      </div>
      <div className={`nav-drawer${open ? ' open' : ''}`}>
        <Link href="/#features" onClick={() => setOpen(false)}>Fitur</Link>
        <Link href="/#demo" onClick={() => setOpen(false)}>Demo</Link>
        <Link href="/#dampak" onClick={() => setOpen(false)}>Dampak</Link>
        <Link href="/pricing" onClick={() => setOpen(false)}>Harga</Link>
        <Link href="/faq" onClick={() => setOpen(false)}>FAQ</Link>
        <Link href="/about" onClick={() => setOpen(false)}>Tentang Kami</Link>
        <Link href="/blog" onClick={() => setOpen(false)}>Blog</Link>
        <Link href="/contact" onClick={() => setOpen(false)}>Kontak</Link>
      </div>
    </header>
  );
}
