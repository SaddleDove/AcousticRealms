'use client';

import Link from 'next/link';

interface ChapterCardProps {
  href: string;
  poster: string;
  kicker: string;
  title: string;
  subtitle: string;
  desc: string;
  accent: 'cyan' | 'gold';
  tags: string[];
  delay?: number;
}

export function ChapterCard({ href, poster, kicker, title, subtitle, desc, accent, tags, delay = 0 }: ChapterCardProps) {
  const accentColor = accent === 'cyan' ? '#38e1ff' : '#f5c97b';
  return (
    <Link
      href={href}
      className="group relative block overflow-hidden rounded-[28px] border rise-in"
      style={{
        borderColor: 'rgba(255,255,255,0.14)',
        minHeight: 480,
        animationDelay: `${delay}ms`,
        boxShadow: '0 40px 90px -40px rgba(0,0,0,0.8)',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={poster}
        alt={title}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1600ms] ease-out group-hover:scale-[1.06]"
      />
      <div
        className="absolute inset-0 transition-opacity duration-700"
        style={{
          background:
            accent === 'cyan'
              ? 'linear-gradient(185deg, rgba(3,16,28,0.15) 0%, rgba(3,16,28,0.35) 45%, rgba(3,12,22,0.92) 100%)'
              : 'linear-gradient(185deg, rgba(8,20,12,0.15) 0%, rgba(8,20,12,0.35) 45%, rgba(5,16,10,0.92) 100%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100"
        style={{
          background: `radial-gradient(80% 60% at 50% 100%, ${accentColor}22, transparent 70%)`,
        }}
      />

      <div className="relative flex h-full min-h-[480px] flex-col justify-between p-8 md:p-10">
        <div>
          <p className="kicker mb-4" style={{ color: accentColor }}>
            {kicker}
          </p>
          <h2 className="font-display text-4xl font-semibold leading-tight md:text-5xl">
            {title}
          </h2>
          <p className="mt-3 font-grotesk text-sm tracking-[0.15em]" style={{ color: 'rgba(244,247,246,0.75)' }}>
            {subtitle}
          </p>
        </div>

        <div>
          <p className="mb-5 max-w-md text-sm leading-relaxed" style={{ color: 'var(--ink-dim)' }}>
            {desc}
          </p>
          <div className="mb-6 flex flex-wrap gap-2">
            {tags.map((t) => (
              <span
                key={t}
                className="rounded-full border px-3 py-1 text-[11px] font-grotesk tracking-wide"
                style={{ borderColor: 'rgba(255,255,255,0.18)', color: 'rgba(244,247,246,0.75)', background: 'rgba(255,255,255,0.05)' }}
              >
                {t}
              </span>
            ))}
          </div>
          <div
            className="inline-flex items-center gap-2.5 rounded-full border px-5 py-2.5 text-sm transition-all duration-500 group-hover:gap-4"
            style={{
              borderColor: `${accentColor}55`,
              color: accentColor,
              background: 'rgba(0,0,0,0.25)',
              backdropFilter: 'blur(8px)',
            }}
          >
            Enter the soundscape
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}
