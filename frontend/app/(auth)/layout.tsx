import Link from 'next/link';
import Image from 'next/image';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <Link
        href="/"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontWeight: 800,
          fontSize: '1.15rem',
          letterSpacing: '-0.03em',
          marginBottom: 48,
        }}
      >
        <Image src="/assets/logonavi.png" alt="NaviKarier Logo" width={24} height={24} />
        NaviKarier
      </Link>
      {children}
    </div>
  );
}
