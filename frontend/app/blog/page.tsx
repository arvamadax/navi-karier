import Link from 'next/link';
import { posts, formatDate } from './data';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog — NaviKarier',
  description: 'Insight, tutorial, dan data seputar skill gap, karier, dan upskilling di Indonesia.',
};

const categories = [
  { name: 'Insight', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { name: 'Tutorial', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { name: 'Karier', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  { name: 'Data', gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
];

const categoryColors: Record<string, string> = {
  Insight: 'var(--accent)',
  Tutorial: 'var(--green)',
  Karier: 'var(--amber)',
  Data: 'var(--red)',
};

export default function BlogPage() {
  const featuredPosts = posts.slice(0, 3);
  const recentPosts = posts;

  return (
    <main>
      {/* HERO */}
      <section className="blog-hero">
        <div className="blog-hero-bg"></div>
        <div className="wrap" style={{ position: 'relative', zIndex: 1 }}>
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: '0.72rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--highlight)',
              marginBottom: 16,
              textAlign: 'center',
            }}
          >
            Blog
          </div>
          <h1
            style={{
              fontSize: 'clamp(2.4rem, 6vw, 3.8rem)',
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              margin: '0 auto 24px',
              textAlign: 'center',
              maxWidth: 700,
            }}
          >
            Insight seputar skill gap &amp; karier di Indonesia
          </h1>
          <p
            style={{
              fontSize: '1.05rem',
              color: 'var(--ink-2)',
              maxWidth: 550,
              lineHeight: 1.7,
              margin: '0 auto',
              textAlign: 'center',
            }}
          >
            Data, tutorial, dan analisis untuk membantu kamu menutup gap dan membangun karier yang lebih kuat.
          </p>
        </div>
      </section>

      {/* CATEGORIES */}
      <section style={{ padding: '60px 0 0' }}>
        <div className="wrap">
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: '0.68rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--ink-3)',
              marginBottom: 24,
              paddingBottom: 16,
              borderBottom: '1px solid var(--border)',
            }}
          >
            Baca berdasarkan kategori
          </div>
          <div className="blog-categories">
            {categories.map((cat) => {
              const catPosts = posts.filter((p) => p.category === cat.name);
              if (catPosts.length === 0) return null;
              return (
                <Link
                  key={cat.name}
                  href={`#${cat.name.toLowerCase()}`}
                  className="blog-cat-card"
                >
                  <div
                    className="blog-cat-bg"
                    style={{ background: cat.gradient }}
                  ></div>
                  <span className="blog-cat-label">{cat.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* FEATURED */}
      <section style={{ padding: '80px 0 0' }}>
        <div className="wrap">
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: '0.68rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--ink-3)',
              marginBottom: 24,
              paddingBottom: 16,
              borderBottom: '1px solid var(--border)',
            }}
          >
            Artikel Pilihan
          </div>
          <div className="blog-featured-grid">
            {featuredPosts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="blog-featured-card"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                  <span
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: '0.65rem',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: categoryColors[post.category] || 'var(--ink-3)',
                      padding: '4px 10px',
                      border: `1px solid ${categoryColors[post.category] || 'var(--border)'}`,
                    }}
                  >
                    {post.category}
                  </span>
                  <span style={{ width: 24, height: 1, background: 'var(--border-2)' }}></span>
                  <time
                    dateTime={post.date}
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: '0.68rem',
                      color: 'var(--ink-3)',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {formatDate(post.date)}
                  </time>
                </div>
                <h3
                  style={{
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    lineHeight: 1.35,
                    margin: 0,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {post.title}
                </h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* RECENT POSTS */}
      <section style={{ padding: '80px 0 100px' }}>
        <div className="wrap">
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: '0.68rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--ink-3)',
              marginBottom: 24,
              paddingBottom: 16,
              borderBottom: '1px solid var(--border)',
            }}
          >
            Semua Artikel
          </div>

          {/* Featured first post (large) */}
          {recentPosts.length > 0 && (
            <Link
              href={`/blog/${recentPosts[0].slug}`}
              className="blog-hero-post"
            >
              <div className="blog-hero-post-img">
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    background: `linear-gradient(135deg, ${categoryColors[recentPosts[0].category] || 'var(--accent)'}, var(--bg-card))`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: 'clamp(1.2rem, 3vw, 1.8rem)',
                      fontWeight: 800,
                      color: '#fff',
                      opacity: 0.3,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {recentPosts[0].category}
                  </span>
                </div>
              </div>
              <div className="blog-hero-post-content">
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                  <span
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: '0.65rem',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: categoryColors[recentPosts[0].category] || 'var(--ink-3)',
                      padding: '4px 10px',
                      border: `1px solid ${categoryColors[recentPosts[0].category] || 'var(--border)'}`,
                    }}
                  >
                    {recentPosts[0].category}
                  </span>
                  <span style={{ width: 24, height: 1, background: 'var(--border-2)' }}></span>
                  <time
                    dateTime={recentPosts[0].date}
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: '0.68rem',
                      color: 'var(--ink-3)',
                    }}
                  >
                    {formatDate(recentPosts[0].date)}
                  </time>
                </div>
                <h2
                  style={{
                    fontSize: 'clamp(1.4rem, 3vw, 2rem)',
                    fontWeight: 800,
                    lineHeight: 1.2,
                    letterSpacing: '-0.02em',
                    margin: '0 0 16px',
                  }}
                >
                  {recentPosts[0].title}
                </h2>
                <p
                  style={{
                    fontSize: '0.95rem',
                    color: 'var(--ink-2)',
                    lineHeight: 1.7,
                    margin: 0,
                    maxWidth: 500,
                  }}
                >
                  {recentPosts[0].excerpt}
                </p>
              </div>
            </Link>
          )}

          {/* Rest of posts in grid */}
          <div className="blog-posts-grid">
            {recentPosts.slice(1).map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="blog-post-card"
              >
                <div className="blog-post-card-img">
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      background: `linear-gradient(135deg, ${categoryColors[post.category] || 'var(--accent)'}, var(--bg-3))`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        color: '#fff',
                        opacity: 0.25,
                      }}
                    >
                      {post.category}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <span
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: '0.62rem',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: categoryColors[post.category] || 'var(--ink-3)',
                    }}
                  >
                    {post.category}
                  </span>
                  <span style={{ width: 20, height: 1, background: 'var(--border-2)' }}></span>
                  <time
                    dateTime={post.date}
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: '0.62rem',
                      color: 'var(--ink-3)',
                    }}
                  >
                    {formatDate(post.date)}
                  </time>
                </div>
                <h3
                  style={{
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    lineHeight: 1.35,
                    margin: '0 0 10px',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {post.title}
                </h3>
                <p
                  style={{
                    fontSize: '0.85rem',
                    color: 'var(--ink-2)',
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {post.excerpt.length > 100
                    ? post.excerpt.slice(0, 100) + '...'
                    : post.excerpt}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
