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
            <li><Link href="/faq">FAQ</Link></li>
          </ul>
        </nav>
        <div className="nav-right">
          <Link href="/login" className="nav-btn">Masuk</Link>
          <Link href="/register" className="nav-btn filled">Mulai Gratis</Link>
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
        <Link href="/faq" onClick={() => setOpen(false)}>FAQ</Link>
        <Link href="/login" onClick={() => setOpen(false)}>Masuk</Link>
        <Link href="/register" onClick={() => setOpen(false)}>Mulai Gratis</Link>
      </div>
    </header>
  );
}
