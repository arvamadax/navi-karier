import Link from 'next/link';
import { posts, formatDate } from './data';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog — NaviKarier',
  description: 'Insight, tutorial, dan data seputar skill gap, karier, dan upskilling di Indonesia.',
};

const categoryColors: Record<string, string> = {
  Insight: 'var(--accent)',
  Tutorial: 'var(--green)',
  Karier: 'var(--amber)',
  Data: 'var(--red)',
};

export default function BlogPage() {
  return (
    <main>
      <section
        style={{
          padding: '140px 0 60px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="container">
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.85rem',
              color: 'var(--ink-2)',
              marginBottom: 32,
              transition: 'color 150ms',
            }}
          >
            &larr; Kembali ke Beranda
          </Link>
          <h1
            className="gradient-text"
            style={{
              fontSize: 'clamp(2.4rem, 6vw, 4rem)',
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
              margin: '0 0 16px',
            }}
          >
            Blog
          </h1>
          <p
            style={{
              fontSize: '1.05rem',
              color: 'var(--ink-2)',
              maxWidth: 500,
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            Insight dan data seputar skill gap, karier, dan upskilling di Indonesia.
          </p>
        </div>
      </section>

      <section style={{ padding: 'clamp(48px, 8vw, 80px) 0' }}>
        <div className="container">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 20,
            }}
          >
            {posts.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} style={{ display: 'block' }}>
                <article
                  className="card"
                  style={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 16,
                      gap: 12,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.68rem',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: categoryColors[post.category] || 'var(--ink-3)',
                        fontWeight: 500,
                      }}
                    >
                      {post.category}
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.68rem',
                        color: 'var(--ink-3)',
                        letterSpacing: '0.06em',
                      }}
                    >
                      {post.readTime}
                    </span>
                  </div>

                  <h2
                    style={{
                      fontSize: '1.15rem',
                      fontWeight: 700,
                      lineHeight: 1.3,
                      margin: '0 0 12px',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {post.title}
                  </h2>

                  <p
                    style={{
                      fontSize: '0.9rem',
                      color: 'var(--ink-2)',
                      lineHeight: 1.6,
                      margin: '0 0 20px',
                      flex: 1,
                    }}
                  >
                    {post.excerpt}
                  </p>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: 16,
                      borderTop: '1px solid var(--border)',
                      fontSize: '0.8rem',
                      color: 'var(--ink-3)',
                    }}
                  >
                    <span>{post.author}</span>
                    <time dateTime={post.date}>{formatDate(post.date)}</time>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
