'use client';

import { useEffect, useRef, useState } from 'react';

const words = ['data.', 'kalkulasi.', 'aksi.', 'karier.'];

export default function HeroRotator() {
  const [idx, setIdx] = useState(0);
  const [fading, setFading] = useState(false);
  const spanRef = useRef<HTMLSpanElement>(null);
  const wrapRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setIdx((i) => (i + 1) % words.length);
        setFading(false);
      }, 250);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (wrapRef.current && spanRef.current) {
      wrapRef.current.style.width = spanRef.current.offsetWidth + 'px';
    }
  }, [idx]);

  return (
    <span
      className="hero-rotator"
      ref={wrapRef}
    >
      <span className="hero-rotator-word">
        <span
          ref={spanRef}
          className="hero-rotator-inner"
          style={{
            opacity: fading ? 0 : 1,
            transform: fading ? 'translateY(12px)' : 'translateY(0)',
          }}
        >
          {words[idx]}
        </span>
      </span>
    </span>
  );
}
