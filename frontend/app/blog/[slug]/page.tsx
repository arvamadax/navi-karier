import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPost, formatDate, posts } from '../data';
import type { Metadata } from 'next';

type Props = { params: { slug: string } };

export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const post = getPost(params.slug);
  if (!post) return { title: 'Not Found — NaviKarier' };
  return {
    title: `${post.title} — NaviKarier Blog`,
    description: post.excerpt,
  };
}

function renderMarkdown(md: string): string {
  return md
    .trim()
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    .replace(/<\/ul>\s*<ul>/g, '')
    .replace(/^(?!<[hup]|<li|<ul)(.*\S.*)$/gm, '<p>$1</p>')
    .replace(/<p><h2>/g, '<h2>')
    .replace(/<\/h2><\/p>/g, '</h2>')
    .replace(/<p><ul>/g, '<ul>')
    .replace(/<\/ul><\/p>/g, '</ul>');
}

export default function BlogPostPage({ params }: Props) {
  const post = getPost(params.slug);
  if (!post) notFound();

  const html = renderMarkdown(post.content);

  return (
    <main>
      <section
        style={{
          padding: '140px 0 60px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="container" style={{ maxWidth: 720 }}>
          <Link
            href="/blog"
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
            &larr; Semua Artikel
          </Link>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              marginBottom: 20,
              fontFamily: 'var(--font-mono)',
              fontSize: '0.72rem',
              color: 'var(--ink-3)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            <span>{post.category}</span>
            <span style={{ opacity: 0.3 }}>|</span>
            <span>{post.readTime}</span>
            <span style={{ opacity: 0.3 }}>|</span>
            <time dateTime={post.date}>{formatDate(post.date)}</time>
          </div>

          <h1
            className="gradient-text"
            style={{
              fontSize: 'clamp(2rem, 5vw, 3rem)',
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              margin: '0 0 16px',
            }}
          >
            {post.title}
          </h1>

          <p
            style={{
              fontSize: '1.05rem',
              color: 'var(--ink-2)',
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            {post.excerpt}
          </p>
        </div>
      </section>

      <section style={{ padding: 'clamp(48px, 8vw, 80px) 0' }}>
        <div className="container" style={{ maxWidth: 720 }}>
          <article
            className="blog-content"
            dangerouslySetInnerHTML={{ __html: html }}
          />

          <div
            style={{
              marginTop: 64,
              paddingTop: 32,
              borderTop: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 16,
            }}
          >
            <span style={{ fontSize: '0.85rem', color: 'var(--ink-3)' }}>
              Ditulis oleh {post.author}
            </span>
            <Link href="/blog" className="btn btn-ghost" style={{ fontSize: '0.85rem' }}>
              &larr; Kembali ke Blog
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
