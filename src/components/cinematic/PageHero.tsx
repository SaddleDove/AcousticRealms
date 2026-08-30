'use client';

import Link from 'next/link';

interface PageHeroProps {
  kicker: string;
  title: string;
  latin: string;
  desc: string;
  accent: 'cyan' | 'gold';
}

export function PageHero({ kicker, title, latin, desc, accent }: PageHeroProps) {
  const accentColor = accent === 'cyan' ? '#38e1ff' : '#f5c97b';
  return (
    <section className="relative px-6 pt-10 md:pt-16">
      <Link
        href="/"
        className="mb-10 inline-flex items-center gap-2 text-xs tracking-widest transition-colors hover:opacity-80"
        style={{ color: 'var(--ink-dim)' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M11 18l-6-6 6-6" />
        </svg>
        Back to Acoustic Realms
      </Link>
      <div className="rise-in mx-auto max-w-6xl">
        <p className="kicker mb-4" style={{ color: accentColor }}>
          {kicker}
        </p>
        <h1 className="font-display text-5xl font-semibold leading-tight md:text-7xl">{title}</h1>
        <p className="mt-4 font-grotesk text-sm tracking-[0.22em] md:text-base" style={{ color: 'rgba(244,247,246,0.6)' }}>
          {latin}
        </p>
        <p className="mt-6 max-w-2xl text-sm leading-loose md:text-base" style={{ color: 'var(--ink-dim)' }}>
          {desc}
        </p>
      </div>
    </section>
  );
}

export function SectionHeading({ kicker, title, accent }: { kicker: string; title: string; accent: 'cyan' | 'gold' }) {
  const accentColor = accent === 'cyan' ? '#38e1ff' : '#f5c97b';
  return (
    <div className="mb-7">
      <p className="kicker mb-2" style={{ color: accentColor }}>
        {kicker}
      </p>
      <h2 className="font-display text-2xl font-semibold md:text-3xl">{title}</h2>
    </div>
  );
}
