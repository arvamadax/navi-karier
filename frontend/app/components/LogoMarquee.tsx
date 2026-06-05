'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';

const logos = [
  { src: '/assets/logo-bi.png', alt: 'Bank Indonesia', h: 70 },
  { src: '/assets/OJK_Logo.png', alt: 'OJK', h: 66 },
  { src: '/assets/logo dicoding.avif', alt: 'Dicoding Academy', h: 66, tag: 'Learning Partner' },
  { src: '/assets/logo aspi.jpg', alt: 'ASPI', h: 62 },
  { src: '/assets/logo-fintech.webp', alt: 'Fintech Indonesia', h: 62 },
  { src: '/assets/logo lppi.png', alt: 'LPPI', h: 62 },
  { src: '/assets/logo apuvindo.svg', alt: 'APUVINDO', h: 62 },
];

function LogoSet({ ariaHidden = false }: { ariaHidden?: boolean }) {
  return (
    <div className="logos-set" aria-hidden={ariaHidden || undefined}>
      {logos.map((l, i) => (
        <span key={i} style={{ display: 'contents' }}>
          <div className={`logo-item${l.tag ? ' logo-with-tag' : ''}`}>
            <Image src={l.src} alt={ariaHidden ? '' : l.alt} height={l.h} width={Math.round(l.h * 2.5)} style={{ width: 'auto', height: l.h }} />
            {l.tag && <span className="logo-tag">{l.tag}</span>}
          </div>
          {i < logos.length - 1 && <span className="logo-divider"></span>}
        </span>
      ))}
    </div>
  );
}

export default function LogoMarquee() {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let pos = 0;
    const speed = 0.35;
    let raf: number;
    function tick() {
      pos -= speed;
      const half = track!.scrollWidth / 2;
      if (Math.abs(pos) >= half) pos += half;
      track!.style.transform = `translateX(${pos}px)`;
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="logos-bar">
      <div className="logos-label">Didukung oleh</div>
      <div className="logos-track" ref={trackRef}>
        <LogoSet />
        <LogoSet ariaHidden />
      </div>
    </div>
  );
}
