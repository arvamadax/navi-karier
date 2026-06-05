import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="logo">
              <Image src="/assets/logonavi.png" alt="NaviKarier Logo" width={24} height={24} />
              NaviKarier
            </div>
            <p className="tagline">Dari tebakan jadi data.</p>
            <p className="copy">&copy; 2026 NaviKarier. Digdaya &times; Hackathon &mdash; BI &times; OJK.</p>
          </div>
          <div className="footer-col">
            <h5>Produk</h5>
            <ul>
              <li><Link href="/#features">Fitur</Link></li>
              <li><Link href="/#demo">Demo</Link></li>
              <li><Link href="/pricing">Harga</Link></li>
            </ul>
          </div>
          <div className="footer-col">
            <h5>Perusahaan</h5>
            <ul>
              <li><Link href="/#dampak">Dampak</Link></li>
              <li><Link href="/about">Tentang Kami</Link></li>
              <li><Link href="/blog">Blog</Link></li>
              <li><Link href="/contact">Kontak</Link></li>
              <li><Link href="/faq">FAQ</Link></li>
            </ul>
          </div>
          <div className="footer-col">
            <h5>Legal</h5>
            <ul>
              <li><a href="#">Privasi</a></li>
              <li><a href="#">Ketentuan</a></li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
