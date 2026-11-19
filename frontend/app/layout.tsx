import type { Metadata } from 'next';
import SessionProvider from './lib/session-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'NaviKarier | Dari tebakan jadi data.',
  description:
    'AI-powered skill gap analyzer untuk job seekers Indonesia. Hitung gap skill Anda vs standar industri dalam 5 menit.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <link rel="preload" href="/fonts/Inter-var-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
