import Link from 'next/link';

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
        <span style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: '#E11D48',
          display: 'inline-block',
        }} />
        NaviKarier
      </Link>
      {children}
    </div>
  );
}
